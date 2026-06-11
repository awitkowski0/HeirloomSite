## 2024-06-25 - Missing Labels for Login Forms
**Learning:** Found a specific accessibility issue pattern where login forms use a `<p>` tag describing the input instead of a semantically correct `<label>`. This causes screen readers to miss the association between the instruction and the password input.
**Action:** Replaced the descriptive `<p>` tag with a `<label>` and correctly associated it with the input using the `htmlFor` and `id` attributes. This ensures screen readers announce the input properly. Future forms should use explicit labels.

## 2026-06-04 - Interactive Image Galleries Accessibility
**Learning:** Found a common accessibility pattern where interactive image galleries use `onClick` handlers directly on `<img>` elements for features like lightboxes or thumbnail selection, rendering them inaccessible to keyboard and screen reader users. Also observed empty `<button>` tags for pagination lacking descriptions.
**Action:** Wrapped interactive images in semantic `<button>` tags with appropriate `aria-label`, `role="tab"`, and `aria-selected` attributes. Added descriptive `aria-label`s to all icon-only gallery control buttons and pagination dots, marking the icons themselves with `aria-hidden="true"`. Future interactive galleries must ensure all controls are natively focusable and semantically descriptive.

## 2026-06-11 - Slideshow Pagination Accessibility
**Learning:** Found an accessibility issue where custom slideshow controls (like pagination dots and arrow buttons) lacked semantic meaning and descriptive labels. The dot buttons were completely empty, and the arrow buttons relied on ligature text ("chevron_left") that screen readers might read aloud improperly.
**Action:** Added `role="tablist"` to the dots container and `role="tab"`, `aria-selected`, and `aria-label` to the individual dot `<button>` elements. Added descriptive `aria-label`s to the next/prev buttons and applied `aria-hidden="true"` to the inner Material Symbols to prevent the ligature text from being announced. This pattern should be consistently applied to all custom carousels and slideshows.
