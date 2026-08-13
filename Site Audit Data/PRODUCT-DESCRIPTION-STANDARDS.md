# Product description standards (HeirloomSite / Vercel)

**Version:** 1.0 · Task 1  
**Scope:** `public/data/products/*/product.json` body copy + PDP typography

## Purpose

Every product page should feel like the same brand: warm, clear, human, and consistent. Copy sells the *experience and quality*, not a changing option list.

---

## 1. Description flow (required order)

Use **3–4 short paragraphs**, separated by a blank line (`\n\n` in JSON):

| # | Block | Role | Length guide |
|---|--------|------|----------------|
| 1 | **Open** | Invite + what the piece is | 1–2 sentences |
| 2 | **Body** | How it lives in the nursery / home; grow-with-child or use case; materials & craft (no price/order policy) | 2–4 sentences |
| 3 | **Trust** | Safety or coordination in plain language (optional if already covered) | 1–2 sentences |
| 4 | **Engage** | Standard assistance CTA (required) | Fixed wording below |

**Target total:** about **450–900 characters** for accessories/kits; **700–1,200** for cribs and large case goods. Prefer clarity over length.

---

## 2. Do not put in the description

- **Finish / stain / color name lists** (e.g. “Available in Almond, Asbury Brown…”) — selectors own this  
- **SKU lists**, price, deposit, cancellation, lead-time policy  
- **Manufacturer brand as the sell** (OTO, FQP, Old Time Oak, etc.)  
- **Business name in the H1/title** (“— Heirloom Cribs and More”)  
- **Order-process** language  
- **Em/en dashes** used as AI clause glue — prefer commas or new sentences  
- **Hard sell** / hype (“look no further”, “deserves”, “stunning”, “elevate”)

---

## 3. Bed / conversion accuracy

| Product type | Wording |
|--------------|---------|
| Standard crib 4-in-1 path | crib → toddler bed → daybed → **full-size (double) bed** with matching rail kit |
| Full / Double bed rail kits | **full-size (double) bed** only — one SKU, no twin/full choice |
| Mini Newport conversion | **twin** only |
| Toddler rail kits | **conversion kit** that turns the matching crib into a toddler bed — not a separate bed |
| Guard rails | safety accessory for converted beds — not a bed size |

---

## 4. Standard engage CTA (exact)

Last paragraph on every hard-goods product:

```text
If you would like help choosing a finish, confirming timing, or picturing how this piece fits your nursery plans, use Get Personal Assistance. We reply the same or next business day so you can decide with full information, at your own pace.
```

On the PDP, **Get Personal Assistance** links to `/contact`.  
Do not invent alternate CTAs per product.

---

## 5. In-copy links (when used)

Only these phrases auto-link on the PDP (same styling everywhere):

| Phrase in copy | Href |
|----------------|------|
| `Get Personal Assistance` | `/contact` |
| `Safety page` | `/safety` |

Preferred trust line (optional):

```text
See our Safety page for full certification details.
```

Do not paste raw URLs into `description`. Do not use markdown links in JSON.

---

## 6. PDP typography (site CSS)

| Element | Class | Font | Size token |
|---------|--------|------|------------|
| Product title (H1) | `headline-xl product-title` | Serif (`--font-serif`) | `--text-headline-xl` |
| Description body | `body-lg product-description` | Sans (`--font-label`) | `--text-body-lg` |
| Description links | `product-description a` / `product-inline-link` | Inherit body | Underline, accent color |
| Details heading | `headline-md` | Serif | `--text-headline-md` |
| Extended details | `body-md` | Sans | `--text-body-md` |

Title alignment and spacing are defined once under `.product-title` / `.product-description` in `src/app/globals.css`.

---

## 7. Title field

- `productName` and `title` = **product name only** (include “Kit” when the item is a kit).  
- SEO `title` may match `productName`; do not append the business name.  
- `metaDescription` = 70–160 characters, complete sentence(s), no finish lists, no CTA required.

---

## 8. Checklist before publish

- [ ] Flow matches Open → Body → Trust → Engage  
- [ ] No finish/color enumeration  
- [ ] Kit products say kit / conversion clearly  
- [ ] Bed size matches pricebook rules above  
- [ ] Exact standard CTA  
- [ ] No manufacturer hard-sell in body  
- [ ] Meta length OK  
- [ ] PDP uses standard title + body classes only  

---

## 9. Apply / regenerate

```text
node "Site Audit Data/scripts/apply-description-standards.mjs"
node scripts/build-data.mjs
```
