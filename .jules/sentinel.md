## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2026-05-19 - Fix Weak Random Number Generation in URL Slugs
**Vulnerability:** Used `Math.random()` to generate a random 4-character suffix for registry URL slugs, which is predictable and not cryptographically secure.
**Learning:** `Math.random()` should never be used for security-sensitive operations or generating unique identifiers, as it relies on a pseudo-random number generator that can be reverse-engineered.
**Prevention:** Replaced `Math.random()` with `crypto.randomUUID()` to generate cryptographically secure, unpredictable unique identifiers for URL slugs.

## 2026-05-20 - Exposing Backend Secrets via Vite Prefix
**Vulnerability:** The admin password environment variable was named `VITE_ADMIN_PASSWORD`. In a Vite project, any environment variable prefixed with `VITE_` is automatically exposed to the client-side bundle.
**Learning:** This exposes sensitive backend secrets (like admin passwords) directly to the frontend, leading to potential unauthorized access or privilege escalation (CWE-200, CWE-312). Backend-only secrets should never use the `VITE_` prefix.
**Prevention:** Renamed the environment variable to `ADMIN_PASSWORD` across all backend Convex functions and documentation to ensure it is strictly confined to the backend environment and never exposed to the client build.
