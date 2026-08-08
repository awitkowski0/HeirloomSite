# Palette — accessibility & design learnings

<!-- Merged from .Jules/palette.md and .jules/palette.md, which were the same
     inode on case-insensitive filesystems but two divergent git blobs. -->

## 2024-05-18 - ARIA Labels for Icon-Only Buttons
**Learning:** Icon-only buttons using Google Material Symbols often lack accessibility labels, making them difficult for screen readers to interpret correctly.
**Action:** When adding new icon buttons, always include descriptive `aria-label`s to ensure accessibility.
## 2024-05-15 - Dynamic Cart Badge Accessibility
**Learning:** A static `aria-label="Shopping cart"` on a link with a dynamic badge count completely hides the item count from screen readers, as the `aria-label` overrides all child content.
**Action:** Always make the `aria-label` dynamic if it contains dynamically changing status info, e.g., `aria-label={`Shopping cart with ${totalItems} items`}`.
## 2025-05-18 - Semantic Links vs Clickable Articles
**Learning:** Using `onClick` directly on a non-interactive semantic element like `<article>` for primary navigation (like product cards) completely hides it from keyboard users and screen readers, and prevents standard link behaviors like "Open in new tab".
**Action:** Always wrap card elements that function as navigation in standard `<Link>` or `<a>` tags. Apply `display: block`, `textDecoration: none`, and `color: inherit` to the link to preserve the card's visual design while maintaining full accessibility.
## 2024-05-19 - Checkout Form Accessibility Improvements
**Learning:** Adding `htmlFor` to labels and matching `id`s to inputs in the checkout form ensures proper accessibility mapping and makes the labels clickable to focus inputs, heavily improving UX for all users.
**Action:** Always verify form inputs have linked labels with `htmlFor` and `id` tags in the future, particularly when designing forms.

## 2024-06-25 - Missing Labels for Login Forms
**Learning:** Found a specific accessibility issue pattern where login forms use a `<p>` tag describing the input instead of a semantically correct `<label>`. This causes screen readers to miss the association between the instruction and the password input.
**Action:** Replaced the descriptive `<p>` tag with a `<label>` and correctly associated it with the input using the `htmlFor` and `id` attributes. This ensures screen readers announce the input properly. Future forms should use explicit labels.

## 2026-06-04 - Interactive Image Galleries Accessibility
**Learning:** Found a common accessibility pattern where interactive image galleries use `onClick` handlers directly on `<img>` elements for features like lightboxes or thumbnail selection, rendering them inaccessible to keyboard and screen reader users. Also observed empty `<button>` tags for pagination lacking descriptions.
**Action:** Wrapped interactive images in semantic `<button>` tags with appropriate `aria-label`, `role="tab"`, and `aria-selected` attributes. Added descriptive `aria-label`s to all icon-only gallery control buttons and pagination dots, marking the icons themselves with `aria-hidden="true"`. Future interactive galleries must ensure all controls are natively focusable and semantically descriptive.
## 2024-06-14 - Accessible Slideshow Pagination
**Learning:** Empty `<button>` elements used as pagination dots in image carousels and slideshows are entirely invisible to screen readers, making navigation impossible for visually impaired users.
**Action:** Always wrap pagination dots in an element with `role="tablist"` and give each dot `role="tab"`, an explicit `aria-label` (e.g., "Go to slide 1"), and an `aria-selected` attribute indicating the currently active slide.
