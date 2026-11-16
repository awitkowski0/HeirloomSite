#!/usr/bin/env node
/*
 * Brings owner-approved AI room photographs into the site.
 *
 *   node scripts/import-room-images.mjs [--from <approved-folder>]
 *
 * Reads <approved-folder>/manifest.jsonl (the image lab's promotion record) and
 * imports only rows that are ROOM images, owner-approved, real and not failed.
 * Copies each 1600px web file to public/data/rooms/<slug>/ and writes
 * src/data/room-images.json (product slug -> [{src, width, height, alt}]).
 *
 * Re-run it whenever more images are promoted: the manifest is the record, so a
 * newly approved image is added and one the owner withdraws is removed again.
 * Run it after `node scripts/build-data.mjs` has produced products.json, and run
 * build-data again afterwards so listings pick up their hover image.
 *
 * These images never reach Google: they are not in inventory.json, so the
 * Merchant feed, Product JSON-LD and og:image cannot see them.
 * tests/room-images-exclusion.test.ts holds that line.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'public', 'data', 'rooms');
const OUT_JSON = join(root, 'src', 'data', 'room-images.json');
const DEFAULT_FROM =
  '/private/tmp/claude-501/-Users-alexw-IdeaProjects-HeirloomSite/6b534c32-8599-4c6d-adc5-aac56791d763/scratchpad/variations/image-lab/approved';

const fromArg = process.argv.indexOf('--from');
const FROM = fromArg >= 0 ? process.argv[fromArg + 1] : DEFAULT_FROM;

/** Only a real room shot the owner approved and QA did not fail. */
function importable(row) {
  if (row.mode !== 'edit-room') return false;
  if (row.mock || row.experimental) return false;
  if (row.reviewer_decision?.decision !== 'approved') return false;
  const qa = row.qa ?? {};
  if (qa.status === 'fail' || (qa.fail_reasons ?? []).length > 0) return false;
  return true;
}

function webFile(row) {
  return (row.files ?? []).find(f => /-1600\.jpe?g$/i.test(f));
}

const LOOKS = {
  'linen-morning': 'in a bright nursery with linen curtains',
};

function altText(row, category) {
  const name = row.product;
  const piece = category === 'Cribs' && !/crib/i.test(name) ? `${name} crib` : name;
  return `${piece} ${LOOKS[row.look] ?? 'in a nursery'}`;
}

async function main() {
  const manifest = join(FROM, 'manifest.jsonl');
  if (!existsSync(manifest)) throw new Error(`No approved manifest at ${manifest}`);
  const products = JSON.parse(readFileSync(join(root, 'public', 'data', 'products.json'), 'utf8'));
  const categoryOf = new Map(products.map(p => [p.slug, p.category]));
  const liveSlugs = new Set(products.map(p => p.slug));

  const rows = readFileSync(manifest, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l));

  const out = {};
  let skipped = 0;
  for (const row of rows) {
    const file = webFile(row);
    if (!importable(row) || !file || !liveSlugs.has(row.slug) || !existsSync(join(FROM, file))) {
      skipped += 1;
      continue;
    }
    const dest = join(OUT_DIR, row.slug, basename(file));
    mkdirSync(dirname(dest), { recursive: true });
    if (!existsSync(dest)) copyFileSync(join(FROM, file), dest);
    const { width, height } = await sharp(dest).metadata();
    (out[row.slug] ??= []).push({
      src: `/data/rooms/${encodeURIComponent(row.slug)}/${basename(file)}`,
      width,
      height,
      alt: altText(row, categoryOf.get(row.slug)),
    });
  }

  // Anything no longer approved comes off the site again.
  const keep = new Set(Object.values(out).flat().map(i => i.src.split('/').pop()));
  if (existsSync(OUT_DIR)) {
    for (const slug of readdirSync(OUT_DIR)) {
      for (const name of readdirSync(join(OUT_DIR, slug))) {
        if (!keep.has(name)) rmSync(join(OUT_DIR, slug, name));
      }
      if (readdirSync(join(OUT_DIR, slug)).length === 0) rmSync(join(OUT_DIR, slug), { recursive: true });
    }
  }

  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT_JSON, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`room-images.json: ${Object.keys(sorted).length} products, ${Object.values(sorted).flat().length} images; ${skipped} manifest rows not imported`);
}

await main();
