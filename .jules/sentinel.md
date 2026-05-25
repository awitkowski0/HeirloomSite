## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2025-02-27 - Fix Weak Random Number Generation in Registry Slug
**Vulnerability:** Used `Math.random().toString(36)` to append random strings to generated registry slugs.
**Learning:** `Math.random()` provides weak pseudo-randomness and can produce predictable values, opening the possibility for an attacker to enumerate or predict newly created slugs and access potentially sensitive registry contents.
**Prevention:** Always use a cryptographically secure method like `crypto.randomUUID()` when generating tokens, identifiers, or slugs to ensure robust unpredictability.
