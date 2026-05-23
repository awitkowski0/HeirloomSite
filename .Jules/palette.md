## 2024-05-18 - ARIA Labels for Icon-Only Buttons
**Learning:** Icon-only buttons using Google Material Symbols often lack accessibility labels, making them difficult for screen readers to interpret correctly.
**Action:** When adding new icon buttons, always include descriptive `aria-label`s to ensure accessibility.
## 2024-05-15 - Dynamic Cart Badge Accessibility
**Learning:** A static `aria-label="Shopping cart"` on a link with a dynamic badge count completely hides the item count from screen readers, as the `aria-label` overrides all child content.
**Action:** Always make the `aria-label` dynamic if it contains dynamically changing status info, e.g., `aria-label={`Shopping cart with ${totalItems} items`}`.

## 2026-05-23 - Form Label Accessibility
**Learning:** Input fields missing `id` attributes and `htmlFor` links in labels are not read correctly by screen readers and don't receive focus when the label is clicked.
**Action:** Always link labels to inputs with `htmlFor` and `id`, and use native `required` attributes to leverage built-in browser validation and accessibility.
