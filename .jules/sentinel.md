## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2024-05-23 - Fix Weak Random Number Generation in Registry Slug
**Vulnerability:** Found `Math.random()` used to generate URL slugs for registries. `Math.random()` is a weak Pseudo-Random Number Generator (PRNG) whose outputs can be predicted, making private registry URLs guessable and potentially exposing private registry details.
**Learning:** `Math.random()` should never be used for security-sensitive operations or generating unpredictable tokens/URLs.
**Prevention:** Use cryptographically secure alternatives like `crypto.randomUUID()` or `crypto.getRandomValues()` when generating tokens, slugs, or unique identifiers that should be hard to guess.
