import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const PUBLIC = join(root, "public");
const PRODUCTS = join(PUBLIC, "data", "products");

// The site statically prerenders one page per product slug. If this script
// silently produces a short or slug-less product list, the build succeeds and
// ships a deploy where every /product/<slug> URL 404s.
//
// The original note here said those URLs were already indexed by Google and
// linked from Babylist registries. That is not true -- the site is not public
// and nothing has been added to a registry -- and it was being read as a
// standing ban on changing any product URL. The guard is still worth keeping,
// but for the plainer reason: a data-pipeline failure that empties the
// catalogue should fail the build, not ship a working-looking site with no
// products in it.
//
// This is a tripwire, not a guess: it is the exact current product count.
// Adding products raises the count and passes. Intentionally REMOVING a
// product is a deliberate one-line edit here, which is the point -- an
// accidental removal should never build.
/**
 * Collapse an accidentally repeated word ("The The Darlington features...",
 * "solid solid hardwood").
 *
 * The catalogue is clean of these today -- the six offenders were boilerplate
 * descriptions replaced during the duplicate-listing merge -- so this currently
 * collapses nothing. It stays because the copy is re-imported from a supplier
 * feed, and it reaches the product page, the meta description and the JSON-LD.
 * Normalising
 * here rather than at render time means every generated artifact is clean and
 * no component has to know about it. Each collapse is logged, so if a genuine
 * double ("had had") ever appears it will be visible in the build output
 * rather than silently rewritten.
 */
const dedupedWords = [];
function collapseRepeatedWords(text, where) {
  if (!text) return text;
  return text.replace(/\b(\w+)(\s+)\1\b/gi, (match, word, gap, offset, full) => {
    dedupedWords.push(`${where}: "${match}" -> "${word}"`);
    return word;
  });
}

/**
 * `variantType` declares what the `variant` field MEANS for a product, because
 * one field carries five different things across the catalogue: a wood species
 * ("BrownMaple"), a rug size ('5\'7" x 7\'10"'), a finish ("Asbury-Brown"), or
 * nothing at all ("Default Title", a Shopify export artifact).
 *
 * The UI used to guess this at render time by sniffing the string for quote
 * marks and "x " - which silently mislabelled every product the heuristic did
 * not anticipate, and hid the finish selector entirely on the seven products
 * whose variants were flattened to "BrownMaple / Antique Slate".
 *
 * Declaring it is only half the fix; a declaration that can drift from the data
 * is worth little, so it is checked here against the actual variant names.
 */
const WOOD_SPECIES = new Set(["brownmaple", "cherrywood", "redoak"]);
const VARIANT_TYPES = new Set(["wood", "size", "finish", "none"]);

function inferVariantType(names) {
  if (names.length === 1 && names[0] === "Default Title") return "none";
  if (names.every(n => WOOD_SPECIES.has(n.toLowerCase().replace(/\s/g, "")))) return "wood";
  if (names.every(n => n.includes('"') || /\d'/.test(n))) return "size";
  return "finish";
}

const variantTypeProblems = [];
const availabilityProblems = [];
const hiddenProblems = [];
const hiddenVariants = [];
const relationProblems = [];
function checkVariantType(dirName, declared, names) {
  if (!declared) {
    variantTypeProblems.push(`${dirName}: product.json has no variantType`);
    return;
  }
  if (!VARIANT_TYPES.has(declared)) {
    variantTypeProblems.push(`${dirName}: variantType "${declared}" is not one of ${[...VARIANT_TYPES].join(", ")}`);
    return;
  }
  // A composite "BrownMaple / Antique Slate" is the specific corruption this
  // guard exists to keep out: it reads as a finish but hides a wood.
  const composite = names.filter(n => n.includes(" / "));
  if (composite.length > 0) {
    variantTypeProblems.push(
      `${dirName}: variant names still encode wood AND finish (${composite[0]}); split them`
    );
    return;
  }
  const inferred = inferVariantType(names);
  if (inferred !== declared) {
    variantTypeProblems.push(
      `${dirName}: variantType is "${declared}" but the variant names look like "${inferred}" (${names.slice(0, 2).join(", ")})`
    );
  }
}

const MIN_EXPECTED_PRODUCTS = 67;

function fail(message) {
  console.error(`\n  FATAL: ${message}\n`);
  console.error("  Refusing to emit data artifacts. The site would build but");
  console.error("  serve 404s for product pages that are already indexed.\n");
  process.exit(1);
}

function readJSON(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (err) {
    // Surfacing this as a clean failure rather than a raw Node stack trace:
    // malformed product data is a content problem, and whoever hits it in CI
    // needs the offending path, not a module-loader trace.
    fail(`${filePath.replace(root + "/", "")} is not valid JSON\n    ${err.message}`);
  }
}

function getProductDirs() {
  if (!existsSync(PRODUCTS)) return [];
  return readdirSync(PRODUCTS).filter(name => {
    const dir = join(PRODUCTS, name);
    return statSync(dir).isDirectory() && existsSync(join(dir, "product.json")) && name !== "showroom";
  });
}

const productDirs = getProductDirs();
if (productDirs.length === 0) {
  fail(`no product directories found under ${PRODUCTS}`);
}

const inventory = [];
const productIndex = [];
const allImages = [];
const declaredRelations = [];

for (const dirName of productDirs) {
  const dir = join(PRODUCTS, dirName);
  const meta = readJSON(join(dir, "product.json"));
  const variants = readJSON(join(dir, "variants.json")) || [];
  const media = readJSON(join(dir, "media.json")) || {};

  // A directory that survived getProductDirs() has a product.json, so a null
  // here means it failed to parse. Skipping it silently would drop a product
  // from the index and 404 its already-indexed URL.
  if (!meta) fail(`${dirName}/product.json exists but could not be parsed`);

  const productName = meta.productName;

  /*
   * `hidden` withdraws a variant from the catalogue entirely, which is a
   * different thing from `unavailable`.
   *
   * `unavailable` means "we make this, you cannot order it right now": the
   * variant still emits an inventory row, still renders a selector chip, still
   * generates a URL, and shows as sold out. `hidden` means "we do not make
   * this": no row, no chip, no URL, no sitemap entry. Cherry Wood and Red Oak
   * are the latter -- the shop sells Brown Maple only, and the placeholder
   * $2499 those two carried was also dragging Moyerton's advertised price
   * below the price of the only version anyone can actually buy.
   *
   * Filtered here, once, rather than at each render site: every downstream
   * artifact is generated from this loop, so a variant dropped here is absent
   * from inventory, search, pricing, the image index and generateStaticParams
   * without any of them needing to know the concept exists.
   */
  const visibleVariants = variants.filter(v => v.hidden !== true);
  const hidden = variants.filter(v => v.hidden === true);
  if (hidden.length > 0) {
    hiddenVariants.push(`${dirName}: ${hidden.map(v => v.variant).join(", ")}`);
  }
  if (visibleVariants.length === 0 && variants.length > 0) {
    // Every route for this product is generated from its variants, so hiding
    // all of them leaves a product in the index whose every URL 404s.
    hiddenProblems.push(`${dirName}: every variant is hidden, so the product would have no page`);
  }
  const visibleNames = new Set(visibleVariants.map(v => v.variant));

  // Checked against what is actually emitted, not what is on disk: hiding the
  // two woods leaves ["BrownMaple"], which must still satisfy variantType.
  if (visibleVariants.length > 0) {
    checkVariantType(dirName, meta.variantType, visibleVariants.map(v => v.variant));
  }
  const imageBase = `/data/products/${encodeURIComponent(dirName)}/`;
  let minPrice = Infinity;

  for (const v of visibleVariants) {
    /*
     * Availability, sourced rather than invented.
     *
     * `inStock` was the literal `true` here, so all 453 stain rows in every
     * generated artifact said in-stock and none ever said otherwise. That made
     * the whole out-of-stock apparatus unreachable: the disabled swatches, the
     * "Sold Out" chips, the aria labels, the schema.org branch, and the
     * server-side rejection in src/lib/pricing.ts, which could never fire.
     *
     * Both keys are optional, because the normal state of a made-to-order
     * catalogue is that everything is orderable. Set `unavailable: true` on a
     * variant to withdraw a whole wood, or list finishes in
     * `unavailableStains` to withdraw individual ones.
     */
    const unavailable = new Set(v.unavailableStains || []);
    const stainNames = new Set(v.stains || []);
    for (const name of unavailable) {
      if (!stainNames.has(name)) {
        // Silently doing nothing is the failure mode worth catching: the finish
        // stays on sale and nobody finds out until it is ordered.
        availabilityProblems.push(
          `${dirName} / ${v.variant}: unavailableStains lists "${name}", which is not one of its stains`
        );
      }
    }

    const stains = (v.stains || []).map(stainName => {
      const mediaKey = `${v.variant}||${stainName}`;
      const images = media[mediaKey] || [];
      const firstImage = images[0] ? imageBase + images[0] : null;
      const gallery = images.slice(1).map(url => ({ url: imageBase + url }));

      return {
        name: stainName,
        inStock: v.unavailable !== true && !unavailable.has(stainName),
        priceAddition: 0,
        image: firstImage,
        gallery: gallery.length > 0 ? gallery : undefined,
      };
    });

    const bp = v.basePrice || 0;
    if (bp < minPrice) minPrice = bp;

    inventory.push({
      productName,
      wood: v.variant,
      category: meta.category || null,
      variantType: meta.variantType,
      description: collapseRepeatedWords(meta.description, `${productName}.description`) || null,
      extendedDescription:
        collapseRepeatedWords(meta.extendedDescription, `${productName}.extendedDescription`) ||
        null,
      title: meta.title || null,
      metaDescription:
        collapseRepeatedWords(meta.metaDescription, `${productName}.metaDescription`) || null,
      basePrice: bp,
      tags: meta.tags || [],
      sku: v.sku || null,
      slug: meta.slug || null,
      dimensions: v.dimensions || null,
      weight: v.weight ?? null,
      addons: meta.addons || [],
      bundle: [],
      related: [],
      stains,
    });
  }

  const firstStain = visibleVariants[0]?.stains?.[0];
  const defaultKey = firstStain ? `${visibleVariants[0].variant}||${firstStain}` : null;
  const defaultImage = defaultKey && media[defaultKey]?.[0] ? imageBase + media[defaultKey][0] : null;

  productIndex.push({
    productName,
    slug: meta.slug || null,
    category: meta.category || null,
    minPrice: minPrice === Infinity ? 0 : minPrice,
    defaultImage,
  });

  /*
   * Relations are declared as slugs and resolved in a second pass below,
   * because `bundle` routinely points forward at a product this loop has not
   * built yet -- Addison Crib names crib-mattress, and directories are read in
   * whatever order the filesystem returns.
   */
  declaredRelations.push({
    dirName,
    slug: meta.slug || null,
    bundle: meta.bundle || [],
    related: meta.related || [],
  });

  // Build the image index in this same pass. Previously this was a second loop
  // that re-read and re-parsed product.json from disk once per media entry
  // just to recover productName, which is already in hand here.
  for (const [key, paths] of Object.entries(media)) {
    const [wood, stainName] = key.split("||");
    // A hidden variant's photographs are of a product that is not for sale.
    if (!visibleNames.has(wood)) continue;
    paths.forEach((path, idx) => {
      allImages.push({
        productName,
        wood,
        stainName: stainName || null,
        path: imageBase + path,
        order: idx,
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Relations, resolved.
// ---------------------------------------------------------------------------

/*
 * `bundle` and `related` are the first relational structure in the catalogue.
 *
 * Both are arrays of slugs of OTHER products. `bundle` is what a crib needs to
 * actually be the 4-in-1 it is sold as -- the conversion rails, the bed rail
 * kit, the mattress -- and drives the "Build Your Bundle" selector. `related`
 * is the rest of the matching family, the dressers and nightstands.
 *
 * Deliberately curated per product rather than inferred from the name prefix.
 * Inference looks obvious (Addison, Mackenzie, Newport, West Lake) right up
 * until the seven cribs with no family kits at all, which have to fall back to
 * the generic rails -- and a heuristic that silently guesses wrong here puts
 * the wrong $481 kit in someone's cart.
 *
 * Resolved to whole objects here rather than at render time so that no
 * component has to look a slug up, and so an unknown slug is a build failure
 * rather than a blank row in a bundle.
 */
const bySlug = new Map(productIndex.filter(p => p.slug).map(p => [p.slug, p]));

const rowsBySlug = new Map();
for (const item of inventory) {
  if (!item.slug) continue;
  if (!rowsBySlug.has(item.slug)) rowsBySlug.set(item.slug, []);
  rowsBySlug.get(item.slug).push(item);
}

/*
 * The exact configuration a relation refers to, or null when it is ambiguous.
 *
 * A cart line is identified by product + variant + stain, so a bundle checkbox
 * has to know all three to add anything. It can only know them when the target
 * has exactly one of each - which every conversion kit and the mattress do,
 * being `variantType: "none"`. A target with real choices cannot be expressed
 * as a checkbox at all, so `bundle` rejects it rather than silently adding an
 * arbitrary finish to someone's cart.
 */
function soleConfig(slug) {
  const rows = rowsBySlug.get(slug) || [];
  if (rows.length !== 1) return null;
  const stains = rows[0].stains || [];
  if (stains.length !== 1) return null;
  return { wood: rows[0].wood, stainName: stains[0].name };
}

function resolveRelation(dirName, field, slugs, ownSlug) {
  if (!Array.isArray(slugs)) {
    relationProblems.push(`${dirName}: ${field} must be an array of product slugs`);
    return [];
  }
  const out = [];
  const seen = new Set();
  for (const slug of slugs) {
    if (slug === ownSlug) {
      relationProblems.push(`${dirName}: ${field} lists its own slug "${slug}"`);
      continue;
    }
    if (seen.has(slug)) {
      relationProblems.push(`${dirName}: ${field} lists "${slug}" twice`);
      continue;
    }
    const target = bySlug.get(slug);
    if (!target) {
      // The failure this guard exists for: a typo'd or renamed slug would
      // otherwise just disappear from the bundle, and a crib would quietly
      // stop offering its conversion kit.
      relationProblems.push(`${dirName}: ${field} names "${slug}", which is not a product slug`);
      continue;
    }
    const config = soleConfig(slug);
    if (field === 'bundle' && !config) {
      const rows = rowsBySlug.get(slug) || [];
      relationProblems.push(
        `${dirName}: bundle names "${slug}", which has ${rows.length} variant(s) and ` +
          `${rows[0]?.stains?.length ?? 0} finish(es) on the first - a bundle checkbox ` +
          `cannot choose one, so it must be a single-configuration product`
      );
      continue;
    }
    seen.add(slug);
    out.push({
      slug: target.slug,
      productName: target.productName,
      price: target.minPrice,
      image: target.defaultImage,
      category: target.category,
      // Null for a `related` target with real choices; those are links, not
      // add-to-cart controls, so the visitor picks on the product's own page.
      wood: config ? config.wood : null,
      stainName: config ? config.stainName : null,
    });
  }
  return out;
}

let bundleCount = 0;
for (const declared of declaredRelations) {
  const bundle = resolveRelation(declared.dirName, 'bundle', declared.bundle, declared.slug);
  const related = resolveRelation(declared.dirName, 'related', declared.related, declared.slug);
  if (bundle.length > 0) bundleCount++;
  // Every inventory row for this product carries the same relations: they are
  // a property of the product, not of the wood or finish chosen.
  for (const item of inventory) {
    if (item.slug === declared.slug) {
      item.bundle = bundle;
      item.related = related;
    }
  }
}

// ---------------------------------------------------------------------------
// Guards. These run before anything is written.
// ---------------------------------------------------------------------------

if (relationProblems.length > 0) {
  fail(`bundle/related do not match the catalogue:\n` + relationProblems.map(p => `    - ${p}`).join("\n"));
}

if (productIndex.length < MIN_EXPECTED_PRODUCTS) {
  fail(
    `only ${productIndex.length} products parsed, expected at least ${MIN_EXPECTED_PRODUCTS}.\n` +
      `    If a product was removed on purpose, lower MIN_EXPECTED_PRODUCTS in this file.`
  );
}

if (hiddenProblems.length > 0) {
  fail(`hidden leaves a product with no variants:\n` + hiddenProblems.map(p => `    - ${p}`).join("\n"));
}

if (availabilityProblems.length > 0) {
  fail(`unavailableStains does not match the data:\n` + availabilityProblems.map(p => `    - ${p}`).join("\n"));
}

if (variantTypeProblems.length > 0) {
  fail(`variantType does not match the data:\n` + variantTypeProblems.map(p => `    - ${p}`).join("\n"));
}

const slugless = productIndex.filter(p => !p.slug);
if (slugless.length > 0) {
  fail(
    `${slugless.length} product(s) have no slug and would be unreachable:\n` +
      slugless.map(p => `    - ${p.productName}`).join("\n")
  );
}

const slugCounts = new Map();
for (const p of productIndex) {
  slugCounts.set(p.slug, (slugCounts.get(p.slug) || 0) + 1);
}
const duplicates = [...slugCounts.entries()].filter(([, n]) => n > 1);
if (duplicates.length > 0) {
  fail(
    `duplicate slugs (later products would silently shadow earlier ones):\n` +
      duplicates.map(([slug, n]) => `    - ${slug} (x${n})`).join("\n")
  );
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

writeFileSync(join(PUBLIC, "data", "inventory.json"), JSON.stringify(inventory, null, 2) + "\n");
writeFileSync(join(PUBLIC, "data", "products.json"), JSON.stringify(productIndex, null, 2) + "\n");
writeFileSync(join(PUBLIC, "data", "images.json"), JSON.stringify(allImages, null, 2) + "\n");

// Search corpus: shipped to the browser as a lazily-imported chunk, so it holds
// only what MiniSearch indexes or what a result row renders. Deliberately not
// the full inventory.json (525 KB) and not a prebuilt MiniSearch index (larger
// than the docs, and stale-index-after-deploy becomes our problem).
const searchDocs = [];
const seenSearchDoc = new Set();
for (const item of inventory) {
  const id = `${item.productName}||${item.wood}`;
  if (seenSearchDoc.has(id)) continue;
  seenSearchDoc.add(id);
  searchDocs.push({
    id,
    productName: item.productName,
    slug: item.slug,
    wood: item.wood,
    category: item.category || "",
    stainNames: item.stains.map(s => s.name).join(" "),
    // Availability was deliberately omitted here, which meant a search result
    // could never reflect it. It can now, because it is real.
    unavailableStains: item.stains.filter(s => !s.inStock).map(s => s.name),
    description: (item.description || "").slice(0, 300),
    basePrice: item.basePrice,
    stainImages: Object.fromEntries(item.stains.map(s => [s.name, s.image || ""])),
  });
}
mkdirSync(join(root, "src", "data"), { recursive: true });
writeFileSync(join(root, "src", "data", "search-docs.json"), JSON.stringify(searchDocs) + "\n");

/*
 * Checkout recommendations: "you may also like".
 *
 * Deliberately the BUNDLE entries only, not `related`. Two reasons. A bundle
 * entry is a single-configuration product, so it can be added from the
 * checkout in one click; a related dresser has a finish to choose and would
 * have to bounce the buyer out of the checkout to pick it. And the useful
 * recommendation at this point is the $310 mattress someone forgot, not a
 * $3,000 dresser - a cart-abandoning distraction at the exact moment they
 * were about to pay.
 *
 * Keyed on productName because that is what a CartItem carries. 0.6 KB
 * gzipped, so it is handed to the page rather than fetched.
 */
const recommendations = {};
for (const item of inventory) {
  if (recommendations[item.productName]) continue;
  const recs = (item.bundle || []).map(r => ({
    slug: r.slug,
    productName: r.productName,
    price: r.price,
    image: r.image,
    wood: r.wood,
    stainName: r.stainName,
  }));
  if (recs.length > 0) recommendations[item.productName] = recs;
}
writeFileSync(
  join(root, "src", "data", "recommendations.json"),
  JSON.stringify(recommendations) + "\n"
);

// Pricing table: the only thing the payment-intent route needs. Imported
// statically by the route so it is always in the function bundle -- public/ is
// uploaded to the CDN, not traced into the lambda, so a runtime readFileSync
// of public/data/inventory.json is not reliable under Next on Vercel.
const pricing = inventory.map(item => ({
  productName: item.productName,
  wood: item.wood,
  basePrice: item.basePrice,
  addons: (item.addons || []).map(a => ({ name: a.name, price: a.price ?? 0 })),
  stains: item.stains.map(s => ({
    name: s.name,
    priceAddition: s.priceAddition || 0,
    inStock: s.inStock !== false,
  })),
}));
// data/ holds only generated output now that the stale hand-maintained copies
// of the catalogue were removed, so it will not exist in a fresh clone.
mkdirSync(join(root, "data"), { recursive: true });
writeFileSync(join(root, "data", "pricing.json"), JSON.stringify(pricing) + "\n");

console.log(`Generated from ${productDirs.length} product directories`);
if (hiddenVariants.length > 0) {
  // Logged rather than silent: a variant vanishing from the catalogue should be
  // visible in the build output, not something you discover from a 404.
  console.log(`  hid ${hiddenVariants.length} product(s)' variants:`);
  for (const h of hiddenVariants) console.log(`    ${h}`);
}
if (dedupedWords.length > 0) {
  console.log(`  collapsed ${dedupedWords.length} repeated word(s):`);
  for (const d of dedupedWords) console.log(`    ${d}`);
}
if (bundleCount > 0) {
  const items = inventory.reduce((n, i) => n + (i.bundle?.length || 0), 0);
  console.log(`  relations: ${bundleCount} product(s) with a bundle, ${items} bundle rows`);
}
const stainRows = inventory.reduce((n, i) => n + i.stains.length, 0);
const oosRows = inventory.reduce((n, i) => n + i.stains.filter(s => !s.inStock).length, 0);
console.log(`  public/data/inventory.json:  ${inventory.length} items, ${stainRows} finishes (${oosRows} unavailable)`);
console.log(`  public/data/products.json:   ${productIndex.length} products`);
console.log(`  public/data/images.json:     ${allImages.length} images`);
console.log(`  src/data/search-docs.json:   ${searchDocs.length} docs`);
console.log(`  src/data/recommendations.json: ${Object.keys(recommendations).length} products`);
console.log(`  data/pricing.json:           ${pricing.length} rows`);
