#!/usr/bin/env node
/*
 * Catalog tooling. Run through npm:
 *   npm run catalog:check                 read-only; exits 1 on any error
 *   npm run catalog:add-product -- <input.json> [--dry-run]
 *   npm run catalog:add-builder -- <input.json> [--dry-run]
 *   npm run catalog:template -- product|builder
 *
 * The rules live in scripts/lib/catalog-rules.mjs. Input is a JSON file; print
 * a filled-in shape with catalog:template.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRIB_CATEGORIES,
  directoryNameFor,
  loadCatalog,
  readImageSize,
  slugify,
  validateCatalog,
} from './lib/catalog-rules.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS = join(root, 'public', 'data', 'products');
const BUILDERS = join(root, 'data', 'builders');
const LIVE_SLUGS = join(root, 'data', 'live-slugs.json');

const PRODUCT_INPUT_KEYS = new Set([
  'productName', 'slug', 'category', 'builder', 'style', 'uses', 'usesCredit', 'collection', 'variantType', 'soldWoods',
  'description', 'extendedDescription', 'title', 'metaDescription', 'tags', 'addons', 'variants',
  'bundle', 'bundlePriceOverrides', 'bundleOptional', 'bundleUnchecked', 'related', 'includes',
  'images', 'photos',
]);
const VARIANT_INPUT_KEYS = new Set(['variant', 'label', 'stains', 'basePrice', 'sku', 'dimensions', 'weight', 'unavailableStains']);
const BUILDER_INPUT_KEYS = new Set([
  'id', 'name', 'order', 'based', 'background', 'intro', 'story', 'leadTime', 'leadWeeksMax', 'buildFeatures',
  'listed', 'banner', 'sku', 'construction', 'setup', 'safety',
]);

const TEMPLATES = {
  product: {
    productName: '<name>',
    category: 'Cribs',
    builder: '<builder id in data/builders, or null only outside cribs and case goods>',
    style: 'classic-slats',
    uses: ['CRIB', 'TODDLER BED', 'DAY BED', 'FULL BED'],
    collection: null,
    variantType: 'wood',
    soldWoods: ['Brown Maple'],
    description: '<factual copy from the builder document>',
    metaDescription: '<one factual sentence>',
    variants: [
      { variant: 'BrownMaple', label: 'Brown Maple', stains: ['Natural'], basePrice: 1950, sku: '<PREFIX>-000', dimensions: null, weight: null },
    ],
    bundle: [],
    related: [],
    images: [{ file: 'photo.jpg', variant: 'BrownMaple', stain: 'Natural' }],
    photos: { rights: 'builder-permission', rightsSource: '<the permission or license>', matchesSoldWood: 'yes' },
  },
  builder: {
    name: '<shop name>',
    based: 'City, State',
    background: "<what a builder document shows, in Heirloom's voice>",
    intro: { text: "<the builder's words, verbatim>", source: '<named document>' },
    story: [{ text: "<the builder's words, verbatim>", source: '<named document>' }],
    leadTime: 'About 8 weeks',
    leadWeeksMax: 8,
    listed: true,
    banner: { image: '/data/products/<Product%20Dir>/<real_catalog_photo>.jpg', alt: "<what the photo shows, naming no wood>" },
    sku: { prefix: 'ABC', brand: '<brand for the feed>', handlingDays: { min: 40, max: 56 }, baseMaterial: null },
    construction: null,
    setup: null,
    safety: { crib: null, caseGoods: null },
  },
};

function parseArgs(argv) {
  const positional = [];
  const flags = new Set();
  for (const arg of argv) {
    if (arg.startsWith('--')) flags.add(arg);
    else positional.push(arg);
  }
  return { positional, flags };
}

function report(findings, { showLegacy = false } = {}) {
  const errors = findings.filter(f => f.level === 'error');
  const warnings = findings.filter(f => f.level === 'warning');
  const legacy = findings.filter(f => f.level === 'legacy');
  const print = f => console.log(`  [${f.code}] ${f.where}\n      ${f.message}\n      fix: ${f.fix}`);
  if (warnings.length) {
    console.log(`\nWARNINGS (${warnings.length}):`);
    warnings.forEach(print);
  }
  if (errors.length) {
    console.log(`\nERRORS (${errors.length}):`);
    errors.forEach(print);
  }
  if (showLegacy && legacy.length) {
    console.log(`\nLEGACY COPY (${legacy.length}):`);
    legacy.forEach(print);
  }
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s), ${legacy.length} grandfathered legacy copy finding(s).`);
  return errors.length;
}

function runGenerator(extra = []) {
  execFileSync(process.execPath, [join(root, 'scripts', 'build-data.mjs'), ...extra], { stdio: 'pipe', cwd: root });
}

function commandCheck(flags) {
  const findings = validateCatalog(loadCatalog(root));
  if (flags.has('--json')) {
    console.log(JSON.stringify(findings, null, 2));
    return findings.some(f => f.level === 'error') ? 1 : 0;
  }
  const errors = report(findings, { showLegacy: flags.has('--legacy') });
  if (errors > 0) return 1;
  try {
    runGenerator(['--check']);
  } catch (error) {
    console.log(String(error.stderr || error.message));
    return 1;
  }
  console.log('Catalog OK. Build guards passed.');
  return 0;
}

function loadInput(path) {
  if (!path) throw new Error('Pass a JSON input file. Print the shape with npm run catalog:template.');
  const abs = resolve(path);
  if (!existsSync(abs)) throw new Error(`No such input file: ${abs}`);
  return { input: JSON.parse(readFileSync(abs, 'utf8')), baseDir: dirname(abs) };
}

function refuse(message) {
  console.log(`\nREFUSED: ${message}`);
  return 1;
}

function buildCandidate(input, baseDir) {
  const unknown = Object.keys(input).filter(k => !PRODUCT_INPUT_KEYS.has(k));
  if (unknown.length > 0) {
    throw new Error(
      `Unknown input field(s): ${unknown.join(', ')}. Prices go on variants. Safety and origin statements belong on the builder record, with a named document.`
    );
  }
  if (typeof input.productName !== 'string' || !input.productName.trim()) throw new Error('productName is required.');
  if (!Array.isArray(input.variants) || input.variants.length === 0) throw new Error('variants must be a non-empty array.');
  for (const variant of input.variants) {
    const extra = Object.keys(variant).filter(k => !VARIANT_INPUT_KEYS.has(k));
    if (extra.length > 0) throw new Error(`Unknown field(s) on variant "${variant.variant}": ${extra.join(', ')}.`);
  }
  const dirName = directoryNameFor(input.productName);
  if (!dirName || dirName === '.' || dirName === '..' || /[\\]/.test(dirName)) {
    throw new Error(`productName "${input.productName}" cannot be used as a directory name.`);
  }
  const slug = input.slug || slugify(input.productName);
  const description = input.description;
  const metaDescription = input.metaDescription;
  const meta = {
    productName: input.productName.trim(),
    category: input.category,
    builder: input.builder === undefined ? null : input.builder,
    ...(CRIB_CATEGORIES.has(input.category) || input.style !== undefined ? { style: input.style } : {}),
    ...(input.uses !== undefined ? { uses: input.uses } : {}),
    ...(input.usesCredit !== undefined ? { usesCredit: input.usesCredit } : {}),
    variantType: input.variantType,
    ...(input.soldWoods !== undefined ? { soldWoods: input.soldWoods } : {}),
    description,
    extendedDescription: input.extendedDescription ?? null,
    tags: input.tags ?? [],
    addons: input.addons ?? [],
    defaultVariant: input.variants[0].variant,
    slug,
    title: input.title ?? input.productName.trim(),
    metaDescription,
    bundle: input.bundle ?? [],
    related: input.related ?? [],
    includes: input.includes ?? [],
    ...(input.collection ? { collection: input.collection } : {}),
    ...(input.bundlePriceOverrides ? { bundlePriceOverrides: input.bundlePriceOverrides } : {}),
    ...(input.bundleOptional ? { bundleOptional: input.bundleOptional } : {}),
    ...(input.bundleUnchecked ? { bundleUnchecked: input.bundleUnchecked } : {}),
    photos: input.photos,
  };
  const variants = input.variants.map(v => ({
    variant: v.variant,
    label: v.label ?? v.variant,
    stains: v.stains,
    basePrice: v.basePrice,
    sku: v.sku ?? null,
    dimensions: v.dimensions ?? null,
    weight: v.weight ?? null,
    ...(v.unavailableStains ? { unavailableStains: v.unavailableStains } : {}),
  }));

  const imageBase = slug.replace(/-/g, '_');
  const media = {};
  const copies = [];
  const imageFiles = {};
  (input.images ?? []).forEach((image, index) => {
    const source = isAbsolute(image.file) ? image.file : resolve(baseDir, image.file);
    const ext = extname(image.file).toLowerCase() || '.jpg';
    const name = `${imageBase}_${index}${ext === '.jpeg' ? '.jpg' : ext}`;
    const key = `${image.variant}||${image.stain}`;
    (media[key] ||= []).push(name);
    copies.push({ source, name });
    imageFiles[name] = existsSync(source) ? readImageSize(source) : { missing: true };
  });
  return { dirName, slug, meta, variants, media, imageFiles, copies };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function commandAddProduct(positional, flags) {
  const { input, baseDir } = loadInput(positional[0]);
  const candidate = buildCandidate(input, baseDir);
  const { dirName, slug, meta, variants, media, imageFiles, copies } = candidate;
  const catalog = loadCatalog(root);

  if (existsSync(join(PRODUCTS, dirName))) {
    return refuse(`public/data/products/${dirName} already exists. To change a product, edit its JSON and run npm run catalog:check.`);
  }
  if (catalog.liveSlugs.has(slug) && !catalog.products.some(p => p.meta?.slug === slug)) {
    return refuse(`slug "${slug}" belonged to a retired product and may still be indexed. Choose another slug.`);
  }
  // Registered in the copy of the set this run validates; written only on success.
  catalog.products.push({ dirName, meta, variants, media, parseError: null, imageFiles });
  if (!catalog.products.some(p => p !== catalog.products.at(-1) && p.meta?.slug === slug)) {
    catalog.liveSlugs.add(slug);
  }
  const findings = validateCatalog(catalog);
  const errors = report(findings);

  console.log(`\nPlan for ${meta.productName}:`);
  console.log(`  public/data/products/${dirName}/{product,variants,media}.json`);
  for (const copy of copies) console.log(`  ${copy.source} -> public/data/products/${dirName}/${copy.name}`);
  console.log(`  data/live-slugs.json + ${slug}`);
  console.log(`  URL: /product/${slug}   builder: ${meta.builder}   style: ${meta.style ?? 'n/a'}`);
  for (const v of variants) console.log(`  ${v.variant}: $${v.basePrice} (${Math.round(v.basePrice * 100)} cents)`);

  if (errors > 0) return refuse('fix the errors above. Nothing was written.');
  if (flags.has('--dry-run')) {
    console.log('\nDry run. Nothing was written.');
    return 0;
  }

  const target = join(PRODUCTS, dirName);
  const originalLive = readFileSync(LIVE_SLUGS, 'utf8');
  try {
    mkdirSync(target, { recursive: true });
    writeJson(join(target, 'product.json'), meta);
    writeJson(join(target, 'variants.json'), variants);
    writeJson(join(target, 'media.json'), media);
    for (const { source, name } of copies) copyFileSync(source, join(target, name));
    writeJson(LIVE_SLUGS, [...JSON.parse(originalLive), slug].sort());
    runGenerator();
  } catch (error) {
    rmSync(target, { recursive: true, force: true });
    writeFileSync(LIVE_SLUGS, originalLive);
    try {
      runGenerator();
    } catch {
      // The generated files were last written by a good run or are unchanged.
    }
    return refuse(`writing failed and was rolled back: ${String(error.stderr || error.message)}`);
  }

  const index = JSON.parse(readFileSync(join(root, 'public/data/products.json'), 'utf8')).find(p => p.slug === slug);
  const priced = JSON.parse(readFileSync(join(root, 'data/pricing.json'), 'utf8')).filter(r => r.productName === meta.productName);
  console.log(`\nAdded. Generated data shows builder=${index?.builder} style=${index?.style} from $${index?.minPrice}, ${priced.length} pricing row(s).`);
  console.log('Verify with: npm run catalog:check && npm run typecheck && npm test');
  return 0;
}

function commandAddBuilder(positional, flags) {
  const { input } = loadInput(positional[0]);
  const unknown = Object.keys(input).filter(k => !BUILDER_INPUT_KEYS.has(k));
  if (unknown.length > 0) return refuse(`unknown input field(s): ${unknown.join(', ')}.`);
  if (typeof input.name !== 'string' || !input.name.trim()) return refuse('name is required.');
  const id = input.id || slugify(input.name);
  const catalog = loadCatalog(root);
  if (catalog.builders.some(b => b.fileId === id)) return refuse(`builder "${id}" already exists. Edit data/builders/${id}.json directly.`);

  const order = Math.max(0, ...catalog.builders.map(b => b.record?.order ?? 0)) + 10;
  const record = {
    id,
    name: input.name.trim(),
    order: input.order ?? order,
    based: input.based,
    background: input.background,
    intro: input.intro,
    ...(input.story ? { story: input.story } : {}),
    leadTime: input.leadTime,
    leadWeeksMax: input.leadWeeksMax,
    buildFeatures: input.buildFeatures ?? { crib: [], caseGoods: [] },
    listed: input.listed ?? false,
    ...(input.banner ? { banner: input.banner } : {}),
    sku: input.sku,
    construction: input.construction ?? null,
    setup: input.setup ?? null,
    safety: { crib: input.safety?.crib ?? null, caseGoods: input.safety?.caseGoods ?? null },
  };
  catalog.builders.push({ fileId: id, record });
  const errors = report(validateCatalog(catalog));
  console.log(`\nPlan: data/builders/${id}.json, store /builders/${id} (generated), order ${record.order}`);
  for (const [field, quote] of [['construction', record.construction], ['setup', record.setup], ['safety.crib', record.safety.crib], ['safety.caseGoods', record.safety.caseGoods]]) {
    console.log(`  ${field}: ${quote ? `"${quote.text.slice(0, 60)}..." (${quote.source})` : 'null, the store leaves this out'}`);
  }
  if (errors > 0) return refuse('fix the errors above. Nothing was written.');
  if (flags.has('--dry-run')) {
    console.log('\nDry run. Nothing was written.');
    return 0;
  }

  const file = join(BUILDERS, `${id}.json`);
  try {
    writeJson(file, record);
    runGenerator();
  } catch (error) {
    rmSync(file, { force: true });
    return refuse(`writing failed and was rolled back: ${String(error.stderr || error.message)}`);
  }
  console.log(`\nAdded ${record.name}. Add products with "builder": "${id}". Verify with: npm run catalog:check && npm run typecheck && npm test`);
  return 0;
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);
  try {
    switch (command) {
      case 'check':
        return commandCheck(flags);
      case 'add-product':
        return commandAddProduct(positional, flags);
      case 'add-builder':
        return commandAddBuilder(positional, flags);
      case 'template':
        if (!TEMPLATES[positional[0]]) return refuse('use: catalog:template -- product|builder');
        console.log(JSON.stringify(TEMPLATES[positional[0]], null, 2));
        return 0;
      default:
        console.log('Commands: check, add-product <input.json> [--dry-run], add-builder <input.json> [--dry-run], template product|builder');
        return command ? 1 : 0;
    }
  } catch (error) {
    return refuse(error.message);
  }
}

process.exitCode = main();
