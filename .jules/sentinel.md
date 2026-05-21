## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2025-02-20 - Fix Weak Random Number Generation
**Vulnerability:** Used `Math.random()` to generate unique URL slugs for registries.
**Learning:** `Math.random()` is not cryptographically secure, making the generated slugs predictable. Predictable slugs could potentially allow an attacker to guess or enumerate active registry links.
**Prevention:** Always use cryptographically secure methods like `crypto.randomUUID()` or `crypto.getRandomValues()` when generating unique identifiers or tokens.
