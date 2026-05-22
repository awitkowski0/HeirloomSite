## 2024-05-18 - ARIA Labels for Icon-Only Buttons
**Learning:** Icon-only buttons using Google Material Symbols often lack accessibility labels, making them difficult for screen readers to interpret correctly.
**Action:** When adding new icon buttons, always include descriptive `aria-label`s to ensure accessibility.
## 2024-05-15 - Dynamic Cart Badge Accessibility
**Learning:** A static `aria-label="Shopping cart"` on a link with a dynamic badge count completely hides the item count from screen readers, as the `aria-label` overrides all child content.
**Action:** Always make the `aria-label` dynamic if it contains dynamically changing status info, e.g., `aria-label={`Shopping cart with ${totalItems} items`}`.
## 2024-05-22 - Semantic Links for Product Cards
**Learning:** Non-interactive semantic elements like `<article>` with `onClick` handlers create significant accessibility barriers. Users cannot use "Right Click -> Open in New Tab", screen readers fail to identify them as links, and keyboard users cannot "Tab" to them or "Enter" to activate them.
**Action:** Wrap product cards and similar primary navigation items in React Router `<Link>` or standard `<a>` tags with appropriate CSS resets (`textDecoration: 'none'`, `display: 'block'`, `color: 'inherit'`) instead of relying on `onClick`.
