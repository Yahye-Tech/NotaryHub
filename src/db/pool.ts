import { Pool, PoolClient } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                // max connections in pool
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

/**
 * Run a single query. Acquires and releases a connection automatically.
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  const result = await pool.query(text, params);
  if (process.env.NODE_ENV === "development") {
    const duration = Date.now() - start;
    if (duration > 200) {
      console.warn(`[DB] Slow query (${duration}ms): ${text.substring(0, 80)}`);
    }
  }
  return { rows: result.rows, rowCount: result.rowCount };
}

/**
 * Run multiple queries in a transaction.
 * Rolls back automatically on any error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
