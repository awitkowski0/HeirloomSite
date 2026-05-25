## 2024-05-18 - ARIA Labels for Icon-Only Buttons
**Learning:** Icon-only buttons using Google Material Symbols often lack accessibility labels, making them difficult for screen readers to interpret correctly.
**Action:** When adding new icon buttons, always include descriptive `aria-label`s to ensure accessibility.
## 2024-05-15 - Dynamic Cart Badge Accessibility
**Learning:** A static `aria-label="Shopping cart"` on a link with a dynamic badge count completely hides the item count from screen readers, as the `aria-label` overrides all child content.
**Action:** Always make the `aria-label` dynamic if it contains dynamically changing status info, e.g., `aria-label={`Shopping cart with ${totalItems} items`}`.
## 2025-03-09 - Keyboard Accessibility for Image Galleries
**Learning:** Found a recurring pattern where `onClick` handlers were attached directly to non-interactive `<img>` elements for product image galleries and thumbnails. This makes them entirely inaccessible via keyboard navigation (like hitting Tab) and invisible to many screen reader interactions, breaking WCAG standards.
**Action:** Always wrap interactive images (like thumbnails that change the main image, or main images that open a lightbox) in semantic `<button>` tags with appropriate `aria-label`s, and manage their states using `aria-selected` and `role="tab"` (or similar appropriate roles) when they act as a group.
