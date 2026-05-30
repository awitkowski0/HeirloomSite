## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2026-05-30 - Secure Registry Slugs
**Vulnerability:** Weak random number generation using `Math.random()` for generating public registry URL slugs.
**Learning:** Using `Math.random()` for public URL generation makes URLs predictable, allowing attackers to potentially enumerate and access user registries. `crypto.randomUUID()` provides cryptographically strong randomness.
**Prevention:** Use `crypto.randomUUID()` (or `crypto.getRandomValues()`) from the Web Crypto API instead of `Math.random()` whenever generating tokens, identifiers, or slugs to prevent predictability risks.
