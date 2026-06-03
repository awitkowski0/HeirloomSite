## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2026-05-19 - Fix Weak Random Number Generation in URL Slugs
**Vulnerability:** Used `Math.random()` to generate a random 4-character suffix for registry URL slugs, which is predictable and not cryptographically secure.
**Learning:** `Math.random()` should never be used for security-sensitive operations or generating unique identifiers, as it relies on a pseudo-random number generator that can be reverse-engineered.
**Prevention:** Replaced `Math.random()` with `crypto.randomUUID()` to generate cryptographically secure, unpredictable unique identifiers for URL slugs.

## 2025-02-28 - Prevent Secret Leakage via VITE_ Prefix
**Vulnerability:** Used `VITE_` prefix for a backend-only secret (`VITE_ADMIN_PASSWORD`), which causes Vite to expose the plaintext secret directly in the client-side bundle.
**Learning:** Any environment variable starting with `VITE_` is automatically replaced during the build process and becomes publicly visible in the source code of the frontend app. Backend-only secrets must never use this prefix.
**Prevention:** Renamed `VITE_ADMIN_PASSWORD` to `ADMIN_PASSWORD` across all backend configuration to ensure it remains securely on the server and is never exposed to the client bundle.
