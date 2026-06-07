## 2024-06-25 - Missing Labels for Login Forms
**Learning:** Found a specific accessibility issue pattern where login forms use a `<p>` tag describing the input instead of a semantically correct `<label>`. This causes screen readers to miss the association between the instruction and the password input.
**Action:** Replaced the descriptive `<p>` tag with a `<label>` and correctly associated it with the input using the `htmlFor` and `id` attributes. This ensures screen readers announce the input properly. Future forms should use explicit labels.

## 2026-06-04 - Interactive Image Galleries Accessibility
**Learning:** Found a common accessibility pattern where interactive image galleries use `onClick` handlers directly on `<img>` elements for features like lightboxes or thumbnail selection, rendering them inaccessible to keyboard and screen reader users. Also observed empty `<button>` tags for pagination lacking descriptions.
**Action:** Wrapped interactive images in semantic `<button>` tags with appropriate `aria-label`, `role="tab"`, and `aria-selected` attributes. Added descriptive `aria-label`s to all icon-only gallery control buttons and pagination dots, marking the icons themselves with `aria-hidden="true"`. Future interactive galleries must ensure all controls are natively focusable and semantically descriptive.

## 2024-10-24 - Slideshow Ligature Icon Accessibility
**Learning:** Found an accessibility issue pattern where slideshow and gallery navigation controls using ligature-based icon fonts (like Material Symbols) inside interactive elements lack `aria-hidden="true"`, causing screen readers to incorrectly read the raw ligature text (e.g., reading "arrow_back" out loud) instead of a meaningful descriptive label.
**Action:** Added `aria-label`s to the parent interactive elements (like the navigation buttons and pagination dots) and added `aria-hidden="true"` to the inner icon spans. Added roles `tablist` and `tab` along with `aria-selected` for the dots to represent current state correctly. Future components utilizing ligature icons as interactive controls must obscure the ligature text from screen readers and rely on parent ARIA labels.
