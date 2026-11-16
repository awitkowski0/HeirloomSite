#!/usr/bin/env node
/*
 * Works out which way each product's listing photo faces, and whether it is
 * safe to mirror it, so a grid can turn every row inward like a gallery wall.
 *
 *   node scripts/build-facing.mjs                  rewrite data/photo-facing.json
 *   node scripts/build-facing.mjs --sheet <path>   also write a contact sheet to check by eye
 *
 * Re-run it whenever photos change. It reads each product's default image from
 * public/data/products.json, so run `node scripts/build-data.mjs` first if the
 * catalogue moved. It writes only this one file, which build-data.mjs then
 * folds into products.json as `facing` and `mirrorable`.
 *
 * `facing` is the way the front of the piece points, as seen by the shopper:
 *   left, right, or straight (a head-on view, or one too close to call).
 *
 * From the cut-out: the mask is everything that is not the photo's plain
 * background. See facingFromBands for how the cut-out reads as a direction. A
 * silhouette that matches its own mirror image is a head-on view. Every result
 * was checked on the contact sheet; misreadings go in the overrides file.
 *
 * `mirrorable: false` says the photo must never be flipped, however it faces:
 * one-sided features (a changing tray, a door, a hutch top, a rail that attaches
 * to one side) and fronts that are not symmetric. Those rules are the image
 * lab's mirror-mode rules, kept here so a person can read them. Hand checks go
 * in data/photo-facing-overrides.json, and win over everything computed here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'data', 'photo-facing.json');
const OVERRIDES = join(root, 'data', 'photo-facing-overrides.json');
const WORK_WIDTH = 480;

/** Same deny lists as the image lab's mirror mode (variations/image-lab/data/free_edits.json). */
const DENY_NAME = [
  [/changing table/i, 'changing tray is attached to one side'],
  [/with door/i, 'a door hinges on one side'],
  [/hutch/i, 'hutch top may be one-sided'],
  [/guard rail|rail kit/i, 'rail attaches to one specific side of the crib'],
];
const DENY_CATEGORY = {
  'Guard Rails & Conversions': 'a conversion rail attaches to one specific side of the crib',
  'Changing Tables': 'changing tray is attached to one side',
};

function publicPath(url) {
  return join(root, 'public', decodeURIComponent(url.replace(/^\//, '')));
}

function backgroundOf(pixels, width, height, channels) {
  const sample = (x, y) => {
    const i = (y * width + x) * channels;
    return [pixels[i], pixels[i + 1], pixels[i + 2]];
  };
  const corners = [];
  const d = 6;
  for (const [x, y] of [[d, d], [width - d - 1, d], [d, height - d - 1], [width - d - 1, height - d - 1]]) corners.push(sample(x, y));
  const median = i => corners.map(c => c[i]).sort((a, b) => a - b)[1];
  return [median(0), median(1), median(2)];
}

/** Silhouette of the piece: pixels that differ from the corner background. */
async function maskFor(file) {
  const { data, info } = await sharp(file)
    .resize({ width: WORK_WIDTH })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const bg = backgroundOf(data, width, height, channels);
  const mask = new Uint8Array(width * height);
  const gray = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    const dist = Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]);
    mask[i] = dist > 38 ? 1 : 0;
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { mask, gray, width, height };
}

function bbox(mask, width, height) {
  let x0 = width, x1 = 0, y0 = height, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x0 > x1 ? null : { x0, x1, y0, y1 };
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** The silhouette overlap and luma correlation the image lab's rule reads. */
function symmetry(mask, gray, width, box) {
  const { x0, x1, y0, y1 } = box;
  const w = x1 - x0 + 1;
  let both = 0, either = 0;
  const a = [], b = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * width + x0 + x;
      const j = y * width + x1 - x;
      if (mask[i] && mask[j]) { both++; a.push(gray[i]); b.push(gray[j]); }
      if (mask[i] || mask[j]) either++;
    }
  }
  const iou = either ? both / either : 0;
  const ma = mean(a), mb = mean(b);
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i++) {
    cov += (a[i] - ma) * (b[i] - mb);
    va += (a[i] - ma) ** 2;
    vb += (b[i] - mb) ** 2;
  }
  const corr = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
  return { iou, corr };
}

/**
 * Which way a three-quarter view points.
 *
 * The back of a piece sits higher in the frame than its front, and turns the
 * opposite way to it: when the side panel shows on the left, the top band of
 * the silhouette (the back rail, or the far edge of a top) shifts left of the
 * bottom band. So a top band left of the bottom band means the front points
 * right, and vice versa. A silhouette centred on itself is too close to call.
 */
function facingFromBands(mask, width, box) {
  const { x0, x1, y0, y1 } = box;
  const h = y1 - y0 + 1;
  const centre = (from, to) => {
    let sum = 0, n = 0;
    for (let y = from; y <= to; y++) {
      for (let x = x0; x <= x1; x++) if (mask[y * width + x]) { sum += x; n++; }
    }
    return n ? sum / n : (x0 + x1) / 2;
  };
  const top = centre(y0, y0 + Math.round(h * 0.3));
  const bottom = centre(y0 + Math.round(h * 0.55), y1);
  const shift = (top - bottom) / Math.max(1, x1 - x0);
  if (Math.abs(shift) < 0.012) return { facing: 'straight', edgeRatio: shift };
  return { facing: shift < 0 ? 'right' : 'left', edgeRatio: shift };
}

function denyReason(product, sym) {
  for (const [re, reason] of DENY_NAME) if (re.test(product.productName)) return reason;
  if (DENY_CATEGORY[product.category]) return DENY_CATEGORY[product.category];
  if (sym.iou >= 0.92 && sym.corr < 0.55) return `front view is not symmetric (luma correlation ${sym.corr.toFixed(2)})`;
  return null;
}

async function analyse(product) {
  const file = publicPath(product.defaultImage);
  if (!existsSync(file)) return { facing: 'straight', mirrorable: false, reason: 'photo file not found', computed: false };
  const { mask, gray, width, height } = await maskFor(file);
  const box = bbox(mask, width, height);
  if (!box) return { facing: 'straight', mirrorable: false, reason: 'no cut-out', computed: false };
  const sym = symmetry(mask, gray, width, box);
  const profile = facingFromBands(mask, width, box);
  const facing = sym.iou >= 0.9 ? 'straight' : profile.facing;
  const reason = denyReason(product, sym);
  return {
    facing,
    mirrorable: reason === null && facing !== 'straight',
    reason,
    computed: true,
    iou: Number(sym.iou.toFixed(3)),
    edgeRatio: Number(profile.edgeRatio.toFixed(3)),
  };
}

async function contactSheet(rows, path) {
  const cell = 200, pad = 6, label = 40;
  const cols = 8;
  const lines = Math.ceil(rows.length / cols);
  const composites = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const x = (i % cols) * (cell + pad) + pad;
    const y = Math.floor(i / cols) * (cell + label + pad) + pad;
    const file = publicPath(r.product.defaultImage);
    if (!existsSync(file)) continue;
    const thumb = await sharp(file).resize(cell, cell, { fit: 'contain', background: '#ffffff' }).jpeg().toBuffer();
    composites.push({ input: thumb, left: x, top: y });
    const colour = !r.result.mirrorable ? '#9b3b2e' : r.result.facing === 'straight' ? '#666666' : '#20603a';
    const name = r.product.productName.replace(/&/g, '&amp;').slice(0, 30);
    const svg = `<svg width="${cell}" height="${label}"><text x="2" y="14" font-family="sans-serif" font-size="12" fill="#222">${name}</text><text x="2" y="31" font-family="sans-serif" font-size="13" font-weight="700" fill="${colour}">${r.result.facing}${r.result.mirrorable ? '' : ' (no flip)'}${r.result.override ? ' *' : ''}</text></svg>`;
    composites.push({ input: Buffer.from(svg), left: x, top: y + cell });
  }
  const sheet = sharp({
    create: { width: cols * (cell + pad) + pad, height: lines * (cell + label + pad) + pad, channels: 3, background: '#ffffff' },
  }).composite(composites).jpeg({ quality: 85 });
  mkdirSync(dirname(path), { recursive: true });
  await sheet.toFile(path);
}

async function main() {
  const products = JSON.parse(readFileSync(join(root, 'public', 'data', 'products.json'), 'utf8'));
  const overrides = existsSync(OVERRIDES) ? JSON.parse(readFileSync(OVERRIDES, 'utf8')) : {};
  const out = {};
  const rows = [];
  for (const product of products) {
    if (!product.defaultImage || !product.slug) continue;
    const result = await analyse(product);
    const hand = overrides[product.slug];
    if (hand) {
      if (hand.facing) result.facing = hand.facing;
      if (hand.mirrorable !== undefined) result.mirrorable = hand.mirrorable;
      if (hand.reason) result.reason = hand.reason;
      result.override = true;
    }
    if (result.facing === 'straight') result.mirrorable = false;
    out[product.slug] = result;
    rows.push({ product, result });
  }
  const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');

  const count = pred => rows.filter(r => pred(r.result)).length;
  console.log(
    `photo-facing.json: ${rows.length} products; left ${count(r => r.facing === 'left')}, right ${count(r => r.facing === 'right')}, ` +
      `straight ${count(r => r.facing === 'straight')}; never flipped ${count(r => !r.mirrorable)}`,
  );
  const sheetArg = process.argv.indexOf('--sheet');
  if (sheetArg >= 0) {
    await contactSheet(rows.sort((a, b) => a.product.productName.localeCompare(b.product.productName)), process.argv[sheetArg + 1]);
    console.log(`contact sheet: ${process.argv[sheetArg + 1]}`);
  }
}

await main();
