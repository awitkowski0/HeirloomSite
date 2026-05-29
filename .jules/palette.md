## 2024-05-29 - Improve Checkout Form Accessibility
**Learning:** The checkout form had inputs without associated labels and missing 'required' attributes, which fails screen reader accessibility standards.
**Action:** Always link `<label>` tags to `<input>` fields using `htmlFor` and `id` attributes, and mark mandatory fields with the `required` attribute.