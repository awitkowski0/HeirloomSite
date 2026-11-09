---
name: add-catalog-item
description: Add, import or update a product, crib, dresser, chest, nightstand, changing table, rug or lamp in this catalog, or add or update a vendor, builder or brand (shop). Use for requests like "add this crib", "add this new builder", "import this product", "update this dresser's price or copy", or any change to public/data/products or data/builders.
---

# Add or update a catalog item

Do not hand-edit the generated JSON or `src/lib/builders.ts`. Use the scripts below; they run the same rules as `npm run data:build` and the deploy build.

## Order of work

1. Decide what is new: the builder (`data/builders/<id>.json`) or the product (`public/data/products/<dir>/`). A product needs its builder on file first.
2. Collect the input below. Ask the user for anything missing. Do not guess it.
3. Run the matching scaffold with `--dry-run`, fix every error, then run it without `--dry-run`.
4. Verify, then stop for review. Do not commit, push or run `next build` unless asked.

## New builder

```bash
npm run catalog:template -- builder > /tmp/builder.json     # edit it
npm run catalog:add-builder -- /tmp/builder.json --dry-run
npm run catalog:add-builder -- /tmp/builder.json
```

Ask for: legal or trading name, `City, State`, a one-line factual `background`, an `intro` quote, lead time and its top in weeks, SKU prefix (the first token of its SKUs), feed brand and handling days.

Every statement is `{ "text": <the builder's words, exact>, "source": <named document> }` or `null`. Scaffolding creates the record and the generated page at `/builders/<id>`. No TSX is needed.

- **Safety, construction and setup are verbatim or null.** If the user gives no document, leave `null` and the site shows the gap. Never write one yourself, paraphrase, or infer from marketing copy.
- A web page counts only if recorded: `source` names it and add `sourceUrl` plus `retrievedOn` (YYYY-MM-DD). If you read the page, copy exact words only.
- `features` chips may use only words already in the quote.

Footer links and prose naming builders (About, Shipping, Timeline, FAQ, How Conversion Works) are hand-written and do not update themselves. Tell the user which of them now need a line.

## New product

```bash
npm run catalog:template -- product > /tmp/product.json     # edit it
npm run catalog:add-product -- /tmp/product.json --dry-run
npm run catalog:add-product -- /tmp/product.json
```

Ask for: name, category (one in `src/lib/taxonomy.ts`), builder id, crib `style` (cribs only: `classic-slats`, `arched-slats`, `solid-panel`, `arched-panel`), `variantType`, `soldWoods`, each variant's name, stains, price and SKU (must start with the builder's prefix), images, and factual copy.

Rules the scripts enforce (read the error message and fix the input, do not route around it):

- `variantType` is `wood`, `size`, `finish` or `none` and must match the variant names. Never `"BrownMaple / Antique Slate"`.
- Prices are dollars on variants only, at most two decimals. No prices in `product.json`.
- `bundle`, `related` and `includes` are existing slugs. A `bundle` target must have exactly one configuration.
- `photos` records the rights (`heirloom-owned`, `builder-permission` or `licensed`), where that permission is recorded (no private contact details, this file is public), and `matchesSoldWood` (`yes`, `no` or `unknown`). Images under 800px on the short side are rejected.
- Heirloom's voice: no safety, certification, testing, non-toxic or lead-free wording, no "Made in USA", American-made, state-of-origin or Amish claim, no stock phrases (timeless, elevate, beautifully), no closing paragraph about Get Personal Assistance. Copy may only name a wood in `soldWoods`.

Describe construction and dimensions from the builder's document. A claim that only a builder's document supports goes on the builder record as a quote, never in product copy.

## Updating something

Edit the record directly: `public/data/products/<dir>/product.json` or `variants.json`, or `data/builders/<id>.json`. Then run `npm run catalog:check`.

- Never change or delete a live slug without a permanent redirect in `next.config.ts`; the check fails otherwise. Rename `slug` only with that redirect added first.
- To withdraw a product, set `"hidden": true`. Do not delete the directory.
- Do not edit `MIN_EXPECTED_PRODUCTS` unless the user is intentionally removing a product.
- Editing existing product copy removes its grandfathered exemption, so fix anything the check then reports in that field.

## Verify

```bash
npm run catalog:check
npm run typecheck
npm test
```

Confirm the product shows the right builder, style and price in the scaffold's summary line. Report the warnings (missing photos, `matchesSoldWood` not `yes`, an unlisted builder).

## Stop and ask when

- There is no builder on file for the piece, or no safety document and the user expected a statement.
- Photo rights are unknown. Do not add the photo.
- The category is not in `src/lib/taxonomy.ts`. A new taxonomy node is the user's decision.
- A check error would need an edit to `data/catalog-baseline.json`, `MIN_EXPECTED_PRODUCTS`, or a loosened rule to pass.

Do not run `scripts/seo-slugs.mjs`: it can write unsupported copy.
