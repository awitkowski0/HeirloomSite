---
name: product-page
description: Set up or change a product page on the Heirloom site - hero photo, one photo per stain plus a shared carousel of room shots and angles, a new product from a template (as a draft seen only on localhost, then published), wiring in unused photos, then previewing the page with screenshots. Use when asked to add a product, change a product's photos/hero/gallery/carousel, or "set up the page for X".
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
   A stain is picked with the finish selector, never swiped to: a one-stain
   shot is that finish's photo (`--finish "<variant>||<stain>"`). The carousel
   is room shots, angles and details, shared by every finish (the default). Supplier sheets with burned-in
   part numbers stay off the page.
3. `set-hero`, `add-photos`, `remove-photo`, or edit the JSON directly. A new
   product: `templates`, then `new "<Name>" --template <name>` or
   `--like "<product>"`. It starts as a draft, which only exists on localhost.
4. `npm run product -- check <product>` - must report 0 errors.
5. `npm run product -- preview <product> --screenshot --no-open`, then Read
   `.preview/<slug>-desktop.png` and `.preview/<slug>-phone.png` and look at
   them before reporting back. Tell the user the preview URL, the
   `/dev/products` index URL, and the dev server pid if the command started
   one.
6. A draft goes live with `npm run product -- publish <product>`, once the
   user has seen it and said so. Don't publish on your own initiative.
