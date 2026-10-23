// Postgres for Tona Deploy. The platform injects DATABASE_URL when the app has a database
// (`tona db add pictotalk`). Without it the server runs fine, and board sharing (/api/) is turned off.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import pg from 'pg';

/** Returns a pool for DATABASE_URL, or null when the app has no database. */
export function connect(url = process.env.DATABASE_URL) {
  if (!url) return null;
  const u = new URL(url);
  const mode = u.searchParams.get('sslmode') ?? 'disable';
  u.searchParams.delete('sslmode');
  // Same meaning as libpq: "require" encrypts without checking the certificate (what Tona sets
  // for RDS inside the VPC); "verify-ca"/"verify-full" also check it.
  const ssl = mode === 'disable' ? false
    : mode.startsWith('verify') ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };
  const pool = new pg.Pool({ connectionString: u.toString(), ssl, max: 5, connectionTimeoutMillis: 5000 });
  pool.on('error', (err) => console.error('postgres:', err.message));
  return pool;
}

/**
 * Applies server/migrations/*.sql in name order, each in its own transaction, once.
 * An advisory lock keeps two tasks from migrating at the same time during a rolling deploy.
 */
export async function migrate(pool, dir) {
  const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('pictotalk:migrations'))");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name));
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${file} failed: ${err.message}`);
      }
      console.log(`migrated ${file}`);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('pictotalk:migrations'))").catch(() => {});
    client.release();
  }
}
