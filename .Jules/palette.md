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
