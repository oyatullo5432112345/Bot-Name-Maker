import pg from "pg";

const { Pool } = pg;

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: process.env["DATABASE_URL"],
  ssl: process.env["NODE_ENV"] === "production" ? { rejectUnauthorized: false } : false,
});

export type QueryResult<T = Record<string, unknown>> = T[];

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const result = await pool.query(text, params);
  return result.rows as QueryResult<T>;
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await pool.query(text, params);
  return (result.rows[0] as T) ?? null;
}

export async function queryCount(text: string, params?: unknown[]): Promise<number> {
  const result = await pool.query(text, params);
  const row = result.rows[0] as { count?: string } | undefined;
  return parseInt(row?.count ?? "0", 10);
}
