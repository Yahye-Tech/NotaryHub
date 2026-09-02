// ─── File Storage Adapter ───────────────────────────────────────────────────
// Local disk storage works fine for a single, persistent server, but most
// production hosting platforms (Render, Railway, Heroku, Cloud Run, most
// container platforms) have an EPHEMERAL filesystem — every redeploy or
// restart wipes it, and running more than one instance means uploads are
// only visible to whichever instance happened to handle that request.
// For a notary platform, losing an uploaded ID or notarized document isn't
// just an inconvenience, so this is real storage, not a demo abstraction.
//
// Selection is config-driven, same honest-fallback pattern as email.service.ts:
// - STORAGE_S3_BUCKET set → S3-compatible storage (works with AWS S3,
//   Cloudflare R2, DigitalOcean Spaces, MinIO, or anything implementing the
//   S3 API — set STORAGE_S3_ENDPOINT for non-AWS providers).
// - Otherwise → local disk, unchanged from before (fine for local dev).
//
// IMPORTANT — sandbox limitation, documented rather than hidden: this
// environment's network egress is locked to an npm/pypi/github allowlist and
// cannot reach any S3-compatible endpoint. The S3 adapter below is real code
// against the real AWS SDK, and its selection/validation logic is tested,
// but an actual read/write round-trip against a live bucket has not been
// exercised from this sandbox. Verify it against real credentials in an
// environment with normal network access before relying on it in production.

import fs from "fs/promises";
import path from "path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import type { Response } from "express";

export interface StorageAdapter {
  /** Human-readable name for logging, e.g. "local disk" or "S3 (bucket-name)". */
  readonly name: string;
  write(storagePath: string, buffer: Buffer): Promise<void>;
  /** Reads the full file into memory. Used for small files (uploads are capped at 10MB). */
  read(storagePath: string): Promise<Buffer>;
  delete(storagePath: string): Promise<void>;
  /** Streams the file directly to an HTTP response (download endpoint). */
  sendToResponse(storagePath: string, res: Response): Promise<void>;
  /** Cheap existence/connectivity check, used at boot to fail loudly rather than on first upload. */
  verify(): Promise<void>;
}

// ── Local disk (dev default, and a valid choice for a single persistent server) ──

class LocalDiskAdapter implements StorageAdapter {
  readonly name = "local disk";
  private root: string;

  constructor(root: string) {
    this.root = root;
  }

  private resolve(storagePath: string): string {
    const absolute = path.resolve(this.root, storagePath);
    const root = path.resolve(this.root);
    if (!absolute.startsWith(root)) {
      throw new Error("INVALID_STORAGE_PATH");
    }
    return absolute;
  }

  async write(storagePath: string, buffer: Buffer): Promise<void> {
    const absolute = this.resolve(storagePath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, buffer);
  }

  async read(storagePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(storagePath));
  }

  async delete(storagePath: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(storagePath));
    } catch {
      // Already missing — fine, deletion is idempotent from the caller's perspective.
    }
  }

  async sendToResponse(storagePath: string, res: Response): Promise<void> {
    const absolute = this.resolve(storagePath);
    await fs.access(absolute);
    await new Promise<void>((resolve, reject) => {
      res.sendFile(absolute, (err) => (err ? reject(err) : resolve()));
    });
  }

  async verify(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
    // Round-trip a tiny probe file to confirm the process can actually write here.
    const probe = path.join(this.root, ".storage-probe");
    await fs.writeFile(probe, "ok");
    await fs.unlink(probe);
  }
}

// ── S3-compatible (production default once STORAGE_S3_BUCKET is set) ──

class S3StorageAdapter implements StorageAdapter {
  readonly name: string;
  private client: S3Client;
  private bucket: string;

  constructor(bucket: string, region: string, endpoint: string | undefined, accessKeyId: string, secretAccessKey: string, forcePathStyle: boolean) {
    this.bucket = bucket;
    this.name = `S3 (${bucket})`;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle, // required for MinIO/most non-AWS S3-compatible providers
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async write(storagePath: string, buffer: Buffer): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
      Body: buffer,
    }));
  }

  async read(storagePath: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }));
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async delete(storagePath: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storagePath }));
  }

  async sendToResponse(storagePath: string, res: Response): Promise<void> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: storagePath }));
    if (!result.Body) throw new Error("FILE_MISSING");
    await new Promise<void>((resolve, reject) => {
      const stream = result.Body as NodeJS.ReadableStream;
      stream.on("error", reject);
      res.on("finish", resolve);
      res.on("error", reject);
      stream.pipe(res);
    });
  }

  async verify(): Promise<void> {
    // Confirms the bucket exists and credentials are valid without writing anything.
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }
}

// ── Selection ──

let adapter: StorageAdapter | null = null;

function buildAdapter(): StorageAdapter {
  const bucket = process.env.STORAGE_S3_BUCKET;
  if (bucket) {
    const region = process.env.STORAGE_S3_REGION || "us-east-1";
    const endpoint = process.env.STORAGE_S3_ENDPOINT || undefined;
    const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
    const forcePathStyle = process.env.STORAGE_S3_FORCE_PATH_STYLE === "true";
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "STORAGE_S3_BUCKET is set but STORAGE_S3_ACCESS_KEY_ID / STORAGE_S3_SECRET_ACCESS_KEY are missing"
      );
    }
    return new S3StorageAdapter(bucket, region, endpoint, accessKeyId, secretAccessKey, forcePathStyle);
  }
  const root = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
  return new LocalDiskAdapter(root);
}

export function getStorageAdapter(): StorageAdapter {
  if (!adapter) adapter = buildAdapter();
  return adapter;
}

// Called at server boot so a broken bucket/credential config fails loudly at
// startup instead of on a customer's first upload.
export async function verifyStorageAdapter(): Promise<void> {
  const a = getStorageAdapter();
  await a.verify();
  console.log(`[Storage] Using ${a.name}.`);
}
