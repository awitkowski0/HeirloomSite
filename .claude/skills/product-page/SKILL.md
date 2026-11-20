---
name: product-page
description: Set up or change a product page on the Heirloom site - hero photo, carousel photos per finish or shared across finishes, a new product, wiring in unused photos, then previewing the page with screenshots. Use when asked to add a product, change a product's photos/hero/gallery/carousel, or "set up the page for X".
---

# Product page setup

The full playbook is `docs/product-pages.md`. Read it first: it says where
every file is, how photos are ordered on the page, and the rules that still
apply (slugs, categories, hiding). That document is shared with the other
assistants that work in this repo, so keep the substance there and keep this
file a pointer.

The short version:

1. `npm run product -- show <product>` - folder, files, finishes, carousel
   order, unused photos.
2. Read the image files before placing them (the Read tool shows images).
   One-finish shots go on that finish with `--finish "<variant>||<stain>"`;
   details and room shots go in the shared gallery. Supplier sheets with burned-in
   part numbers stay off the page.
3. `set-hero`, `add-photos`, `remove-photo`, `new`, or edit the JSON directly.
4. `npm run product -- check <product>` - must report 0 errors.
5. `npm run product -- preview <product> --screenshot --no-open`, then Read
   `.preview/<slug>-desktop.png` and `.preview/<slug>-phone.png` and look at
   them before reporting back. Tell the user the preview URL, and the dev
   server pid if the command started one.
