/*
 * Applies Better Auth's tables, then db/schema.sql. Safe to run repeatedly.
 * Reads DATABASE_URL and the auth settings from .env.local.
 */
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

process.loadEnvFile('.env.local');

const { getMigrations } = await import('better-auth/db/migration');
const { auth } = await import('../src/lib/auth');

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(readFileSync('db/schema.sql', 'utf8'));
const { rows } = await pool.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by 1",
);
console.log('tables:', rows.map(r => r.table_name).join(', '));
await pool.end();
process.exit(0);
