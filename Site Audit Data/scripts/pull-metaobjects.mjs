#!/usr/bin/env node
/**
 * Pull metaobject definitions and entries out of Shopify.
 *
 *   shopify store auth --store 60xgy4-ut      # once, interactive
 *   node "Site Audit Data/scripts/pull-metaobjects.mjs"
 *
 * Why this exists: the delivery tiers are metaobjects, and the existing pull
 * (pull-shopify.ps1) fetches products only - there is not one metaobject
 * anywhere in raw/shopify/catalog.json. Rate code cannot be written against a
 * shape nobody has looked at, so this fetches the definitions first and then
 * every entry of every type.
 *
 * A .mjs rather than a second .ps1: the repo now lives on a Mac, and this is
 * the same `shopify store execute` call the PowerShell version makes.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const AUDIT = dirname(HERE);
const QUERIES = join(AUDIT, 'queries');
const OUT_DIR = join(AUDIT, 'raw', 'shopify');
const STORE = process.env.SHOPIFY_CLI_STORE || '60xgy4-ut';

mkdirSync(OUT_DIR, { recursive: true });

function execute(queryFile, variables) {
  const outPath = join(OUT_DIR, `.tmp-${Date.now()}.json`);
  const args = [
    'store', 'execute',
    '--store', STORE,
    '--query-file', join(QUERIES, queryFile),
    '--json',
    '--output-file', outPath,
  ];
  let varsPath;
  if (variables) {
    varsPath = join(OUT_DIR, `.vars-${Date.now()}.json`);
    writeFileSync(varsPath, JSON.stringify(variables));
    args.push('--variable-file', varsPath);
  }
  try {
    execFileSync('shopify', args, { stdio: ['ignore', 'inherit', 'inherit'] });
    // BOM-tolerant: the CLI has written one before.
    return JSON.parse(readFileSync(outPath, 'utf-8').replace(/^﻿/, ''));
  } finally {
    for (const f of [outPath, varsPath]) {
      try { if (f) unlinkSync(f); } catch { /* already gone */ }
    }
  }
}

console.log(`Pulling metaobject definitions from ${STORE}…`);
const defsRes = execute('metaobject-definitions.graphql');
const defs = defsRes?.data?.metaobjectDefinitions?.nodes ?? [];

if (defs.length === 0) {
  console.error('\nNo metaobject definitions returned. Either the store has none, or the');
  console.error('app you authenticated lacks read_metaobject_definitions / read_metaobjects.');
  process.exit(1);
}

console.log(`\n${defs.length} definition(s):`);
for (const d of defs) {
  const fields = d.fieldDefinitions.map(f => `${f.key}:${f.type.name}`).join(', ');
  console.log(`  ${d.type}  (${d.metaobjectsCount} entries)  [${fields}]`);
}

// Every entry of every type. There are few enough of these that filtering to
// "the delivery one" by name guessing would only risk missing it.
const entries = {};
for (const def of defs) {
  const nodes = [];
  let cursor = null;
  do {
    const res = execute('metaobjects-by-type.graphql', { type: def.type, cursor });
    const page = res?.data?.metaobjects;
    if (!page) break;
    nodes.push(...page.nodes);
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  entries[def.type] = nodes;
  console.log(`  pulled ${nodes.length} entr${nodes.length === 1 ? 'y' : 'ies'} of ${def.type}`);
}

const outFile = join(OUT_DIR, 'metaobjects.json');
writeFileSync(
  outFile,
  JSON.stringify({ pulledAt: new Date().toISOString(), store: STORE, definitions: defs, entries }, null, 2)
);
console.log(`\nWrote ${outFile}`);
