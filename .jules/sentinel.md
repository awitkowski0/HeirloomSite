## 2024-05-14 - Fix Hardcoded Admin Password
**Vulnerability:** Found hardcoded fallback password `heirloom2024` for `VITE_ADMIN_PASSWORD` in multiple Convex functions.
**Learning:** Hardcoded passwords can easily be forgotten or accidentally pushed to production, creating a significant security risk by allowing unauthorized admin access.
**Prevention:** Removed the fallback password and required `VITE_ADMIN_PASSWORD` to be explicitly set in the environment variables to enforce secure password configurations.

## 2026-05-19 - Fix Weak Random Number Generation in URL Slugs
**Vulnerability:** Used `Math.random()` to generate a random 4-character suffix for registry URL slugs, which is predictable and not cryptographically secure.
**Learning:** `Math.random()` should never be used for security-sensitive operations or generating unique identifiers, as it relies on a pseudo-random number generator that can be reverse-engineered.
**Prevention:** Replaced `Math.random()` with `crypto.randomUUID()` to generate cryptographically secure, unpredictable unique identifiers for URL slugs.
## 2025-06-05 - Logic Bypass in Checkout Quantity
**Vulnerability:** A malicious user could submit a negative or fractional `quantity` in the shopping cart payload sent to `api/stripe/create-payment-intent.ts`. Since the quantity was directly injected into the pricing calculation without validation, this allowed bypassing checkout logic or manipulating order totals negatively.
**Learning:** E-commerce systems that rely on client-provided shopping carts must enforce strict server-side validation. Implicit truthiness (`item.quantity || 1`) is insufficient security. Always validate parameter types and bounds.
**Prevention:** Implement strict type-checking and positive integer validation (`!Number.isInteger(quantity) || quantity <= 0`) for any numeric input impacting business logic or calculations.

## 2025-06-13 - IDOR Vulnerability in Order Details API
**Vulnerability:** The `/api/orders/[paymentIntentId].ts` endpoint fetched and returned Personally Identifiable Information (PII) including name, email, and address, simply by providing a `paymentIntentId`. Since Stripe Intent IDs can be somewhat predictable or leaked, this created an Insecure Direct Object Reference (IDOR) vulnerability.
**Learning:** Sensitive user data fetched without traditional authentication requires a secondary form of authorization, such as a capability token. When validating security tokens (like an HMAC), using standard string equality exposes the comparison to timing attacks, allowing an attacker to brute-force the token character by character based on response times.
**Prevention:** Generate an HMAC-SHA256 capability token during checkout and require it as a parameter to fetch the order details. When verifying the HMAC on the backend, always use `crypto.timingSafeEqual` with explicit `Buffer.from()` conversion and length-checking to prevent timing attacks.
