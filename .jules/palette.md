## 2024-05-28 - Material Symbols Accessibility Pattern
**Learning:** Icon-only buttons using `material-symbols-outlined` spans present a significant accessibility issue where screen readers announce the literal icon ligature text (e.g., "arrow_back" or "delete") instead of the button's function.
**Action:** When building icon-only buttons, always include descriptive `aria-label`s on the `<button>` element itself, and crucially, mark the decorative icon span with `aria-hidden="true"` to prevent screen readers from reading the ligature text.
