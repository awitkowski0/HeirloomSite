#!/usr/bin/env node
/*
 * A private Postgres for this checkout: its data lives in .data/ (gitignored),
 * it listens only on 127.0.0.1:5544, and it leaves any other Postgres alone.
 *
 *   node scripts/db-local.mjs start | stop | status
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = '5544';
const ROOT = resolve(import.meta.dirname, '..');
const DATA = resolve(ROOT, '.data');
const CLUSTER = resolve(DATA, 'postgres');
const USER = 'heirloom';
const DATABASE = 'heirloom';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

function start() {
  mkdirSync(DATA, { recursive: true });
  if (!existsSync(CLUSTER)) run('initdb', ['-D', CLUSTER, '-U', USER, '--auth=trust', '-E', 'UTF8']);
  if (spawnSync('pg_ctl', ['-D', CLUSTER, 'status'], { stdio: 'ignore' }).status !== 0) {
    run('pg_ctl', ['-D', CLUSTER, '-l', resolve(DATA, 'postgres.log'), '-w', '-o', `-p ${PORT} -c listen_addresses=127.0.0.1 -k ${DATA}`, 'start']);
  }
  const exists = execFileSync('psql', ['-h', '127.0.0.1', '-p', PORT, '-U', USER, '-d', 'postgres', '-Atc', `select 1 from pg_database where datname='${DATABASE}'`]).toString().trim();
  if (exists !== '1') run('createdb', ['-h', '127.0.0.1', '-p', PORT, '-U', USER, DATABASE]);
  console.log(`Postgres ready: postgres://${USER}@127.0.0.1:${PORT}/${DATABASE}`);
}

const command = process.argv[2];
if (command === 'start') start();
else if (command === 'stop') run('pg_ctl', ['-D', CLUSTER, '-m', 'fast', 'stop']);
else if (command === 'status') run('pg_ctl', ['-D', CLUSTER, 'status']);
else {
  console.error('Usage: db-local.mjs start | stop | status');
  process.exit(1);
}
