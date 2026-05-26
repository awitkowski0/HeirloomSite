## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.
## 2026-05-26 - Fix Weak Random Generation\n**Vulnerability:** Found `Math.random()` used for generating registry URL slugs in `convex/registries.ts`.\n**Learning:** `Math.random()` is not cryptographically secure, which could lead to an Insecure Direct Object Reference (IDOR) where attackers could guess URLs to access private registries.\n**Prevention:** Use `crypto.randomUUID()` (natively available in Convex) to generate unpredictable strings and prevent URL guessing.

## 2026-05-26 - Fix Weak Random Number Generation in Registry Slugs
**Vulnerability:** Found `Math.random()` used to generate unique identifiers (slugs) for registries in `convex/registries.ts`.
**Learning:** `Math.random()` is a weak pseudo-random number generator and produces predictable values. This could allow an attacker to guess registry URLs and perform an Insecure Direct Object Reference (IDOR) to access sensitive data.
**Prevention:** Replaced `Math.random()` with `crypto.randomUUID()`, which is cryptographically secure and natively available in the Convex backend environment.
