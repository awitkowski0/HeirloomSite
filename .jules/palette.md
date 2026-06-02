## 2024-06-25 - Missing Labels for Login Forms
**Learning:** Found a specific accessibility issue pattern where login forms use a `<p>` tag describing the input instead of a semantically correct `<label>`. This causes screen readers to miss the association between the instruction and the password input.
**Action:** Replaced the descriptive `<p>` tag with a `<label>` and correctly associated it with the input using the `htmlFor` and `id` attributes. This ensures screen readers announce the input properly. Future forms should use explicit labels.

## 2026-06-02 - Custom Pagination Dot Accessibility
**Learning:** Custom UI components like image gallery pagination dots (often implemented as empty `<button>` elements with CSS styling for active state) are completely invisible to screen readers without proper ARIA attributes, creating a frustrating experience where users hear "button, button, button" without context.
**Action:** Always add descriptive `aria-label` attributes to pagination dots (e.g., `aria-label="Go to slide 1"`) and use `aria-current="true"` or role="tab" with `aria-selected="true"` for the currently active item to ensure proper screen reader communication.
