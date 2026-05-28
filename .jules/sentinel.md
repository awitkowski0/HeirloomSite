## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2025-05-14 - Replace Cryptographically Weak Random Number Generation
**Vulnerability:** Found `Math.random()` used in `convex/registries.ts` for generating registry URL slugs.
**Learning:** `Math.random()` is cryptographically weak and predictable, which could allow attackers to guess registry URLs or bypass unpredictable token requirements.
**Prevention:** Use `crypto.randomUUID()` (available globally in Convex backend) or `crypto.getRandomValues()` to generate secure, unpredictable values for URL slugs and unique tokens.
