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
## 2025-06-07 - IDOR in Order Confirmation via PaymentIntentID
**Vulnerability:** The `/api/orders/[paymentIntentId]` endpoint accepted a Stripe `paymentIntentId` directly without authentication, allowing anyone to enumerate or access other users' order details (PII like email, address) if they could guess or discover the ID.
**Learning:** E-commerce applications must secure order confirmation and status pages against Insecure Direct Object Reference (IDOR) attacks, as Order IDs or Payment Intent IDs are often predictable or discoverable.
**Prevention:** Implement a capability token (HMAC-SHA256 signature) generated using a server-side secret (`STRIPE_SECRET_KEY`) during order creation. The token must be passed alongside the Order ID/Payment Intent ID to retrieve sensitive order details, ensuring only the original purchaser can access the data. Validate the token securely using `crypto.timingSafeEqual` with length checks to prevent timing attacks.
