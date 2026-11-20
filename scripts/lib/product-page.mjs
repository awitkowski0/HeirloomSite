/*
 * How a product's photographs become its page.
 *
 * Shared by scripts/build-data.mjs (which emits what the site renders) and
 * scripts/product.mjs (the setup CLI), so the tool that edits a page and the
 * build that ships it can never disagree about which photo comes first.
 *
 * Three inputs, all in the product's own directory:
 *
 *   media.json            { "<variant>||<stain>": ["a.jpg", "b.jpg"] }
 *                         Photos of ONE finish. The first is that finish's
 *                         swatch/preview photo; the rest follow it in the
 *                         carousel when that finish is selected.
 *
 *   product.json "page"   { "hero": "x.jpg", "gallery": ["detail.jpg"] }
 *     hero                The product's lead photo: first slide on the page as
 *                         it loads, the card image in grids, search and related
 *                         products, and the share/OG image. Implemented as the
 *                         default finish's first photo, so every consumer of
 *                         that follows it without knowing `page` exists.
 *     gallery             Photos that are not of one finish - details, joinery,
 *                         a room shot - appended to EVERY finish's carousel.
 *
 * Every filename is relative to the product directory and must exist there.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";

export const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;
export const PAGE_KEYS = new Set(["hero", "gallery"]);

export function mediaKey(variant, stain) {
  return `${variant}||${stain}`;
}

/** The finish a visitor lands on: the first variant's first stain. */
export function defaultMediaKey(variants) {
  const v = variants[0];
  const stain = v?.stains?.[0];
  return stain ? mediaKey(v.variant, stain) : null;
}

/**
 * Validate `page` and every media reference. Returns human-readable problems;
 * an empty array means the directory is consistent.
 */
export function checkPageMedia(dir, label, meta, media) {
  const problems = [];
  const exists = file => typeof file === "string" && existsSync(join(dir, file));

  for (const [key, files] of Object.entries(media || {})) {
    if (!Array.isArray(files)) {
      problems.push(`${label}/media.json: "${key}" must be a list of filenames`);
      continue;
    }
    for (const f of files) {
      if (!exists(f)) problems.push(`${label}/media.json: "${key}" names ${f}, which is not in the directory`);
    }
  }

  // Keys for hidden variants are legitimate (their photos are kept, not
  // shown), so only the shape is checked here. `product check` reports keys
  // that match no finish as a warning.
  for (const key of Object.keys(media || {})) {
    if (!key.includes("||")) {
      problems.push(`${label}/media.json: key "${key}" is not "<variant>||<stain>"`);
    }
  }

  const page = meta.page;
  if (page === undefined || page === null) return problems;
  if (typeof page !== "object" || Array.isArray(page)) {
    problems.push(`${label}/product.json: "page" must be an object like { "hero": "x.jpg", "gallery": [] }`);
    return problems;
  }
  for (const k of Object.keys(page)) {
    if (!PAGE_KEYS.has(k)) {
      problems.push(`${label}/product.json: page.${k} is not a known setting (expected: ${[...PAGE_KEYS].join(", ")})`);
    }
  }
  if (page.hero !== undefined) {
    if (!exists(page.hero)) problems.push(`${label}/product.json: page.hero names ${page.hero}, which is not in the directory`);
    else if (!IMAGE_EXT.test(page.hero)) problems.push(`${label}/product.json: page.hero ${page.hero} is not an image`);
  }
  if (page.gallery !== undefined) {
    if (!Array.isArray(page.gallery)) {
      problems.push(`${label}/product.json: page.gallery must be a list of filenames`);
    } else {
      for (const f of page.gallery) {
        if (!exists(f)) problems.push(`${label}/product.json: page.gallery names ${f}, which is not in the directory`);
      }
    }
  }
  return problems;
}

/**
 * The ordered photo list for one finish, as the page shows it.
 * `isDefault` is true for the finish a visitor lands on.
 */
export function photosFor(meta, media, key, isDefault) {
  const page = meta.page || {};
  let list = [...((key && media[key]) || [])];
  if (isDefault && page.hero) list = [page.hero, ...list.filter(f => f !== page.hero)];
  for (const g of page.gallery || []) if (!list.includes(g)) list.push(g);
  return list;
}

/** Photos on disk that no finish, hero or gallery entry shows. */
export function unusedPhotos(dir, meta, media) {
  const used = new Set([
    ...Object.values(media || {}).flat(),
    ...(meta.page?.hero ? [meta.page.hero] : []),
    ...(meta.page?.gallery || []),
  ]);
  return readdirSync(dir)
    .filter(f => IMAGE_EXT.test(f) && !used.has(f))
    .sort();
}
