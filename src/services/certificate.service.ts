import PDFDocument from "pdfkit";
import { query } from "../db/pool.js";
import type { DocumentRecord } from "./document.service.js";

interface CertificateContext {
  document: DocumentRecord;
  tenantName: string;
  tenantLicenseNumber: string | null;
  customerName: string;
  notaryName: string | null;
}

// Expects a DocumentRecord fetched via getDocumentById(), which already
// joins customer_name and processed_by_name — avoids a redundant round-trip
// for data the caller almost certainly already has.
async function getContext(document: DocumentRecord, tenantId: string): Promise<CertificateContext> {
  const { rows: tenantRows } = await query<{ name: string; license_number: string | null }>(
    `SELECT name, license_number FROM tenants WHERE id = $1`,
    [tenantId]
  );

  return {
    document,
    tenantName: tenantRows[0]?.name ?? "NotaryHub",
    tenantLicenseNumber: tenantRows[0]?.license_number ?? null,
    customerName: document.customer_name ?? "Unknown Customer",
    notaryName: document.processed_by_name ?? null,
  };
}

// ─── Generate a notarized-certificate PDF for a document ───────────────────
// Only called once a document has actually transitioned to 'notarised' —
// the seal_code, notarised_at, and issued_at fields it renders are only
// populated at that point (see transitionDocumentStatus). Returns raw PDF
// bytes; the caller is responsible for persisting them via the file_uploads
// system, same as any other stored file in this app.
export async function generateNotaryCertificate(
  document: DocumentRecord,
  tenantId: string
): Promise<Buffer> {
  if (document.status !== "notarised" || !document.seal_code) {
    throw new Error("DOCUMENT_NOT_NOTARISED");
  }

  const ctx = await getContext(document, tenantId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // ── Header ──────────────────────────────────────────────────────────
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text(ctx.tenantName, { align: "center" });

    if (ctx.tenantLicenseNumber) {
      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#64748b")
        .text(`Notary License No. ${ctx.tenantLicenseNumber}`, { align: "center" });
    }

    doc.moveDown(1.2);
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text("CERTIFICATE OF NOTARIZATION", { align: "center" });

    doc.moveDown(0.3);
    doc
      .strokeColor("#0f172a")
      .lineWidth(1.2)
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .stroke();

    doc.moveDown(1);

    // ── Document identity block ────────────────────────────────────────
    const field = (label: string, value: string) => {
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#475569")
        .text(label, { continued: true })
        .font("Helvetica")
        .fillColor("#0f172a")
        .text(` ${value}`);
      doc.moveDown(0.35);
    };

    field("Document Number:", document.document_number);
    field("Title:", document.title);
    field("Type:", document.doc_type.replace(/_/g, " "));
    field("Notarized For:", ctx.customerName);
    field(
      "Notarized On:",
      document.notarised_at ? new Date(document.notarised_at).toLocaleString() : "—"
    );
    if (ctx.notaryName) {
      field("Notarizing Officer:", ctx.notaryName);
    }
    if (document.jurisdiction) {
      field("Jurisdiction:", document.jurisdiction);
    }

    doc.moveDown(0.6);

    // ── Body content ────────────────────────────────────────────────────
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor("#475569")
      .text("DOCUMENT CONTENT");
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#1e293b")
      .text(document.content?.trim() || document.summary || "No content on file.", {
        align: "left",
        lineGap: 3,
      });

    doc.moveDown(1.5);

    // ── Seal ─────────────────────────────────────────────────────────────
    const sealY = doc.y;
    doc
      .roundedRect(doc.page.margins.left, sealY, pageWidth, 70, 6)
      .strokeColor("#059669")
      .lineWidth(1.5)
      .stroke();

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#059669")
      .text("OFFICIAL NOTARY SEAL", doc.page.margins.left + 14, sealY + 12);

    doc
      .fontSize(13)
      .font("Courier-Bold")
      .fillColor("#0f172a")
      .text(document.seal_code!, doc.page.margins.left + 14, sealY + 30);

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(
        "This certificate is cryptographically sealed and tied to a unique sequential document number. " +
          "Its authenticity can be verified against the issuing notary office's records using the seal code above.",
        doc.page.margins.left + 14,
        sealY + 48,
        { width: pageWidth - 28 }
      );

    // ── Footer ──────────────────────────────────────────────────────────
    doc
      .fontSize(7)
      .font("Helvetica")
      .fillColor("#94a3b8")
      .text(
        `Generated by ${ctx.tenantName} via NotaryHub · Document ID ${document.id}`,
        doc.page.margins.left,
        doc.page.height - doc.page.margins.bottom - 20,
        { width: pageWidth, align: "center" }
      );

    doc.end();
  });
}
