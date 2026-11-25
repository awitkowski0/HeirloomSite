#!/usr/bin/env node
/*
 * Product page setup, for people and for AI assistants.
 *
 *   npm run product -- <command> [args]
 *
 * Every command edits the same three files a person would edit by hand
 * (public/data/products/<Folder>/{product,variants,media}.json), so nothing
 * here is required - it exists to make the common moves one line each and to
 * check them the way the build will. The playbook is docs/product-pages.md.
 *
 * Run with no arguments for the command list.
 */
import { spawn, spawnSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from "path";
import { fileURLToPath } from "url";
import {
  IMAGE_EXT,
  checkPageMedia,
  defaultMediaKey,
  mediaKey,
  photosFor,
  unusedPhotos,
} from "./lib/product-page.mjs";
import { placeholderProblems, variantTypeProblem } from "./lib/product-checks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = join(root, "public", "data", "products");
const TEMPLATES = join(root, "templates", "products");
const PREVIEW_DIR = join(root, ".preview");
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const INDEX_URL = `${BASE_URL}/dev/products`;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function die(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

function readJSON(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (err) {
    die(`${relative(root, path)} is not valid JSON: ${err.message}`);
  }
}

// Same shape as every file already in the catalogue, so a rewrite only shows
// the lines that actually changed in a diff.
function writeJSON(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

/** Parse argv into positionals and --flags (a flag may take one value). */
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positional.push(a);
      continue;
    }
    const [name, inline] = a.slice(2).split(/=(.*)/s);
    if (inline !== undefined) flags[name] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) flags[name] = argv[++i];
    else flags[name] = true;
  }
  return { positional, flags };
}

// Must match scripts/seo-slugs.mjs, which named every existing product.
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

/** The categories kept out of the nav, grids and search (the kits, the mattress). */
function unlistedCategories() {
  const src = readFileSync(join(root, "src", "lib", "taxonomy.ts"), "utf-8");
  const unlisted = src.match(/UNLISTED_CATEGORIES[^=]*=\s*\[([^\]]*)\]/);
  return [...(unlisted?.[1].matchAll(/'([^']+)'/g) ?? [])].map(q => q[1]);
}

/** The categories the taxonomy claims, read from its source. */
function knownCategories() {
  const src = readFileSync(join(root, "src", "lib", "taxonomy.ts"), "utf-8");
  const names = new Set(unlistedCategories());
  for (const m of src.matchAll(/sources:\s*\[([^\]]*)\]/g)) {
    for (const q of m[1].matchAll(/'([^']+)'/g)) names.add(q[1]);
  }
  return [...names].sort();
}

// ---------------------------------------------------------------------------
// Loading a product
// ---------------------------------------------------------------------------

function productDirs() {
  return readdirSync(PRODUCTS)
    .filter(d => d !== "showroom" && existsSync(join(PRODUCTS, d, "product.json")))
    .sort();
}

function load(dirName) {
  const dir = join(PRODUCTS, dirName);
  return {
    dirName,
    dir,
    meta: readJSON(join(dir, "product.json"), {}),
    variants: readJSON(join(dir, "variants.json"), []),
    media: readJSON(join(dir, "media.json"), {}),
  };
}

/** Find a product by slug, folder name or product name (case-insensitive). */
function find(query) {
  if (!query) die("Name a product: its slug (addison-crib), folder or product name.");
  const q = query.toLowerCase().replace(/^\/?product\//, "").replace(/\/$/, "");
  const all = productDirs().map(load);
  const exact = all.find(
    p =>
      p.meta.slug?.toLowerCase() === q ||
      p.dirName.toLowerCase() === q ||
      p.meta.productName?.toLowerCase() === q
  );
  if (exact) return exact;
  const partial = all.filter(
    p => p.meta.slug?.includes(q) || p.meta.productName?.toLowerCase().includes(q)
  );
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    die(`"${query}" matches ${partial.length} products:\n` + partial.map(p => `      ${p.meta.slug}`).join("\n"));
  }
  die(`No product matches "${query}". Try: npm run product -- list`);
}

function save(p) {
  // Drop an emptied page block rather than leave "page": {} behind.
  if (p.meta.page) {
    if (!p.meta.page.hero) delete p.meta.page.hero;
    if (!p.meta.page.gallery?.length) delete p.meta.page.gallery;
    if (Object.keys(p.meta.page).length === 0) delete p.meta.page;
  }
  writeJSON(join(p.dir, "product.json"), p.meta);
  writeJSON(join(p.dir, "media.json"), p.media);
}

function finishKeys(p) {
  return p.variants
    .filter(v => v.hidden !== true)
    .flatMap(v => (v.stains || []).map(s => mediaKey(v.variant, s)));
}

/**
 * Bring a photo into the product folder and return its filename there.
 * A file already in the folder is used where it is; anything else is copied
 * in under a tidy, collision-free name. Originals are never moved.
 */
function adopt(p, file) {
  const src = isAbsolute(file) ? file : resolve(process.cwd(), file);
  if (!existsSync(src)) {
    // Allow a bare filename that is already in the product folder.
    if (existsSync(join(p.dir, file))) return file;
    die(`No such file: ${file}`);
  }
  if (!IMAGE_EXT.test(src)) die(`${file} is not a .jpg, .png, .webp or .avif image`);
  if (dirname(src) === p.dir) return basename(src);

  const ext = extname(src).toLowerCase().replace(".jpeg", ".jpg");
  const stem =
    basename(src, extname(src))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "photo";
  let name = `${stem}${ext}`;
  for (let n = 2; existsSync(join(p.dir, name)); n++) name = `${stem}_${n}${ext}`;
  copyFileSync(src, join(p.dir, name));
  console.log(`  copied ${src.startsWith(root) ? relative(root, src) : src} → ${relative(root, join(p.dir, name))}`);
  return name;
}

function pageUrl(p, key) {
  const url = `${BASE_URL}/product/${p.meta.slug}`;
  if (!key) return url;
  const [wood, stain] = key.split("||");
  return `${url}?wood=${encodeURIComponent(wood)}&stain=${encodeURIComponent(stain)}`;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** live, draft, hidden, or unlisted (live, but only reachable by link). */
function statusOf(p, unlisted) {
  if (p.meta.hidden === true) return "hidden";
  if (p.meta.draft === true) return "draft";
  return unlisted.includes(p.meta.category) ? "unlisted" : "live";
}

/**
 * Everything `check` knows about one product.
 *
 *   errors    what the build refuses
 *   todo      what a draft still has to fill in before `publish` (template
 *             placeholders). On a product that is not a draft these are errors.
 *   warnings  what the build would quietly ship
 */
function inspect(p, ctx) {
  const errors = checkPageMedia(p.dir, p.dirName, p.meta, p.media);
  const todo = [];
  const warnings = [];
  const visible = p.variants.filter(v => v.hidden !== true);

  if (p.meta.draft !== undefined && typeof p.meta.draft !== "boolean") {
    errors.push(`product.json: "draft" must be true or absent, got ${JSON.stringify(p.meta.draft)}`);
  }
  if (!p.meta.productName) errors.push("product.json: no productName");
  if (!p.meta.slug) errors.push("product.json: no slug");
  else if ((ctx.slugs.get(p.meta.slug) || []).length > 1) {
    errors.push(`slug "${p.meta.slug}" is shared with ${ctx.slugs.get(p.meta.slug).filter(d => d !== p.dirName).join(", ")}`);
  }
  if (!ctx.categories.includes(p.meta.category)) {
    errors.push(`category "${p.meta.category}" is not one the taxonomy claims (src/lib/taxonomy.ts)`);
  }
  if (visible.length === 0) errors.push("variants.json has no visible variant, so there would be no page");
  else {
    const problem = variantTypeProblem(p.dirName, p.meta.variantType, visible.map(v => v.variant));
    if (problem) errors.push(problem);
  }
  for (const field of ["includes", "bundle", "related"]) {
    for (const slug of p.meta[field] || []) {
      const target = ctx.status.get(slug);
      if (!target) errors.push(`${field} names "${slug}", which is not a product slug`);
      else if (target === "hidden") warnings.push(`${field} names "${slug}", which is hidden: the row is dropped`);
      else if (target === "draft" && p.meta.draft !== true) {
        warnings.push(`${field} names "${slug}", which is a draft: the row is dropped until it is published`);
      }
    }
  }
  (p.meta.draft === true ? todo : errors).push(...placeholderProblems(p.meta, p.variants));

  const keys = finishKeys(p);
  const allKeys = new Set(p.variants.flatMap(v => (v.stains || []).map(s => mediaKey(v.variant, s))));
  for (const k of Object.keys(p.media)) {
    if (!allKeys.has(k)) warnings.push(`media.json key "${k}" matches no finish in variants.json`);
  }
  const landing = defaultMediaKey(visible);
  if (!photosFor(p.meta, p.media, landing, true).length) warnings.push("no photo at all: the page shows \"Photography coming soon\"");
  const bare = keys.filter(k => !(p.media[k] || []).length);
  if (bare.length && bare.length < keys.length) warnings.push(`${bare.length} finish(es) have no photo of their own: ${bare.slice(0, 3).join(", ")}${bare.length > 3 ? ", ..." : ""}`);
  // Stains are chosen with the finish selector, not swiped through. The shared
  // gallery is for room shots and other angles; a photo of one stain there
  // shows that stain under every other finish's name.
  const finishPhotos = new Map();
  for (const [k, list] of Object.entries(p.media)) for (const f of list) finishPhotos.set(f, k);
  for (const g of p.meta.page?.gallery || []) {
    if (finishPhotos.has(g)) warnings.push(`gallery photo ${g} is the "${finishPhotos.get(g)}" finish photo: the shared carousel is for rooms and angles, so it would show that stain on every finish`);
  }
  const hero = p.meta.page?.hero;
  if (hero && finishPhotos.has(hero) && finishPhotos.get(hero) !== landing) {
    warnings.push(`hero ${hero} is the "${finishPhotos.get(hero)}" finish photo, but visitors land on "${landing}"`);
  }
  if (!p.meta.description) warnings.push("description is empty");
  const unused = unusedPhotos(p.dir, p.meta, p.media);
  if (unused.length) warnings.push(`${unused.length} unused photo(s) in the folder: ${unused.slice(0, 4).join(", ")}${unused.length > 4 ? ", ..." : ""}`);

  return { errors, todo, warnings, unused };
}

/** What `inspect` needs to know about the rest of the catalogue. */
function catalogueContext(all = productDirs().map(load)) {
  const unlisted = unlistedCategories();
  const slugs = new Map();
  const status = new Map();
  for (const p of all) {
    if (!p.meta.slug) continue;
    slugs.set(p.meta.slug, [...(slugs.get(p.meta.slug) || []), p.dirName]);
    status.set(p.meta.slug, statusOf(p, unlisted));
  }
  return { all, unlisted, slugs, status, categories: knownCategories() };
}

/**
 * Ask the build itself. Runs every guard in scripts/build-data.mjs without
 * writing anything, so the answer is the build's and not this file's opinion
 * of it. Returns null when it passes, otherwise the build's own message.
 */
function buildWouldRefuse({ drafts }) {
  const res = spawnSync(
    process.execPath,
    [join(root, "scripts", "build-data.mjs"), "--dry-run", ...(drafts ? ["--include-drafts"] : [])],
    { encoding: "utf-8" }
  );
  return res.status === 0 ? null : (res.stderr || res.stdout || "build-data failed").trim();
}

function cmdList(args) {
  const ctx = catalogueContext();
  if (args.flags.json) {
    // Read by the dev-only index page, src/app/dev/products/page.tsx.
    const rows = ctx.all.map(p => {
      const status = statusOf(p, ctx.unlisted);
      const visible = p.variants.filter(v => v.hidden !== true);
      const lead = photosFor(p.meta, p.media, defaultMediaKey(visible), true)[0] || null;
      const used = new Set([
        ...finishKeys(p).flatMap(k => p.media[k] || []),
        ...(p.meta.page?.hero ? [p.meta.page.hero] : []),
        ...(p.meta.page?.gallery || []),
      ]);
      // A hidden product is not built, so nothing about it is checked.
      const report = status === "hidden" ? { errors: [], todo: [], warnings: [], unused: unusedPhotos(p.dir, p.meta, p.media) } : inspect(p, ctx);
      return {
        folder: p.dirName,
        productName: p.meta.productName || p.dirName,
        slug: p.meta.slug || null,
        category: p.meta.category || null,
        collection: p.meta.collection || null,
        variantType: p.meta.variantType || null,
        status,
        image: lead ? `/data/products/${encodeURIComponent(p.dirName)}/${lead}` : null,
        finishes: finishKeys(p).length,
        photos: used.size,
        unusedPhotos: report.unused.length,
        errors: report.errors,
        todo: report.todo,
        warnings: report.warnings,
      };
    });
    console.log(JSON.stringify(rows));
    return;
  }
  for (const p of ctx.all) {
    const status = statusOf(p, ctx.unlisted);
    const flags = [
      status === "live" ? null : status,
      p.meta.page?.hero ? "hero" : null,
      p.meta.page?.gallery?.length ? `+${p.meta.page.gallery.length} shared` : null,
    ].filter(Boolean);
    console.log(`${(p.meta.slug || "(no slug)").padEnd(52)} ${p.meta.category || "-"}${flags.length ? `  [${flags.join(", ")}]` : ""}`);
  }
}

function describe(p) {
  const landing = defaultMediaKey(p.variants.filter(v => v.hidden !== true));
  const finishes = finishKeys(p).map(key => ({
    key,
    url: pageUrl(p, key),
    photos: photosFor(p.meta, p.media, key, key === landing),
    ownPhotos: p.media[key] || [],
  }));
  return {
    productName: p.meta.productName,
    slug: p.meta.slug,
    category: p.meta.category,
    status: statusOf(p, unlistedCategories()),
    url: pageUrl(p),
    folder: relative(root, p.dir) + "/",
    files: {
      "product.json": "name, category, description, SEO, related/bundle, and the `page` block (hero, gallery)",
      "variants.json": "finishes (variant + stains), prices in dollars, SKUs, dimensions",
      "media.json": 'photos per finish: { "<variant>||<stain>": ["first-is-swatch.jpg", ...] }',
    },
    page: p.meta.page || {},
    landingFinish: landing,
    leadPhoto: photosFor(p.meta, p.media, landing, true)[0] || null,
    finishes,
    unusedPhotos: unusedPhotos(p.dir, p.meta, p.media),
  };
}

function cmdShow(args) {
  const p = find(args.positional[0]);
  const info = describe(p);
  if (args.flags.json) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }
  console.log(`\n${info.productName}   ${info.url}`);
  if (info.status === "draft") console.log(`  status    DRAFT - on localhost only until: npm run product -- publish ${info.slug}`);
  else if (info.status !== "live") console.log(`  status    ${info.status}`);
  console.log(`  folder    ${info.folder}`);
  for (const [f, what] of Object.entries(info.files)) console.log(`  ${f.padEnd(14)}${what}`);
  console.log(`\n  hero      ${info.page.hero ? info.page.hero : `(not set - uses ${info.leadPhoto || "nothing: no photos"})`}`);
  console.log(`  gallery   ${info.page.gallery?.length ? info.page.gallery.join(", ") : "(none - shown on every finish when set)"}`);
  console.log(`\n  finishes (carousel order; the first finish is where visitors land)`);
  for (const f of info.finishes) {
    console.log(`    ${f.key}${f.key === info.landingFinish ? "   ← landing" : ""}`);
    console.log(`      ${f.photos.length ? f.photos.join(", ") : "(no photos)"}`);
  }
  if (info.unusedPhotos.length) {
    console.log(`\n  unused photos in the folder (on disk, shown nowhere):`);
    for (const f of info.unusedPhotos) console.log(`    ${f}`);
  }
  console.log("");
}

function cmdSetHero(args) {
  const p = find(args.positional[0]);
  p.meta.page ??= {};
  if (args.flags.clear) {
    delete p.meta.page.hero;
    save(p);
    console.log(`  hero cleared - ${p.meta.slug} leads with its landing finish's first photo again`);
    return;
  }
  const file = args.positional[1];
  if (!file) die("Usage: set-hero <product> <photo>   (or --clear)");
  p.meta.page.hero = adopt(p, file);
  save(p);
  console.log(`  hero → ${p.meta.page.hero}`);
}

function cmdAddPhotos(args) {
  const [query, ...files] = args.positional;
  const p = find(query);
  if (files.length === 0) die('Usage: add-photos <product> <photo...> [--finish "<variant>||<stain>" | --finish default]');

  let key = null;
  if (args.flags.finish) {
    const keys = finishKeys(p);
    key = args.flags.finish === "default" ? defaultMediaKey(p.variants.filter(v => v.hidden !== true)) : args.flags.finish;
    if (!keys.includes(key)) {
      die(`"${args.flags.finish}" is not a finish of ${p.meta.slug}. Finishes:\n` + keys.map(k => `      ${k}`).join("\n"));
    }
  }

  const names = files.map(f => adopt(p, f));
  if (key) {
    p.media[key] = [...(p.media[key] || []), ...names.filter(n => !(p.media[key] || []).includes(n))];
    console.log(`  ${key} → ${p.media[key].join(", ")}`);
  } else {
    p.meta.page ??= {};
    const gallery = p.meta.page.gallery || [];
    p.meta.page.gallery = [...gallery, ...names.filter(n => !gallery.includes(n))];
    console.log(`  shared gallery → ${p.meta.page.gallery.join(", ")}`);
  }
  save(p);
}

function cmdRemovePhoto(args) {
  const [query, file] = args.positional;
  const p = find(query);
  if (!file) die("Usage: remove-photo <product> <photo>   (unlinks it from the page; the file stays on disk)");
  let hits = 0;
  if (p.meta.page?.hero === file) {
    delete p.meta.page.hero;
    hits++;
  }
  if (p.meta.page?.gallery?.includes(file)) {
    p.meta.page.gallery = p.meta.page.gallery.filter(f => f !== file);
    hits++;
  }
  for (const [k, list] of Object.entries(p.media)) {
    if (list.includes(file)) {
      p.media[k] = list.filter(f => f !== file);
      hits++;
    }
  }
  if (!hits) die(`${file} is not used on ${p.meta.slug}`);
  save(p);
  console.log(`  ${file} removed from ${hits} place(s); the file is still in the folder`);
}

// --- templates and new products ----------------------------------------------

function templateNames() {
  if (!existsSync(TEMPLATES)) return [];
  return readdirSync(TEMPLATES)
    .filter(d => existsSync(join(TEMPLATES, d, "product.json")))
    .sort();
}

function loadTemplate(name) {
  const dir = join(TEMPLATES, name);
  if (!existsSync(join(dir, "product.json"))) {
    die(`No template "${name}". Templates:\n` + templateNames().map(t => `      ${t}`).join("\n"));
  }
  return {
    about: readJSON(join(dir, "template.json"), {}),
    meta: readJSON(join(dir, "product.json"), {}),
    variants: readJSON(join(dir, "variants.json"), []),
  };
}

function cmdTemplates() {
  console.log("");
  for (const name of templateNames()) {
    const t = loadTemplate(name);
    const finishes = t.variants.reduce((n, v) => n + (v.stains || []).length, 0);
    console.log(`  ${name.padEnd(16)} ${t.about.summary || ""}`);
    console.log(`  ${"".padEnd(16)} ${t.meta.category}, variantType ${t.meta.variantType}, ${finishes} finish(es)${t.meta.bundle?.length ? `, bundle: ${t.meta.bundle.join(", ")}` : ""}`);
  }
  console.log(`\n  use one:   npm run product -- new "<Name>" --template <name>`);
  console.log(`  or clone:  npm run product -- new "<Name>" --like "<existing product>"`);
  console.log(`  They live in ${relative(root, TEMPLATES)}/ - edit them like any product folder.\n`);
}

/** product.json in the catalogue's usual key order, with `draft` up top. */
function draftMeta(name, slug, rest) {
  const { productName: _n, slug: _s, title: _t, draft: _d, hidden: _h, category, ...others } = rest;
  const out = { productName: name, category, draft: true };
  for (const [k, v] of Object.entries(others)) {
    out[k] = v;
    // slug and title sit after defaultVariant in every existing file.
    if (k === "defaultVariant") Object.assign(out, { slug, title: name });
  }
  if (!out.slug) Object.assign(out, { slug, title: name });
  return out;
}

function cmdNew(args) {
  const name = args.positional[0];
  const usage =
    'Usage: new "<Product Name>" --category <Category> --price <dollars>\n' +
    '          or  new "<Product Name>" --template <name>      (npm run product -- templates)\n' +
    '          or  new "<Product Name>" --like "<existing product>"\n' +
    '    optional: [--category C] [--price N] [--sku X] [--description "..."] [--collection X] [--photos a.jpg,b.jpg]';
  if (!name) die(usage);
  const flag = k => (typeof args.flags[k] === "string" ? args.flags[k] : null);
  if (flag("template") && flag("like")) die("--template and --like are two ways to start: pick one");

  const categories = knownCategories();
  const category = flag("category");
  if (category && !categories.includes(category)) {
    die(`--category must be one of:\n` + categories.map(c => `      ${c}`).join("\n"));
  }
  const price = args.flags.price === undefined ? null : Number(args.flags.price);
  if (price !== null && !(Number.isFinite(price) && price > 0)) die("--price is whole dollars, e.g. --price 1299");

  const slug = slugify(name);
  const dirName = name.replace(/\//g, "-");
  const dir = join(PRODUCTS, dirName);
  if (existsSync(dir)) die(`${relative(root, dir)} already exists`);
  const clash = productDirs().map(load).find(p => p.meta.slug === slug);
  if (clash) die(`slug ${slug} is already used by ${clash.dirName}`);

  const description = flag("description");
  let meta;
  let variants;
  let notes = [];

  if (flag("like")) {
    // The structure of an existing product, and none of its identity: no
    // photos, SKUs, slug or copy. Hidden variants are not carried over.
    const src = find(flag("like"));
    const { page: _page, ...rest } = src.meta;
    meta = draftMeta(name, slug, {
      ...rest,
      description: `TODO: describe the ${name}.`,
      extendedDescription: null,
      metaDescription: "TODO: one sentence for search results, under 155 characters.",
    });
    variants = src.variants
      .filter(v => v.hidden !== true)
      .map(v => ({
        variant: v.variant,
        label: v.label,
        stains: [...(v.stains || [])],
        basePrice: v.basePrice,
        sku: "TODO",
        dimensions: null,
        weight: null,
      }));
    notes = [
      `structure copied from ${src.meta.productName}: category, finishes, bundle and related`,
      price === null ? `prices were copied too (${[...new Set(variants.map(v => "$" + v.basePrice))].join(", ")}) - confirm them, or pass --price` : null,
    ].filter(Boolean);
  } else if (flag("template")) {
    const t = loadTemplate(flag("template"));
    meta = draftMeta(name, slug, t.meta);
    variants = t.variants;
    notes = t.about.notes || [];
  } else {
    if (!category) die(`${usage}\n\n    --category must be one of:\n` + categories.map(c => `      ${c}`).join("\n"));
    if (price === null) die("--price is required: whole dollars, e.g. --price 1299");
    meta = draftMeta(name, slug, {
      category,
      variantType: "none",
      description: "",
      extendedDescription: null,
      tags: [],
      addons: [],
      defaultVariant: "Default Title",
      metaDescription: "",
      related: [],
      collection: null,
    });
    variants = [
      { variant: "Default Title", label: "Default Title", stains: ["Default"], basePrice: price, sku: null, dimensions: null, weight: null },
    ];
  }

  // Flags win over whatever the template or the cloned product carried.
  if (category) meta.category = category;
  if (flag("collection")) meta.collection = flag("collection");
  if (description) {
    meta.description = description;
    meta.metaDescription = description.split(/(?<=\.)\s/)[0]?.slice(0, 155) || "";
  }
  if (price !== null) for (const v of variants) v.basePrice = price;
  if (flag("sku")) for (const v of variants) v.sku = flag("sku");

  mkdirSync(dir);
  const p = { dirName, dir, meta, variants, media: {} };
  writeJSON(join(dir, "variants.json"), variants);

  const photos = flag("photos") ? flag("photos").split(",").filter(Boolean) : [];
  const names = photos.map(f => adopt(p, f.trim()));
  if (names.length) {
    p.media[defaultMediaKey(variants)] = names;
    p.meta.page = { hero: names[0] };
  }
  save(p);

  console.log(`\n  created ${relative(root, dir)}/  →  /product/${slug}   (a DRAFT: on localhost only)`);
  for (const n of notes) console.log(`  · ${n}`);
  const report = inspect(p, catalogueContext());
  for (const e of report.errors) console.log(`  ✗ ${e}`);
  for (const t of report.todo) console.log(`  □ ${t}`);
  if (!meta.description) console.log(`  ! no description yet: fill "description" in product.json`);
  console.log(`\n  next:  npm run product -- preview ${slug}     look at it, and at ${INDEX_URL}`);
  console.log(`         npm run product -- check ${slug}       what is left to do`);
  console.log(`         npm run product -- publish ${slug}     when it is ready to go live\n`);
}

/**
 * Take a draft live: remove `"draft": true`, but only once `check` is clean
 * and the build itself would accept the result.
 */
function cmdPublish(args) {
  const p = find(args.positional[0]);
  if (p.meta.hidden === true) die(`${p.meta.slug} is hidden, not a draft. Remove "hidden" by hand if that is what you mean.`);
  if (p.meta.draft !== true) {
    console.log(`\n  ${p.meta.slug} is not a draft - it is already live.\n`);
    return;
  }
  const report = inspect(p, catalogueContext());
  const blocking = [...report.errors, ...report.todo];
  if (blocking.length) {
    console.error(`\n  ✗ ${p.meta.slug} is not ready to publish:`);
    for (const e of report.errors) console.error(`      ✗ ${e}`);
    for (const t of report.todo) console.error(`      □ ${t}`);
    console.error(`\n    Fix these, then publish again. It is still a draft.\n`);
    process.exit(1);
  }

  // Written first so the build can be asked about the product as it will
  // ship, and put back if the build says no.
  const before = readFileSync(join(p.dir, "product.json"), "utf-8");
  delete p.meta.draft;
  writeJSON(join(p.dir, "product.json"), p.meta);
  const refusal = buildWouldRefuse({ drafts: false });
  if (refusal) {
    writeFileSync(join(p.dir, "product.json"), before);
    console.error(`\n  ✗ ${p.meta.slug} passes check, but the build refuses it:\n`);
    console.error(refusal.split("\n").map(l => `    ${l}`).join("\n"));
    console.error(`\n    It is still a draft.\n`);
    process.exit(1);
  }

  console.log(`\n  published ${p.meta.slug}: "draft" removed from ${relative(root, join(p.dir, "product.json"))}`);
  for (const w of report.warnings) console.log(`  ! ${w}`);
  console.log(`  It goes live with the next deploy - ship it through the feature workflow in AGENTS.md`);
  console.log(`  (npm run lint && npm run typecheck && npm run build, then the PR).\n`);
}

/**
 * Report everything the build would fail on (errors), plus what it would
 * quietly ship (warnings). Exits 1 only on errors.
 *
 * Drafts are checked like everything else. What a draft has left to fill in
 * (template placeholders) is listed as "to do" rather than as an error: the
 * build leaves a draft out, so it is not a failure yet - but `publish` will
 * refuse until the list is empty.
 */
function cmdCheck(args) {
  const ctx = catalogueContext();
  const targets = args.positional[0] ? [find(args.positional[0])] : ctx.all;
  let errors = 0;
  let todos = 0;
  let warnings = 0;
  let unusedTotal = 0;
  let drafts = 0;
  const ready = [];
  const quiet = !args.positional[0] && !args.flags.verbose;

  for (const p of targets) {
    if (p.meta.hidden) continue;
    const isDraft = p.meta.draft === true;
    if (isDraft) drafts++;
    const report = inspect(p, ctx);
    unusedTotal += report.unused.length;
    errors += report.errors.length;
    todos += report.todo.length;
    warnings += report.warnings.length;
    if (report.errors.length || report.todo.length || (!quiet && report.warnings.length) || (isDraft && !quiet)) {
      console.log(`\n${p.meta.slug || p.dirName}${isDraft ? "   (draft)" : ""}`);
      for (const e of report.errors) console.log(`  ✗ ${e}`);
      for (const t of report.todo) console.log(`  □ ${t}`);
      if (!quiet) for (const w of report.warnings) console.log(`  ! ${w}`);
      if (isDraft && !report.errors.length && !report.todo.length) ready.push(p.meta.slug);
    }
  }

  // The build has guards this file does not repeat (bundle targets must be
  // single-configuration, unavailableStains must exist, ...). Ask it directly,
  // drafts included, once everything above is clean.
  if (!errors) {
    const refusal = buildWouldRefuse({ drafts: true });
    if (refusal) {
      errors++;
      console.log(`\n  ✗ the build would refuse this catalogue:\n`);
      console.log(refusal.split("\n").map(l => `    ${l}`).join("\n"));
    }
  }

  if (!errors) for (const slug of ready) console.log(`\n  ${slug} is ready:  npm run product -- publish ${slug}`);

  console.log(
    `\n  ${targets.length} product(s): ${errors} error(s), ${warnings} warning(s)` +
      (drafts ? `, ${drafts} draft(s)${todos ? ` with ${todos} thing(s) to do before publish` : ""}` : "") +
      (unusedTotal ? `, ${unusedTotal} unused photo(s) on disk` : "") +
      (quiet && warnings ? "  (add --verbose, or name one product, to list warnings)" : "") +
      "\n"
  );
  if (errors) process.exit(1);
}

// --- preview -----------------------------------------------------------------

async function serverUp(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    return res.status;
  } catch {
    return 0;
  }
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find(c => existsSync(c)) || null;
}

/**
 * Screenshot `url` at each size by driving headless Chrome over the DevTools
 * protocol (Node's built-in WebSocket - no puppeteer dependency).
 *
 * Not `chrome --screenshot`: headless Chrome will not lay a window out
 * narrower than ~500px, so a "390px" shot was really a cropped 500px page.
 * Device-metrics emulation gives a true phone viewport, with touch, so the
 * CSS that keys off (hover: none) and max-width behaves as on a phone. An
 * iframe at phone width would too, but the site's CSP forbids being framed.
 *
 * The throwaway profile records consent as declined before the page runs, so
 * the banner does not cover the shot and nothing is captured.
 */
async function screenshots(chrome, url, shots) {
  if (typeof WebSocket === "undefined") throw new Error("needs Node 22+ (global WebSocket)");
  const profile = mkdtempSync(join(tmpdir(), "product-preview-"));
  const proc = spawn(
    chrome,
    ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
    { stdio: "ignore" }
  );
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  try {
    const portFile = join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) throw new Error("Chrome did not start");
    const port = readFileSync(portFile, "utf-8").split("\n")[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = targets.find(t => t.type === "page");

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
    let seq = 0;
    const pending = new Map();
    const waiters = new Set();
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: ok, reject: bad } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? bad(new Error(msg.error.message)) : ok(msg.result);
      } else for (const w of waiters) w(msg);
    };
    const send = (method, params = {}) =>
      new Promise((ok, bad) => {
        const id = ++seq;
        pending.set(id, { resolve: ok, reject: bad });
        ws.send(JSON.stringify({ id, method, params }));
      });
    const loaded = () =>
      new Promise(ok => {
        const w = msg => msg.method === "Page.loadEventFired" && (waiters.delete(w), ok());
        waiters.add(w);
      });

    const consentVersion = readFileSync(join(root, "src", "lib", "consent.ts"), "utf-8").match(/CONSENT_VERSION\s*=\s*(\d+)/)?.[1];
    await send("Page.enable");
    if (consentVersion) {
      const record = JSON.stringify({ v: Number(consentVersion), status: "denied", decidedAt: Date.now(), country: null });
      await send("Page.addScriptToEvaluateOnNewDocument", {
        source: `try { localStorage.setItem('hc_consent', ${JSON.stringify(record)}) } catch {}`,
      });
    }

    const written = [];
    for (const { out, width, height, mobile } of shots) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
      await send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
      const done = loaded();
      await send("Page.navigate", { url });
      await Promise.race([done, sleep(30_000)]);
      await sleep(1500); // hydration, fonts and the first slide's image
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      writeFileSync(out, Buffer.from(data, "base64"));
      written.push(out);
    }
    ws.close();
    return written;
  } finally {
    proc.kill();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }
}

async function cmdPreview(args) {
  const p = find(args.positional[0]);
  const key = typeof args.flags.finish === "string" ? args.flags.finish : null;
  if (key && !finishKeys(p).includes(key)) die(`"${key}" is not a finish of ${p.meta.slug}`);

  // 1. Regenerate the data the dev server reads, failing loudly like the build.
  // Drafts included: that is what makes a draft's page exist on localhost.
  // build-data ignores the flag under NODE_ENV=production, on Vercel and in CI.
  const build = spawnSync(process.execPath, [join(root, "scripts", "build-data.mjs"), "--include-drafts"], { encoding: "utf-8" });
  if (build.status !== 0) {
    process.stderr.write(build.stderr || build.stdout);
    die("build-data failed - fix the above, then preview again");
  }
  console.log(`  data rebuilt${p.meta.draft === true ? " (drafts included - dev only)" : ""}`);
  if (p.meta.hidden === true) die(`${p.meta.slug} is hidden, so it has no page to preview`);

  // 2. A dev server: reuse one on :PORT, otherwise start one in the background.
  const url = pageUrl(p, key);
  let status = await serverUp(`${BASE_URL}/`);
  if (!status) {
    mkdirSync(PREVIEW_DIR, { recursive: true });
    const log = join(PREVIEW_DIR, "dev-server.log");
    const child = spawn(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "dev", "-p", String(PORT)], {
      cwd: root,
      detached: true,
      stdio: ["ignore", openSync(log, "a"), openSync(log, "a")],
    });
    child.unref();
    console.log(`  started next dev on :${PORT} (pid ${child.pid}, log ${relative(root, log)}); stop it with: kill ${child.pid}`);
    for (let i = 0; i < 60 && !status; i++) {
      await new Promise(r => setTimeout(r, 1000));
      status = await serverUp(`${BASE_URL}/`);
    }
    if (!status) die(`dev server did not come up within 60s - see ${relative(root, log)}`);
  }
  // Request the page once so the route is compiled before anyone looks at it.
  const pageStatus = await serverUp(url);
  if (pageStatus !== 200) {
    die(
      `${url} answered ${pageStatus || "nothing"}` +
        (p.meta.draft === true ? `\n    Drafts only build outside production: check NODE_ENV and CI are not set in this shell.` : "")
    );
  }
  console.log(`\n  preview  ${url}${p.meta.draft === true ? "   (draft - not live)" : ""}`);
  console.log(`  index    ${INDEX_URL}   every product, drafts and hidden included\n`);

  // 3. Screenshots, so an assistant without a browser can see the result too.
  if (args.flags.screenshot) {
    const chrome = findChrome();
    if (!chrome) {
      console.log("  ! no Chrome/Chromium found for screenshots (set CHROME_PATH)");
    } else {
      mkdirSync(PREVIEW_DIR, { recursive: true });
      const shots = [
        { out: join(PREVIEW_DIR, `${p.meta.slug}-desktop.png`), width: 1440, height: 1000, mobile: false },
        { out: join(PREVIEW_DIR, `${p.meta.slug}-phone.png`), width: 390, height: 844, mobile: true },
      ];
      try {
        for (const out of await screenshots(chrome, url, shots)) console.log(`  screenshot  ${out}`);
      } catch (err) {
        console.log(`  ! screenshots failed: ${err.message}`);
      }
      console.log("");
    }
  }

  // 4. Open it for a person, unless told not to.
  if (!args.flags["no-open"] && !process.env.CI) {
    const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    spawn(opener, [url], { stdio: "ignore", detached: true, shell: process.platform === "win32" }).unref();
  }
}

// ---------------------------------------------------------------------------

const HELP = `
  Product page setup  -  playbook: docs/product-pages.md

  npm run product -- list [--json]                        every product, its category, status and page settings
  npm run product -- show <product> [--json]              where its files are, its finishes and carousel order, unused photos
  npm run product -- templates                            the starting points for a new product
  npm run product -- new "<Name>" --template <name>       start a DRAFT from a template
  npm run product -- new "<Name>" --like "<product>"      ...or with an existing product's finishes, bundle and related
  npm run product -- new "<Name>" --category C --price N  ...or as a bare single-finish product
        [--category C] [--price N] [--sku X] [--description "..."] [--collection X] [--photos a.jpg,b.jpg]
  npm run product -- set-hero <product> <photo>           lead photo: first slide, grid card, share image  (--clear to unset)
  npm run product -- add-photos <product> <photo...>      add carousel photos shown on every finish
        [--finish "<variant>||<stain>" | --finish default] ...or to one finish only
  npm run product -- remove-photo <product> <photo>       take a photo off the page (file stays on disk)
  npm run product -- check [<product>] [--verbose]        what the build would reject, what a draft still needs, what would quietly ship
  npm run product -- preview <product> [--finish K]       rebuild data (drafts included), start/reuse next dev, open the page
        [--screenshot] [--no-open]                        ...and save desktop + phone PNGs to .preview/
  npm run product -- publish <product>                    take a draft live: removes "draft" once check and the build pass

  <product> is a slug (addison-crib), folder name, or product name; a unique partial match works.
  <photo> is a file already in the product folder, or a path anywhere, which is copied in.
  A draft ("draft": true in product.json) exists on localhost only. Every product: ${INDEX_URL}
`;

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const commands = {
  list: cmdList,
  show: cmdShow,
  templates: cmdTemplates,
  new: cmdNew,
  publish: cmdPublish,
  "set-hero": cmdSetHero,
  "add-photos": cmdAddPhotos,
  "remove-photo": cmdRemovePhoto,
  check: cmdCheck,
  preview: cmdPreview,
};
if (!command || command === "help" || args.flags.help) console.log(HELP);
else if (!commands[command]) die(`Unknown command "${command}".\n${HELP}`);
else await commands[command](args);

