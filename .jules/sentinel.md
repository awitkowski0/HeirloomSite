## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2026-05-19 - Fix Weak Random Number Generation in URL Slugs
**Vulnerability:** Used `Math.random()` to generate a random 4-character suffix for registry URL slugs, which is predictable and not cryptographically secure.
**Learning:** `Math.random()` should never be used for security-sensitive operations or generating unique identifiers, as it relies on a pseudo-random number generator that can be reverse-engineered.
**Prevention:** Replaced `Math.random()` with `crypto.randomUUID()` to generate cryptographically secure, unpredictable unique identifiers for URL slugs.
## 2025-02-28 - [Negative Quantity Vulnerability]
**Vulnerability:** The shopping cart quantity received from the client in `api/stripe/create-payment-intent.ts` was used directly in total calculations without validation. This allowed users to pass negative quantities to reduce or zero out the total order price.
**Learning:** Client-provided numerical inputs related to pricing and quantities must be strictly validated on the server.
**Prevention:** Always validate that quantities are positive integers (`Number.isInteger(quantity) && quantity >= 1`) before calculating subtotals.
