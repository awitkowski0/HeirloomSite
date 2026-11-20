# Setting up a product page

The playbook for adding or changing a product page, written for whoever is
doing it: a person, Claude, Grok, or any other coding assistant. It needs
nothing but a shell in this repository.

## Where everything is

Every product is one folder. There is no CMS and no database.

```
public/data/products/<Folder>/
  product.json    name, category, description, SEO, related/bundle, and the
                  "page" block (hero photo, shared carousel photos)
  variants.json   the finishes: variant + stains, price in whole DOLLARS, SKU,
                  dimensions
  media.json      photos per finish: { "<variant>||<stain>": ["a.jpg", ...] }
  *.jpg/.png      the photos themselves, served as-is
```

- The folder name is only a path. Its real name is `productName` in
  `product.json`, and a `/` in a name becomes `-` in the folder
  (`3/4 Guard Rail` lives in `3-4 Guard Rail/`).
- The page is `/product/<slug>`, with `slug` taken from `product.json`.
- `npm run product -- show <product>` prints all of this for one product:
  folder, files, hero, finishes, the carousel order per finish, and the photos
  sitting in the folder that no page shows.

Don't edit the generated files (`public/data/{inventory,products,images}.json`,
`data/pricing.json`, `src/data/*.json`). `scripts/build-data.mjs` writes them
from the folders above on every `npm run dev` and `npm run build`.

## How photos reach the page

The photo area is a swipeable carousel: swipe on a phone, arrows and
thumbnails on desktop, and a click opens the fullscreen view. For the finish
that is selected, it shows:

1. **`page.hero`** (only on the finish visitors land on, which is the first
   variant's first stain)
2. that finish's photos from **`media.json`**, in order
3. every photo in **`page.gallery`**, which are shared by all finishes

`page.hero` is also the product's card image in grids, search and "related"
rows, and its share (OG) image. When it isn't set, the landing finish's first
photo does those jobs.

```json
"page": {
  "hero": "addison_crib_10.jpg",
  "gallery": ["addison_crib_dovetail.jpg", "addison_crib_nursery.jpg"]
}
```

Choose a hero that shows the landing finish, or a neutral shot. The finish
name under the photo says what is selected, so a hero in a different stain
contradicts it.

The first photo in a finish's `media.json` list is also that finish's preview
in the phone "scroll to preview every finish" strip. Put a clean full-product
shot of that finish first and details after it.

## The commands

All of them edit the three files above and nothing else. Run
`npm run product` for the full list.

| Goal | Command |
| --- | --- |
| See where a product's files are, and what shows | `npm run product -- show <product>` (`--json` for machine output) |
| Set the lead photo | `npm run product -- set-hero <product> <photo>` |
| Add carousel photos on every finish | `npm run product -- add-photos <product> <photo...>` |
| Add photos to one finish only | `npm run product -- add-photos <product> <photo...> --finish "<variant>\|\|<stain>"` |
| Take a photo off the page | `npm run product -- remove-photo <product> <photo>` |
| New single-finish product | `npm run product -- new "<Name>" --category <C> --price <dollars> --description "..." --photos a.jpg,b.jpg` |
| Check before committing | `npm run product -- check <product>` |
| See the result | `npm run product -- preview <product> --screenshot` |

- `<product>` can be a slug, folder name or product name. A partial match
  works when it is unique.
- `<photo>` can be a file already in the folder (`show` lists the unused
  ones), or a path anywhere. A file from elsewhere is copied in under a tidy
  name and the original is left alone.
- Editing the JSON by hand is just as valid. The commands are shortcuts, and
  `check` and the build validate either way.

## Workflow

1. **Look first.** Run `npm run product -- show <product>`. Many folders
   already hold photos no page uses (`npm run product -- check --verbose` lists
   them all), so check those before asking for new photography.
2. **Look at the photos** before placing them. Open the image files. A photo
   of one stain belongs on that finish (`--finish`). Details, joinery and room
   shots belong in the shared gallery. Supplier sheets with a part number
   burned in (for example "Option: 1275") or watermarks don't belong on the
   page at all.
3. **Make the change** with the commands above or by editing the JSON.
4. **Check it.** `npm run product -- check <product>` must report 0 errors.
   It reports exactly what `npm run build` would refuse, such as a hero or
   gallery file that isn't in the folder, or a misspelt `page` key, plus
   warnings for things the build would quietly ship.
5. **Preview it.** `npm run product -- preview <product> --screenshot`:
   - rebuilds the data;
   - reuses a dev server on :3000, or starts one in the background and prints
     its pid;
   - opens the page in a browser;
   - saves `.preview/<slug>-desktop.png` and `.preview/<slug>-phone.png`.

   Look at both screenshots. An assistant without a browser should open the
   PNGs. Add `--finish "<variant>||<stain>"` to preview another finish and
   `--no-open` to skip the browser.
6. **Ship it** through the normal feature workflow in `AGENTS.md` (branch off
   `dev`, `npm run lint && npm run typecheck && npm run build`, PR).

## Rules that still apply

These come from `AGENTS.md` and are worth repeating here, because a product
edit is where they bite.

- **Never change an existing `slug`.** Product URLs are indexed by Google. If a
  rename is unavoidable, add a permanent redirect in `next.config.ts`.
- **`category`** must be one the taxonomy in `src/lib/taxonomy.ts` claims. The
  build fails on an orphan. `new` lists the valid ones.
- **`variantType`** (`wood`, `size`, `finish`, `none`) must match the variant
  names. Don't write composite `"BrownMaple / Antique Slate"` variants.
- **Hiding:** `"hidden": true` withdraws a product so it can't be bought. A
  `product-<slug>` PostHog flag only de-lists it. See "Hiding a product" in
  `AGENTS.md`.
- **Prices** in `variants.json` are whole dollars. `src/lib/pricing.ts`
  converts them to cents and is the only source of truth at checkout.
- **Copy:** follow the house style for descriptions: plain shop wording and no
  defensive disclaimers. Don't invent origin or materials claims the shop
  hasn't confirmed.
