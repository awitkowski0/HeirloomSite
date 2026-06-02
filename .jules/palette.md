## 2024-06-25 - Missing Labels for Login Forms
**Learning:** Found a specific accessibility issue pattern where login forms use a `<p>` tag describing the input instead of a semantically correct `<label>`. This causes screen readers to miss the association between the instruction and the password input.
**Action:** Replaced the descriptive `<p>` tag with a `<label>` and correctly associated it with the input using the `htmlFor` and `id` attributes. This ensures screen readers announce the input properly. Future forms should use explicit labels.
