## 2024-06-25 - Missing Labels for Login Forms
**Learning:** Found a specific accessibility issue pattern where login forms use a `<p>` tag describing the input instead of a semantically correct `<label>`. This causes screen readers to miss the association between the instruction and the password input.
**Action:** Replaced the descriptive `<p>` tag with a `<label>` and correctly associated it with the input using the `htmlFor` and `id` attributes. This ensures screen readers announce the input properly. Future forms should use explicit labels.

## 2026-06-04 - Interactive Image Galleries Accessibility
**Learning:** Found a common accessibility pattern where interactive image galleries use `onClick` handlers directly on `<img>` elements for features like lightboxes or thumbnail selection, rendering them inaccessible to keyboard and screen reader users. Also observed empty `<button>` tags for pagination lacking descriptions.
**Action:** Wrapped interactive images in semantic `<button>` tags with appropriate `aria-label`, `role="tab"`, and `aria-selected` attributes. Added descriptive `aria-label`s to all icon-only gallery control buttons and pagination dots, marking the icons themselves with `aria-hidden="true"`. Future interactive galleries must ensure all controls are natively focusable and semantically descriptive.

## 2026-06-08 - Accessible Custom Pagination Dots
**Learning:** Found a pattern where custom pagination dots (empty `<button>` elements) for slideshows lack necessary descriptive labels and roles, making them opaque to screen readers. Additionally, icon-only buttons using ligature text (like Material Symbols) were being read aloud directly by screen readers instead of their intended labels.
**Action:** Added `role="tab"`, `aria-label` (e.g., "Go to slide X"), and `aria-selected` attributes to custom pagination buttons. Added `aria-hidden="true"` to ligature icon spans to prevent raw text readouts. These patterns should be consistently applied to all custom sliders/carousels to ensure full a11y compliance.
