/*
 * Owner-side aggregate of merged interest. Counts only, never a shopper.
 *
 * Groups smaller than the threshold are dropped. Covers visitors who chose to
 * keep their taste on an account, not everyone: on-device events never reach
 * the database. Local only for now, like accounts themselves.
 */
import { Pool } from 'pg';
import { aggregateInterestCounts } from '../src/lib/interest/db';

process.loadEnvFile('.env.local');

const minAccounts = Math.max(5, Number(process.argv[2]) || 5);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const rows = await aggregateInterestCounts(pool, minAccounts);
console.log(`Groups of at least ${minAccounts} accounts:`);
for (const row of rows) console.log(`${row.slug.padEnd(40)} ${row.kind.padEnd(16)} ${row.accounts} accounts, ${row.events} events`);
if (rows.length === 0) console.log('(none yet)');
await pool.end();
