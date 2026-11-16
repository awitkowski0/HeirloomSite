/*
 * The catalog's rules, in one place.
 *
 * `npm run catalog:check`, the two scaffolds and scripts/build-data.mjs all call
 * validateCatalog(), so what the tooling rejects and what a deploy rejects are
 * the same set. Pure JavaScript with no TypeScript import, because build-data.mjs
 * runs under plain `node` on Vercel.
 *
 * Findings have a level:
 *   error    fails the check and the build
 *   warning  printed, does not fail
 *   legacy   an error on copy that predates these rules (data/catalog-baseline.json,
 *            matched by a hash of the exact text). Editing that text makes it an error.
 */
import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const USE_TAGS = new Set(['CRIB', 'TODDLER BED', 'DAY BED', 'FULL BED', 'MINI', 'DRESSER', 'CHANGING TABLE', 'HUTCH', 'MIRROR']);

export const VARIANT_TYPES = new Set(['wood', 'size', 'finish', 'none']);
export const WOOD_SPECIES = new Set(['brownmaple', 'cherrywood', 'redoak']);

export const CRIB_CATEGORIES = new Set(['Cribs', 'Mini Cribs']);
/* In step with CASE_GOOD_CATEGORIES in src/lib/builders.ts (tests/catalog-rules.test.ts). */
export const CASE_GOOD_CATEGORIES = new Set(['Dressers', 'Chests', 'Nightstands', 'Changing Tables']);
export const BUILDER_REQUIRED_CATEGORIES = new Set([...CRIB_CATEGORIES, ...CASE_GOOD_CATEGORIES]);

export const PHOTO_RIGHTS = new Set(['heirloom-owned', 'builder-permission', 'licensed']);
export const PHOTO_WOOD_MATCH = new Set(['yes', 'no', 'unknown']);
export const MIN_IMAGE_SIDE = 800;
export const PRODUCT_COPY_FIELDS = ['title', 'metaDescription', 'description', 'extendedDescription'];

/* Keys that would carry a claim on a product. Statements live on the builder record. */
const CLAIM_KEYS = ['safety', 'safetyStatement', 'certification', 'certifications', 'madeIn', 'origin', 'countryOfOrigin'];
const PRICE_KEYS = ['price', 'basePrice', 'priceCents', 'minPrice'];

const US_STATES =
  'alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming';

/* Mirrors PRODUCT_PHRASES in tests/safety-claims-guard.test.ts so a scaffold fails before that test does. */
const SAFETY_RULES = [
  [/\bexceeds?\b[^.\n]{0,60}\b(standard|cpsc|astm|regulation)/i, 'exceeds a standard'],
  [/meets?\s+or\s+exceeds?/i, 'meets or exceeds'],
  [/rigorously tested/i, 'rigorously tested'],
  [/non[- ]?toxic/i, 'non-toxic'],
  [/baby-safe/i, 'baby-safe'],
  [/greenguard/i, 'GREENGUARD'],
  [/\bJPMA\b/i, 'JPMA'],
  [/\bCPSIA\b/i, 'CPSIA'],
  [/lead[- ]free/i, 'lead-free'],
  [/zero[- ]VOC|VOC[- ]free/i, 'VOC claim'],
  [/(cpsc|astm)[^.\n]{0,20}\b(compliant|certified|tested)\b/i, 'CPSC/ASTM compliance'],
  [/\b(compliant|certified|tested)\b[^.\n]{0,30}\b(cpsc|astm)\b/i, 'CPSC/ASTM compliance'],
  [/\bcertified\b/i, 'certified'],
  [/safety[- ]certified/i, 'safety-certified'],
  [/meets all (federal )?safety standards/i, 'meets all safety standards'],
  [/federal safety standards/i, 'federal safety standards'],
  [/\bsafe(ly|ty|st|r)?\b/i, 'safe/safety wording'],
  [/\bsecure\b|\bsecurity\b/i, 'secure/security'],
  [/\b(complete|full-length|secure) protection\b/i, 'protection claim'],
  [/prevent accidents/i, 'prevent accidents'],
  [/\bassembl\w*/i, 'assembly wording (only White Glove includes assembly)'],
  [/tool[- ]free/i, 'tool-free'],
  [/\bno gaps\b/i, 'no gaps'],
  [/fits? all convertible cribs/i, 'fits all convertible cribs'],
];

const ORIGIN_RULES = [
  [/\bmade\s+in\s+(the\s+)?(usa|u\.s\.a?\.?|america|united states)\b/i, 'Made in USA'],
  [/\bamerican\b/i, 'American-made wording'],
  [/\busa\b|\bu\.s\.a\.?(?=\W|$)/i, 'USA origin wording'],
  [/\bamish\b/i, 'Amish'],
  [new RegExp(`\\b(made|built|crafted|handcrafted|handmade|handbuilt|manufactured|produced|sourced)\\s+(right\\s+)?(here\\s+)?in\\s+(${US_STATES})\\b`, 'i'), 'state of origin'],
  [new RegExp(`\\b(${US_STATES})[- ](made|built|crafted|handcrafted)\\b`, 'i'), 'state of origin'],
];

const STOCK_RULES = [
  [/\btimeless\b/i, 'stock phrase "timeless"'],
  [/\belevat(e|es|ed|ing)\b/i, 'stock phrase "elevate"'],
  [/\bbeautifully\b/i, 'stock phrase "beautifully"'],
  [/\bstunning\b/i, 'stock phrase "stunning"'],
  [/\bexquisite(ly)?\b/i, 'stock phrase "exquisite"'],
  [/\beffortless(ly)?\b/i, 'stock phrase "effortless"'],
];

const BOILERPLATE_RULES = [
  [/Get Personal Assistance/i, 'boilerplate closing (Get Personal Assistance)'],
  [/If you would like help choosing/i, 'boilerplate closing (help choosing a finish)'],
  [/same or next business day/i, 'boilerplate closing (same or next business day)'],
];

const WOOD_WORDS = [
  [/\bbrown maple\b/gi, 'maple'],
  [/\bmaple\b/gi, 'maple'],
  [/\bcherry\b/gi, 'cherry'],
  [/\bred oak\b/gi, 'oak'],
  [/\boak\b/gi, 'oak'],
  [/\bwalnut\b/gi, 'walnut'],
  [/\bhickory\b/gi, 'hickory'],
  [/\bmahogany\b/gi, 'mahogany'],
  [/\bbirch\b/gi, 'birch'],
  [/\bpoplar\b/gi, 'poplar'],
  [/\bpine\b/gi, 'pine'],
  [/\bash\b/gi, 'ash'],
  [/\bteak\b/gi, 'teak'],
  [/\bbeech\b/gi, 'beech'],
];
const WOOD_GROUPS = new Set(WOOD_WORDS.map(([, group]) => group));

export function woodGroup(name) {
  const text = String(name).toLowerCase().replace(/wood$/, '').replace(/([a-z])(maple|oak)$/, '$1 $2');
  for (const [re, group] of WOOD_WORDS) {
    re.lastIndex = 0;
    if (re.test(text)) return group;
  }
  return WOOD_GROUPS.has(text.trim()) ? text.trim() : null;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

export const directoryNameFor = productName => String(productName).trim().replace(/\//g, '-');

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function suggest(value, options) {
  const list = [...options];
  const needle = String(value).toLowerCase();
  const stem = needle.slice(0, Math.max(3, Math.floor(needle.length / 2)));
  const near = list.filter(o => o.toLowerCase().includes(stem) || needle.includes(o.toLowerCase())).slice(0, 3);
  return near.length > 0 ? `Did you mean ${near.join(', ')}?` : '';
}

export function inferVariantType(names) {
  if (names.length === 1 && names[0] === 'Default Title') return 'none';
  if (names.every(n => WOOD_SPECIES.has(n.toLowerCase().replace(/\s/g, '')))) return 'wood';
  if (names.every(n => n.includes('"') || /\d'/.test(n))) return 'size';
  return 'finish';
}

/** Null when consistent, otherwise { code, message }. */
export function variantTypeProblem(declared, names) {
  if (!declared) return { code: 'variant-type-missing', message: 'product.json has no variantType' };
  if (!VARIANT_TYPES.has(declared)) {
    return { code: 'variant-type-invalid', message: `variantType "${declared}" is not one of ${[...VARIANT_TYPES].join(', ')}` };
  }
  const composite = names.filter(n => n.includes(' / '));
  if (composite.length > 0) {
    return { code: 'variant-composite', message: `variant names encode wood AND finish (${composite[0]}); split them` };
  }
  const inferred = inferVariantType(names);
  if (inferred !== declared) {
    return {
      code: 'variant-type-mismatch',
      message: `variantType is "${declared}" but the variant names look like "${inferred}" (${names.slice(0, 2).join(', ')})`,
    };
  }
  return null;
}

/** Dollars that convert to whole cents exactly. Prices are charged in integer cents. */
export function isCentSafe(value, { allowZero = false } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 0 || (!allowZero && value === 0)) return false;
  const cents = Math.round(value * 100);
  return Math.abs(value * 100 - cents) < 1e-6;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

export function readImageSize(file) {
  const fd = openSync(file, 'r');
  try {
    const bytes = statSync(file).size;
    const buf = Buffer.alloc(Math.min(bytes, 512 * 1024));
    readSync(fd, buf, 0, buf.length, 0);
    if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes };
    }
    if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
      let off = 2;
      while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = buf[off + 1];
        if (marker === 0xff) {
          off++;
          continue;
        }
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { format: 'jpeg', height: buf.readUInt16BE(off + 5), width: buf.readUInt16BE(off + 7), bytes };
        }
        off += 2 + buf.readUInt16BE(off + 2);
      }
    }
    return { format: 'unknown', width: 0, height: 0, bytes };
  } finally {
    closeSync(fd);
  }
}

/** Problems with one picture, as { level, code, message }. */
export function imageProblems(info) {
  if (info.missing) return [{ level: 'error', code: 'image-missing', message: 'file does not exist' }];
  if (info.format === 'unknown') {
    return [{ level: 'error', code: 'image-format', message: 'not a readable JPEG or PNG' }];
  }
  const out = [];
  const shortest = Math.min(info.width, info.height);
  if (shortest < MIN_IMAGE_SIDE) {
    out.push({
      level: 'error',
      code: 'image-too-small',
      message: `${info.width}x${info.height} is under the ${MIN_IMAGE_SIDE}px minimum on its short side`,
    });
  }
  const ratio = Math.max(info.width, info.height) / Math.max(1, shortest);
  if (ratio > 3) out.push({ level: 'warning', code: 'image-aspect', message: `${info.width}x${info.height} is an extreme aspect ratio` });
  if (info.bytes > 15 * 1024 * 1024) out.push({ level: 'warning', code: 'image-huge', message: `${Math.round(info.bytes / 1048576)}MB; resize before adding` });
  return out;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

function readJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) };
  } catch (error) {
    return { error: error.message };
  }
}

function stripTsComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** The two vocabularies the TypeScript sources own, read as text (see the header note). */
export function readVocabulary(root) {
  const taxonomy = stripTsComments(readFileSync(join(root, 'src/lib/taxonomy.ts'), 'utf8'));
  const categories = new Set();
  const addStrings = block => {
    for (const m of block.matchAll(/['"]([^'"]+)['"]/g)) categories.add(m[1]);
  };
  for (const m of taxonomy.matchAll(/sources:\s*\[([^\]]*)\]/g)) addStrings(m[1]);
  addStrings(taxonomy.match(/UNLISTED_CATEGORIES[^=]*=\s*\[([\s\S]*?)\]/)?.[1] ?? '');
  const styles = stripTsComments(readFileSync(join(root, 'src/lib/crib-styles.ts'), 'utf8'));
  return { categories, styles: new Set([...styles.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1])) };
}

export function loadBuilders(root) {
  const dir = join(root, 'data', 'builders');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => {
      const parsed = readJson(join(dir, name));
      const banner = parsed.value?.banner;
      // A banner's file is read here so the rules can stay pure. Paths are public URLs, so %20 for a space.
      const bannerInfo = typeof banner?.image === 'string' ? imageInfo(join(root, 'public', decodeURI(banner.image))) : undefined;
      return { fileId: name.replace(/\.json$/, ''), record: parsed.value, parseError: parsed.error, bannerInfo };
    });
}

/** Builder records in display order, as build-data.mjs emits them. */
export function normaliseBuilders(entries) {
  return entries
    .map(e => e.record)
    .sort((a, b) => a.order - b.order)
    .map(record => ({ ...record, href: `/builders/${record.id}` }));
}

function imageInfo(file) {
  if (!existsSync(file)) return { missing: true };
  try {
    return readImageSize(file);
  } catch {
    return { format: 'unknown', width: 0, height: 0, bytes: 0 };
  }
}

export function loadCatalog(root, { images = true } = {}) {
  const productsDir = join(root, 'public', 'data', 'products');
  const products = [];
  for (const dirName of readdirSync(productsDir)) {
    const dir = join(productsDir, dirName);
    if (dirName === 'showroom' || !statSync(dir).isDirectory() || !existsSync(join(dir, 'product.json'))) continue;
    const meta = readJson(join(dir, 'product.json'));
    const variants = existsSync(join(dir, 'variants.json')) ? readJson(join(dir, 'variants.json')) : { value: [] };
    const media = existsSync(join(dir, 'media.json')) ? readJson(join(dir, 'media.json')) : { value: {} };
    const product = {
      dirName,
      meta: meta.value,
      variants: variants.value,
      media: media.value,
      parseError: meta.error || variants.error || media.error || null,
      imageFiles: {},
    };
    if (images && product.media) {
      for (const list of Object.values(product.media)) {
        for (const file of list) product.imageFiles[file] = imageInfo(join(dir, file));
      }
    }
    products.push(product);
  }
  const baseline = readJson(join(root, 'data', 'catalog-baseline.json')).value ?? { legacySlugs: [], copy: {} };
  const buildersDir = join(root, 'src', 'app', 'builders');
  const builderPages = new Set(
    existsSync(buildersDir)
      ? readdirSync(buildersDir).filter(n => !n.startsWith('[') && statSync(join(buildersDir, n)).isDirectory())
      : []
  );
  const nextConfig = existsSync(join(root, 'next.config.ts')) ? readFileSync(join(root, 'next.config.ts'), 'utf8') : '';
  return {
    products,
    builders: loadBuilders(root),
    vocabulary: readVocabulary(root),
    liveSlugs: new Set(readJson(join(root, 'data', 'live-slugs.json')).value ?? []),
    legacySlugs: new Set(baseline.legacySlugs ?? []),
    legacyCopy: baseline.copy ?? {},
    builderPages,
    nextConfig,
  };
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

function firstMatch(text, rules, code) {
  const out = [];
  for (const [re, label] of rules) {
    const m = text.match(re);
    if (m) out.push({ code, label, match: m[0] });
  }
  return out;
}

/** Claims and stock wording in text written in Heirloom's voice. */
export function copyProblems(text, { soldWoods = null, stripNames = [], boilerplate = true } = {}) {
  if (typeof text !== 'string' || text.trim() === '') return [];
  const problems = [
    ...firstMatch(text, SAFETY_RULES, 'copy-safety-claim'),
    ...firstMatch(text, ORIGIN_RULES, 'copy-origin-claim'),
    ...firstMatch(text, STOCK_RULES, 'copy-stock-phrase'),
    ...(boilerplate ? firstMatch(text, BOILERPLATE_RULES, 'copy-boilerplate') : []),
  ];
  const placeholder = text.match(/<[A-Za-z][^>]*>|\bREPLACE\b|\bTODO\b|lorem ipsum/);
  if (placeholder) problems.push({ code: 'copy-placeholder', label: 'placeholder text', match: placeholder[0] });
  if (soldWoods) {
    let scrubbed = text;
    for (const name of stripNames) {
      if (name) scrubbed = scrubbed.split(name).join(' ');
    }
    for (const [re, group] of WOOD_WORDS) {
      if (soldWoods.has(group)) continue;
      re.lastIndex = 0;
      const hit = re.exec(scrubbed);
      if (hit) problems.push({ code: 'copy-unsold-wood', label: `names ${hit[0]}, which this product is not sold in`, match: hit[0] });
    }
  }
  return problems;
}

function soldWoodGroups(product, builder) {
  const { meta, variants } = product;
  const declared = Array.isArray(meta.soldWoods) ? meta.soldWoods.map(woodGroup).filter(Boolean) : null;
  if (declared) return new Set(declared);
  const groups = new Set();
  // Products that predate soldWoods are priced from the builder's base column.
  const base = builder?.sku?.baseMaterial ? woodGroup(builder.sku.baseMaterial) : null;
  if (base) groups.add(base);
  for (const v of variants) {
    if (v.hidden === true) continue;
    if (meta.variantType === 'wood') {
      const group = woodGroup(v.variant);
      if (group) groups.add(group);
    }
    const sku = String(v.sku ?? '').match(/-(BrownMaple|CherryWood|RedOak)_/i)?.[1];
    if (sku) groups.add(woodGroup(sku));
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validateQuote(push, where, quote, { safety = false, builderName = '' } = {}) {
  if (quote === null) return;
  if (typeof quote !== 'object' || typeof quote.text !== 'string' || quote.text.trim() === '') {
    push('error', safety ? 'safety-invalid' : 'quote-invalid', where, 'must be null or { text, source }', 'Set it to null when nothing is on file. Never fill the gap.');
    return;
  }
  const source = typeof quote.source === 'string' ? quote.source.trim() : '';
  if (!source) {
    push(
      'error',
      safety ? 'safety-no-source' : 'quote-no-source',
      where,
      safety ? 'safety statement has no named source document' : 'quote has no named source',
      'Add `source` naming the builder document it was copied from word for word, or set this statement to null.'
    );
    return;
  }
  if (/^https?:|www\.|\.com\b/i.test(source)) {
    push('error', 'quote-source-url', where, `source is a web address (${source})`, 'Name the document in `source` and put the address in `sourceUrl` with `retrievedOn` (YYYY-MM-DD).');
  }
  if (quote.sourceUrl !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(quote.retrievedOn ?? ''))) {
    push('error', 'quote-source-undated', where, 'sourceUrl has no retrievedOn date', 'Add `retrievedOn` as YYYY-MM-DD.');
  }
  if (source.toLowerCase() === builderName.toLowerCase()) {
    push(safety ? 'error' : 'warning', 'quote-source-vague', where, `source only names the builder ("${source}"), not a document`, 'Name the catalog, letter or page it came from.');
  }
  const words = new Set(quote.text.toLowerCase().replace(/[(),.]/g, ' ').split(/\s+/).filter(Boolean));
  for (const chip of quote.features ?? []) {
    for (const word of chip.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter(Boolean)) {
      if (!words.has(word)) {
        push('error', 'quote-chip-not-verbatim', where, `chip "${chip}" uses "${word}", which is not in the quote`, 'Chips may only reuse the words of the statement.');
      }
    }
  }
}

function validateBuilders(catalog, push) {
  const seenPrefix = new Map();
  const seenName = new Map();
  for (const entry of catalog.builders) {
    const where = `data/builders/${entry.fileId}.json`;
    if (entry.parseError) {
      push('error', 'builder-json', where, `invalid JSON: ${entry.parseError}`, 'Fix the JSON.');
      continue;
    }
    const b = entry.record;
    if (b.id !== entry.fileId || !KEBAB.test(String(b.id))) {
      push('error', 'builder-id', where, `id "${b.id}" must be kebab-case and match the file name`, `Rename the file or set id to "${entry.fileId}".`);
    }
    for (const field of ['name', 'based', 'background', 'leadTime']) {
      if (typeof b[field] !== 'string' || b[field].trim() === '') {
        push('error', 'builder-field', where, `${field} is required`, 'Fill it in from the builder.');
      }
    }
    if (typeof b.based === 'string' && !/^[^,]+, [^,]+$/.test(b.based)) {
      push('error', 'builder-based', where, `based "${b.based}" must read "City, State"`, 'The shop browser reads the state from it.');
    }
    if (!Number.isInteger(b.leadWeeksMax) || b.leadWeeksMax <= 0) {
      push('error', 'builder-field', where, 'leadWeeksMax must be a positive whole number', 'Use the top of the quoted lead time.');
    }
    if (!Number.isFinite(b.order)) push('error', 'builder-field', where, 'order must be a number', 'It sets the display order.');
    if (typeof b.listed !== 'boolean') push('error', 'builder-field', where, 'listed must be true or false', 'False while pieces are on request only.');
    if (seenName.has(b.name)) push('error', 'builder-duplicate', where, `name duplicates ${seenName.get(b.name)}`, 'Two records cannot be one builder.');
    seenName.set(b.name, entry.fileId);

    const sku = b.sku;
    if (!sku || typeof sku.prefix !== 'string' || !/^[A-Z0-9]+$/.test(sku.prefix) || typeof sku.brand !== 'string' || !sku.brand.trim()) {
      push('error', 'builder-sku', where, 'sku needs an uppercase prefix and a brand', 'The prefix is the first token of every SKU; the brand goes in the Merchant feed.');
    } else {
      if (/heirloom/i.test(sku.brand)) push('error', 'builder-sku', where, 'sku.brand cannot be the store name', 'Google Shopping treats the brand as the manufacturer.');
      if (seenPrefix.has(sku.prefix)) push('error', 'builder-duplicate', where, `sku prefix ${sku.prefix} duplicates ${seenPrefix.get(sku.prefix)}`, 'Choose another prefix.');
      seenPrefix.set(sku.prefix, entry.fileId);
      const days = sku.handlingDays;
      if (!days || !Number.isInteger(days.min) || !Number.isInteger(days.max) || days.min <= 0 || days.max < days.min) {
        push('error', 'builder-sku', where, 'sku.handlingDays needs min and max business days', 'From the lead time the builder quotes.');
      }
    }

    if (!b.intro) push('error', 'quote-invalid', `${where} intro`, 'intro is required', "Use a sentence in the builder's own words; stop and ask if none exists.");
    validateQuote(push, `${where} intro`, b.intro ?? null, { builderName: b.name });
    for (const field of ['construction', 'setup']) {
      if (!(field in b)) push('error', 'quote-invalid', `${where} ${field}`, 'must be present', 'Set it to null when nothing is on file.');
      validateQuote(push, `${where} ${field}`, b[field] ?? null, { builderName: b.name });
    }
    validateStory(push, where, b);
    if (!b.safety || typeof b.safety !== 'object') {
      push('error', 'safety-invalid', `${where} safety`, 'safety must be { crib, caseGoods }', 'Set both to null when nothing is on file.');
    } else {
      for (const field of ['crib', 'caseGoods']) {
        if (!(field in b.safety)) push('error', 'safety-invalid', `${where} safety.${field}`, 'must be present', 'Set it to null when nothing is on file.');
        validateQuote(push, `${where} safety.${field}`, b.safety[field] ?? null, { safety: true, builderName: b.name });
      }
    }
    const constructionWords = new Set(String(b.construction?.text ?? '').toLowerCase().replace(/[(),.]/g, ' ').split(/\s+/).filter(Boolean));
    for (const group of ['crib', 'caseGoods']) {
      for (const chip of b.buildFeatures?.[group] ?? []) {
        for (const word of chip.toLowerCase().split(/\s+/)) {
          if (!constructionWords.has(word)) push('error', 'quote-chip-not-verbatim', `${where} buildFeatures.${group}`, `chip "${chip}" uses "${word}", which is not in the construction quote`, 'Chips may only reuse the words of the statement.');
        }
      }
    }
    for (const problem of copyProblems(b.background, { boilerplate: false })) {
      push('error', problem.code, `${where} background`, `${problem.label} ("${problem.match}")`, "This line is in Heirloom's voice. State only what a builder document shows.");
    }

    validateBanner(push, where, b, entry.bannerInfo);

    if (catalog.builderPages.has(b.id)) {
      push('error', 'builder-page', where, `src/app/builders/${b.id}/ exists and would shadow the generated store`, 'Delete that folder. Stores are generated from the record.');
    }
  }
}

/* Names a wood a banner caption must not assert: what a photo shows is not always what is sold. */
const BANNER_WOOD = /\b(maple|cherry|oak|walnut|hickory|elm|ash|pine|quartersawn|birch|poplar|mahogany)\b/i;

/* The story is the builder's words, but a claim that needs review belongs on a field that gets one. */
const STORY_CLAIM = /\b(safe|safely|safety|non[- ]?toxic|voc|cpsc|cpsia|astm|jpma|certif\w*|tested|complian\w*|compliant|greenguard|lead[- ]free|made in|american|amish)\b/i;

function validateStory(push, where, b) {
  if (b.story === undefined) return;
  if (!Array.isArray(b.story)) {
    push('error', 'story-invalid', `${where} story`, 'story must be a list of { text, source }', 'Remove the key when nothing is on file. Never fill the gap.');
    return;
  }
  b.story.forEach((entry, i) => {
    const at = `${where} story[${i}]`;
    if (entry === null || typeof entry !== 'object') {
      push('error', 'story-invalid', at, 'must be { text, source }', "Copy the builder's words from a named document.");
      return;
    }
    validateQuote(push, at, entry, { builderName: b.name });
    const claim = String(entry.text ?? '').match(STORY_CLAIM);
    if (claim) push('error', 'story-claim', at, `story uses "${claim[0]}"`, 'Safety and materials statements go in safety or construction; origin and Amish claims stay off the site. Stop and ask.');
  });
}

function validateBanner(push, where, b, info) {
  if (b.banner === undefined) return;
  const banner = b.banner;
  const at = `${where} banner`;
  if (!banner || typeof banner !== 'object' || typeof banner.image !== 'string' || typeof banner.alt !== 'string') {
    push('error', 'banner-invalid', at, 'banner must be { image, alt }', 'Remove the key for a banner with no photo; the banner is then the name and quote alone.');
    return;
  }
  if (!/^\/(data\/products|images\/builders)\//.test(banner.image)) {
    push('error', 'banner-invalid', at, `image "${banner.image}" must be a catalog photo under /data/products/ or /images/builders/`, 'Use a real catalog photo with no loose bedding, pillows or toys in a crib, and no generated room scene.');
  } else if (!/\.(jpe?g|png|webp)$/i.test(banner.image)) {
    push('error', 'banner-invalid', at, 'image must be a jpg, png or webp', 'Use a catalog photo.');
  } else if (info?.missing) {
    push('error', 'banner-missing', at, `no file at public${banner.image}`, 'Check the path; spaces are written %20.');
  } else if (info && Math.min(info.width, info.height) < 800) {
    push('error', 'banner-small', at, `image is ${info.width}x${info.height}, under 800px on its short side`, 'Get a larger original from the builder.');
  }
  const alt = banner.alt.trim();
  if (!alt) push('error', 'banner-invalid', at, 'alt is required', 'Describe what the photo shows.');
  if (alt.length > 140) push('error', 'banner-invalid', at, 'alt is over 140 characters', 'Keep it to what the photo shows.');
  const withoutName = alt.replaceAll(b.name ?? '', ' ').replaceAll(b.sku?.brand ?? '', ' ');
  const wood = withoutName.match(BANNER_WOOD);
  if (wood) push('error', 'banner-wood', at, `alt names a wood ("${wood[0]}")`, 'Describe the shape. What a photo shows is not always the wood that is sold.');
  for (const problem of copyProblems(alt, { boilerplate: false })) {
    push('error', problem.code, at, `${problem.label} ("${problem.match}")`, 'Describe only what the photo shows.');
  }
}

function validateProduct(catalog, product, push, ctx) {
  const { dirName, meta, variants, media } = product;
  const where = dirName;
  if (product.parseError) {
    push('error', 'product-json', where, `invalid JSON: ${product.parseError}`, 'Fix the JSON.');
    return;
  }
  if (/[/\\]|^\.|\.\./.test(dirName)) {
    push('error', 'directory-name', where, 'directory name cannot contain a slash or dots at the start', 'Replace "/" with "-"; productName keeps the real name.');
  }
  const slug = meta.slug;
  if (typeof slug !== 'string' || !KEBAB.test(slug)) {
    push('error', 'slug-invalid', where, `slug ${JSON.stringify(slug)} is not kebab-case`, 'Every product is prerendered at /product/<slug>.');
  } else if (catalog.products.filter(p => p.meta?.slug === slug).length > 1) {
    push('error', 'slug-collision', where, `slug "${slug}" is used by more than one product`, 'Pick a different slug for the new product. Never rename the live one.');
  }
  if (meta.hidden === true) return;

  const isLegacy = catalog.legacySlugs.has(slug);
  const visible = (variants ?? []).filter(v => v.hidden !== true);
  const names = visible.map(v => v.variant);

  if (typeof meta.productName !== 'string' || !meta.productName.trim()) {
    push('error', 'product-field', where, 'productName is required', 'Add the product name.');
  }
  if (!catalog.vocabulary.categories.has(meta.category)) {
    push('error', 'category-unknown', where, `category "${meta.category}" is not in src/lib/taxonomy.ts`, `Use one of: ${[...catalog.vocabulary.categories].join(', ')}.`);
  }
  if (visible.length === 0) {
    push('error', 'variants-none', where, 'no visible variants, so the product has no page', 'Add a variant, or use "hidden": true to withdraw it.');
  } else {
    const problem = variantTypeProblem(meta.variantType, names);
    if (problem) push('error', problem.code, where, problem.message, 'Declare wood, size, finish or none, and keep one concept per variant name.');
  }

  // Builder and style
  if (!('builder' in meta)) {
    push('error', 'builder-missing', where, 'product.json has no "builder" key', 'Set a builder id, or null where no builder is on file.');
  } else if (meta.builder === null) {
    if (BUILDER_REQUIRED_CATEGORIES.has(meta.category)) {
      push('error', 'builder-required', where, `${meta.category} cannot ship without a builder`, 'Add the builder record first (npm run catalog:add-builder).');
    }
  } else if (!ctx.builderIds.has(meta.builder)) {
    push('error', 'builder-unknown', where, `builder "${meta.builder}" is not on file. ${suggest(meta.builder, ctx.builderIds)}`.trim(), `Add it with npm run catalog:add-builder, or use one of: ${[...ctx.builderIds].join(', ')}.`);
  } else if (!isLegacy) {
    const record = ctx.buildersById.get(meta.builder);
    const prefix = record?.sku?.prefix;
    for (const v of visible) {
      if (prefix && String(v.sku ?? '').split(/[\s-]/)[0]?.toUpperCase() !== prefix) {
        push('error', 'sku-prefix', `${where} / ${v.variant}`, `sku "${v.sku}" must start with ${prefix}-`, 'The prefix drives the Merchant feed brand and JSON-LD handling time.');
      }
    }
    if (record && !record.listed) {
      push('warning', 'builder-unlisted', where, `builder "${meta.builder}" is listed: false`, 'Set "listed": true in its record once its pieces are on the site.');
    }
  }

  if (CRIB_CATEGORIES.has(meta.category)) {
    if (!catalog.vocabulary.styles.has(meta.style)) {
      push('error', 'style-invalid', where, `style ${JSON.stringify(meta.style)} is not valid for a crib`, `Use one of: ${[...catalog.vocabulary.styles].join(', ')}.`);
    }
  } else if (meta.style !== undefined && meta.style !== null) {
    push('error', 'style-not-applicable', where, 'only cribs carry a style', 'Remove the style key.');
  }

  // What it can be. Each tag has to be backed by the product's own record.
  const uses = meta.uses === undefined ? [] : meta.uses;
  if (!Array.isArray(uses)) {
    push('error', 'uses-invalid', where, 'uses must be an array of tags', `Use tags from: ${[...USE_TAGS].join(', ')}.`);
  } else {
    if (meta.category === 'Cribs' || meta.category === 'Mini Cribs') {
      if (meta.uses === undefined) push('error', 'uses-missing', where, 'a crib must declare uses', 'Add uses, for example ["CRIB", "TODDLER BED", "FULL BED"].');
    }
    const kits = [...(meta.bundle ?? []), ...(meta.includes ?? [])].join(' ');
    for (const tag of uses) {
      if (!USE_TAGS.has(tag)) {
        push('error', 'uses-invalid', where, `uses tag ${JSON.stringify(tag)} is not allowed`, `Use tags from: ${[...USE_TAGS].join(', ')}. There is no bassinet tag: no product is a bassinet.`);
      }
    }
    const refuse = (message, fix) => push('error', 'uses-unsupported', where, message, fix);
    if (uses.includes('CRIB') && meta.category !== 'Cribs') refuse('CRIB is for full-size cribs', 'Use MINI on a mini crib.');
    if ((uses.includes('TODDLER BED') || uses.includes('DAY BED')) && !(meta.category === 'Cribs' && /toddler/.test(kits))) refuse('a toddler or day bed tag needs a toddler kit in this crib\'s bundle', 'Add the kit or remove the tag.');
    if (uses.includes('FULL BED') && !(meta.category === 'Cribs' && /full-bed/.test(kits))) refuse('FULL BED needs a full bed kit in this crib\'s bundle', 'Add the kit or remove the tag.');
    if (uses.includes('MINI') && meta.category !== 'Mini Cribs') refuse('MINI is for mini cribs', 'Remove the tag.');
    if (uses.includes('CHANGING TABLE') && !/changing/i.test(meta.productName ?? '')) refuse('CHANGING TABLE needs a changing table in the product name', 'Remove the tag.');
    if (uses.includes('HUTCH') && !/hutch/i.test(meta.productName ?? '')) refuse('HUTCH needs a hutch in the product name', 'Remove the tag.');
    if (uses.includes('MIRROR') && !/mirror/i.test(meta.productName ?? '')) refuse('MIRROR needs a mirror in the product name', 'Remove the tag.');
    if (uses.includes('DRESSER') && meta.category === 'Changing Tables' && !meta.usesCredit) refuse('a changing table sold as a dresser needs usesCredit naming the builder', 'Add usesCredit with the builder\'s statement.');
  }

  // Prices
  for (const key of PRICE_KEYS) {
    if (key in meta) push('error', 'price-misplaced', where, `product.json has "${key}"`, 'Prices live only in variants.json basePrice. The client never sends a price.');
  }
  for (const key of CLAIM_KEYS) {
    if (key in meta) push('error', 'claim-field', where, `product.json has "${key}"`, 'Statements belong on the builder record, with a named document.');
  }
  for (const v of visible) {
    if (!isCentSafe(v.basePrice)) {
      push('error', 'price-invalid', `${where} / ${v.variant}`, `basePrice ${JSON.stringify(v.basePrice)} is not a positive dollar amount with at most two decimals`, 'Example: 1950 or 1759.20.');
    }
    if (!Array.isArray(v.stains) || v.stains.length === 0) {
      push('error', 'variant-stains', `${where} / ${v.variant}`, 'variant has no stains', 'List at least one (the mattress uses "Default").');
    }
  }
  for (const a of meta.addons ?? []) {
    if (!isCentSafe(a.price ?? 0, { allowZero: true })) push('error', 'price-invalid', `${where} addon "${a.name}"`, `price ${JSON.stringify(a.price)} is not cent-safe`, 'Use dollars with at most two decimals.');
  }
  for (const [target, price] of Object.entries(meta.bundlePriceOverrides ?? {})) {
    if (!isCentSafe(price)) push('error', 'price-invalid', `${where} bundlePriceOverrides.${target}`, `${JSON.stringify(price)} is not a positive cent-safe amount`, 'Use dollars with at most two decimals.');
  }

  // Relations
  for (const field of ['includes', 'bundle', 'related']) {
    const slugs = meta[field] ?? [];
    if (!Array.isArray(slugs)) {
      push('error', 'relation-invalid', where, `${field} must be an array of slugs`, 'Use product slugs.');
      continue;
    }
    if (new Set(slugs).size !== slugs.length) push('error', 'relation-invalid', where, `${field} lists a slug twice`, 'Remove the duplicate.');
    for (const target of slugs) {
      if (target === slug) {
        push('error', 'relation-self', where, `${field} lists its own slug`, 'Remove it.');
      } else if (ctx.hiddenSlugs.has(target)) {
        continue;
      } else if (!ctx.visibleBySlug.has(target)) {
        push('error', 'relation-unknown', where, `${field} names "${target}", which is not a product slug. ${suggest(target, ctx.visibleBySlug.keys())}`.trim(), 'Use an existing slug.');
      } else if (field === 'bundle') {
        const t = ctx.visibleBySlug.get(target);
        const rows = t.variants.filter(v => v.hidden !== true);
        if (rows.length !== 1 || (rows[0].stains ?? []).length !== 1) {
          push('error', 'relation-bundle-choice', where, `bundle names "${target}", which has real choices`, 'A bundle row must be a single-configuration product; use `related` instead.');
        }
      }
    }
  }
  for (const list of ['bundleOptional', 'bundleUnchecked']) {
    for (const target of meta[list] ?? []) {
      if (!(meta.bundle ?? []).includes(target)) push('error', 'relation-invalid', where, `${list} names "${target}", which is not in its bundle`, 'Add it to bundle or remove it here.');
    }
  }
  for (const target of Object.keys(meta.bundlePriceOverrides ?? {})) {
    if (!(meta.bundle ?? []).includes(target)) push('error', 'relation-invalid', where, `bundlePriceOverrides names "${target}", which is not in its bundle`, 'Add it to bundle or remove the override.');
  }

  // Copy
  const copyFields = PRODUCT_COPY_FIELDS.filter(f => typeof meta[f] === 'string');
  const soldWoods = soldWoodGroups(product, ctx.buildersById.get(meta.builder));
  const stripNames = [...ctx.builderNames, meta.productName, meta.collection].filter(Boolean);
  for (const field of copyFields) {
    const text = meta[field];
    const legacy = catalog.legacyCopy[slug]?.[field] === sha256(text);
    const closing = field === 'description' ? text.trim().split(/\n\s*\n/).pop()?.trim() : null;
    const problems = copyProblems(text, { soldWoods, stripNames });
    if (closing && text.includes('\n') && (ctx.closingCounts.get(closing) ?? 0) > 1 && !problems.some(p => p.code === 'copy-boilerplate')) {
      problems.push({ code: 'copy-boilerplate', label: 'closing paragraph is shared with other products', match: closing.slice(0, 50) });
    }
    for (const problem of problems) {
      push(
        legacy ? 'legacy' : 'error',
        problem.code,
        `${where} ${field}`,
        `${problem.label} ("${problem.match}")`,
        problem.code === 'copy-unsold-wood' ? 'Remove the wood, or correct soldWoods/variants.' : 'Rewrite with specifics from the builder document. Safety and origin words belong only in a sourced builder quote.'
      );
    }
  }
  for (const tag of meta.tags ?? []) {
    for (const problem of copyProblems(String(tag), { soldWoods: null, boilerplate: false })) {
      push('error', problem.code, `${where} tags`, `${problem.label} ("${problem.match}")`, 'Remove the tag.');
    }
  }

  // Intake
  if (!isLegacy) {
    for (const field of ['title', 'metaDescription', 'description']) {
      if (typeof meta[field] !== 'string' || meta[field].trim() === '') {
        push('error', 'product-field', where, `${field} is required`, 'Write factual copy from the builder document.');
      }
    }
    if (BUILDER_REQUIRED_CATEGORIES.has(meta.category)) {
      if (!Array.isArray(meta.soldWoods) || meta.soldWoods.length === 0) {
        push('error', 'sold-woods-missing', where, 'soldWoods is required on furniture', 'List the wood(s) this product is sold in, e.g. ["Brown Maple"].');
      } else {
        for (const w of meta.soldWoods) {
          if (!woodGroup(w)) push('error', 'sold-woods-invalid', where, `soldWoods has unknown wood "${w}"`, 'Use a real species name.');
        }
        if (meta.variantType === 'wood') {
          const fromVariants = new Set(names.map(woodGroup));
          if (soldWoods.size !== fromVariants.size || [...soldWoods].some(g => !fromVariants.has(g))) {
            push('error', 'sold-woods-mismatch', where, 'soldWoods does not match the wood variants', 'They must be the same woods.');
          }
        }
      }
    }
    const photos = meta.photos;
    if (!photos || typeof photos !== 'object') {
      push('error', 'photos-missing', where, 'photos intake record is required', 'Add photos { rights, rightsSource, matchesSoldWood }.');
    } else {
      if (!PHOTO_RIGHTS.has(photos.rights)) {
        push('error', 'photos-rights', where, `photos.rights ${JSON.stringify(photos.rights)} is not on file`, `Use ${[...PHOTO_RIGHTS].join(', ')}. Stop and ask if the rights are not known.`);
      }
      if (typeof photos.rightsSource !== 'string' || !photos.rightsSource.trim()) {
        push('error', 'photos-rights', where, 'photos.rightsSource is required', 'Name the permission, invoice or license. No private contact details: this file is public.');
      }
      if (!PHOTO_WOOD_MATCH.has(photos.matchesSoldWood)) {
        push('error', 'photos-wood', where, `photos.matchesSoldWood must be ${[...PHOTO_WOOD_MATCH].join(', ')}`, 'Compare the photographed wood to soldWoods.');
      } else if (photos.matchesSoldWood !== 'yes') {
        push('warning', 'photos-wood', where, `photos do not confirm the sold wood (matchesSoldWood: ${photos.matchesSoldWood})`, 'Replace the photos, or tell the shop before this goes live.');
      }
    }
  }

  // Images
  const stains = new Set();
  for (const v of visible) for (const s of v.stains ?? []) stains.add(`${v.variant}||${s}`);
  const haveKeys = new Set(Object.keys(media ?? {}));
  for (const [file, info] of Object.entries(product.imageFiles ?? {})) {
    for (const problem of imageProblems(info)) {
      const level = isLegacy && problem.code !== 'image-missing' ? 'warning' : problem.level;
      push(level, problem.code, `${where} ${file}`, problem.message, 'Get a larger original from the builder.');
    }
  }
  if (!isLegacy) {
    for (const key of haveKeys) {
      if (!stains.has(key)) push('error', 'media-key', where, `media.json key "${key}" is not a visible variant and stain`, 'Keys are "<variant>||<stain>".');
    }
    for (const key of stains) {
      if (!haveKeys.has(key)) push('warning', 'media-no-photo', where, `no photo for ${key}`, 'That finish will show without an image until one is added.');
    }
  }
}

/** Everything wrong with the catalog, as a flat list of findings. */
export function validateCatalog(catalog) {
  const findings = [];
  const push = (level, code, where, message, fix) => findings.push({ level, code, where, message, fix });

  validateBuilders(catalog, push);

  const buildersById = new Map(catalog.builders.filter(b => b.record).map(b => [b.record.id, b.record]));
  const ctx = {
    buildersById,
    builderIds: new Set(buildersById.keys()),
    builderNames: [...buildersById.values()].flatMap(b => [b.name, b.sku?.brand]),
    hiddenSlugs: new Set(catalog.products.filter(p => p.meta?.hidden === true && p.meta.slug).map(p => p.meta.slug)),
    visibleBySlug: new Map(catalog.products.filter(p => p.meta && p.meta.hidden !== true && p.meta.slug).map(p => [p.meta.slug, p])),
    closingCounts: new Map(),
  };
  for (const p of catalog.products) {
    if (typeof p.meta?.description !== 'string') continue;
    const closing = p.meta.description.trim().split(/\n\s*\n/).pop()?.trim();
    if (closing) ctx.closingCounts.set(closing, (ctx.closingCounts.get(closing) ?? 0) + 1);
  }

  for (const product of catalog.products) validateProduct(catalog, product, push, ctx);

  const present = new Set(catalog.products.map(p => p.meta?.slug).filter(Boolean));
  for (const slug of catalog.liveSlugs) {
    if (present.has(slug)) continue;
    const redirect = new RegExp(`source:\\s*['"\`]/product/${slug}['"\`][\\s\\S]{0,240}?(permanent:\\s*true|statusCode:\\s*30[18])`);
    if (!redirect.test(catalog.nextConfig)) {
      push('error', 'slug-removed', `/product/${slug}`, 'this live URL has no product and no permanent redirect', 'Restore the product, use "hidden": true, or add a permanent redirect in next.config.ts.');
    }
  }
  for (const slug of present) {
    if (!catalog.liveSlugs.has(slug)) {
      push('error', 'slug-unregistered', `/product/${slug}`, 'not in data/live-slugs.json', 'Add products with npm run catalog:add-product, which registers the slug.');
    }
  }
  return findings;
}
