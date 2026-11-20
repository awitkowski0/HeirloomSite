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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS = join(root, "public", "data", "products");
const PREVIEW_DIR = join(root, ".preview");
const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;

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

/** The categories the taxonomy claims, read from its source. */
function knownCategories() {
  const src = readFileSync(join(root, "src", "lib", "taxonomy.ts"), "utf-8");
  const names = new Set();
  for (const m of src.matchAll(/sources:\s*\[([^\]]*)\]/g)) {
    for (const q of m[1].matchAll(/'([^']+)'/g)) names.add(q[1]);
  }
  const unlisted = src.match(/UNLISTED_CATEGORIES[^=]*=\s*\[([^\]]*)\]/);
  for (const q of unlisted?.[1].matchAll(/'([^']+)'/g) ?? []) names.add(q[1]);
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

function cmdList() {
  for (const d of productDirs()) {
    const p = load(d);
    const flags = [
      p.meta.hidden ? "hidden" : null,
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

function cmdNew(args) {
  const name = args.positional[0];
  if (!name) {
    die('Usage: new "<Product Name>" --category <Category> --price <dollars> [--sku X] [--description "..."] [--collection X] [--photos a.jpg,b.jpg]');
  }
  const categories = knownCategories();
  const category = args.flags.category;
  if (!category || !categories.includes(category)) {
    die(`--category must be one of:\n` + categories.map(c => `      ${c}`).join("\n"));
  }
  const price = Number(args.flags.price);
  if (!Number.isFinite(price) || price <= 0) die("--price is required: whole dollars, e.g. --price 1299");

  const slug = slugify(name);
  const dirName = name.replace(/\//g, "-");
  const dir = join(PRODUCTS, dirName);
  if (existsSync(dir)) die(`${relative(root, dir)} already exists`);
  const clash = productDirs().map(load).find(p => p.meta.slug === slug);
  if (clash) die(`slug ${slug} is already used by ${clash.dirName}`);

  mkdirSync(dir);
  const description = typeof args.flags.description === "string" ? args.flags.description : "";
  const meta = {
    productName: name,
    category,
    variantType: "none",
    description,
    extendedDescription: null,
    tags: [],
    addons: [],
    defaultVariant: "Default Title",
    slug,
    title: name,
    metaDescription: description.split(/(?<=\.)\s/)[0]?.slice(0, 155) || "",
    related: [],
    collection: typeof args.flags.collection === "string" ? args.flags.collection : null,
  };
  const variants = [
    {
      variant: "Default Title",
      label: "Default Title",
      stains: ["Default"],
      basePrice: price,
      sku: typeof args.flags.sku === "string" ? args.flags.sku : null,
      dimensions: null,
      weight: null,
    },
  ];
  const p = { dirName, dir, meta, variants, media: {} };
  writeJSON(join(dir, "variants.json"), variants);

  const photos = typeof args.flags.photos === "string" ? args.flags.photos.split(",").filter(Boolean) : [];
  const names = photos.map(f => adopt(p, f.trim()));
  if (names.length) {
    p.media[mediaKey("Default Title", "Default")] = names;
    p.meta.page = { hero: names[0] };
  }
  save(p);

  console.log(`\n  created ${relative(root, dir)}/  →  /product/${slug}`);
  if (!description) console.log(`  ! no --description yet: fill "description" in product.json before shipping`);
  console.log(`  next:  npm run product -- check ${slug}   then   npm run product -- preview ${slug}\n`);
}

/**
 * Report everything the build would fail on (errors), plus what it would
 * quietly ship (warnings). Exits 1 only on errors.
 */
function cmdCheck(args) {
  const targets = args.positional[0] ? [find(args.positional[0])] : productDirs().map(load);
  let errors = 0;
  let warnings = 0;
  let unusedTotal = 0;
  const quiet = !args.positional[0] && !args.flags.verbose;

  for (const p of targets) {
    if (p.meta.hidden) continue;
    const problems = checkPageMedia(p.dir, p.dirName, p.meta, p.media);
    const warns = [];
    const keys = finishKeys(p);
    const allKeys = new Set(p.variants.flatMap(v => (v.stains || []).map(s => mediaKey(v.variant, s))));
    for (const k of Object.keys(p.media)) {
      if (!allKeys.has(k)) warns.push(`media.json key "${k}" matches no finish in variants.json`);
    }
    const landing = defaultMediaKey(p.variants.filter(v => v.hidden !== true));
    if (!photosFor(p.meta, p.media, landing, true).length) warns.push("no photo at all: the page shows \"Photography coming soon\"");
    const bare = keys.filter(k => !(p.media[k] || []).length);
    if (bare.length && bare.length < keys.length) warns.push(`${bare.length} finish(es) have no photo of their own: ${bare.slice(0, 3).join(", ")}${bare.length > 3 ? ", ..." : ""}`);
    if (!p.meta.description) warns.push("description is empty");
    const unused = unusedPhotos(p.dir, p.meta, p.media);
    unusedTotal += unused.length;
    if (unused.length) warns.push(`${unused.length} unused photo(s) in the folder: ${unused.slice(0, 4).join(", ")}${unused.length > 4 ? ", ..." : ""}`);

    errors += problems.length;
    warnings += warns.length;
    if (problems.length || (!quiet && warns.length)) {
      console.log(`\n${p.meta.slug || p.dirName}`);
      for (const e of problems) console.log(`  ✗ ${e}`);
      if (!quiet) for (const w of warns) console.log(`  ! ${w}`);
    }
  }

  console.log(
    `\n  ${targets.length} product(s): ${errors} error(s), ${warnings} warning(s)` +
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
  const build = spawnSync(process.execPath, [join(root, "scripts", "build-data.mjs")], { encoding: "utf-8" });
  if (build.status !== 0) {
    process.stderr.write(build.stderr || build.stdout);
    die("build-data failed - fix the above, then preview again");
  }
  console.log("  data rebuilt");

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
  if (pageStatus !== 200) die(`${url} answered ${pageStatus || "nothing"}`);
  console.log(`\n  preview  ${url}\n`);

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

  npm run product -- list                                 every product, its category and page settings
  npm run product -- show <product> [--json]              where its files are, its finishes and carousel order, unused photos
  npm run product -- new "<Name>" --category C --price N  scaffold a single-finish product
        [--sku X] [--description "..."] [--collection X] [--photos a.jpg,b.jpg]
  npm run product -- set-hero <product> <photo>           lead photo: first slide, grid card, share image  (--clear to unset)
  npm run product -- add-photos <product> <photo...>      add carousel photos shown on every finish
        [--finish "<variant>||<stain>" | --finish default] ...or to one finish only
  npm run product -- remove-photo <product> <photo>       take a photo off the page (file stays on disk)
  npm run product -- check [<product>] [--verbose]        what the build would reject, and what it would quietly ship
  npm run product -- preview <product> [--finish K]       rebuild data, start/reuse next dev, open the page
        [--screenshot] [--no-open]                        ...and save desktop + phone PNGs to .preview/

  <product> is a slug (addison-crib), folder name, or product name; a unique partial match works.
  <photo> is a file already in the product folder, or a path anywhere, which is copied in.
`;

const [command, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
const commands = {
  list: cmdList,
  show: cmdShow,
  new: cmdNew,
  "set-hero": cmdSetHero,
  "add-photos": cmdAddPhotos,
  "remove-photo": cmdRemovePhoto,
  check: cmdCheck,
  preview: cmdPreview,
};
if (!command || command === "help" || args.flags.help) console.log(HELP);
else if (!commands[command]) die(`Unknown command "${command}".\n${HELP}`);
else await commands[command](args);

