import 'server-only';

import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins/magic-link';
import { Pool } from 'pg';

/*
 * Passwordless accounts: a shopper enters an email and signs in from a link.
 *
 * LOCAL ONLY so far. The link is printed to the server log rather than mailed,
 * and /api/auth refuses to run on Vercel. Before deploying, send through Resend
 * and put this behind its own Turnstile action and a rate limit: it emails an
 * address the caller supplies, the same abuse shape as /api/quotes.
 */
export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  baseURL: process.env.BETTER_AUTH_URL,
  plugins: [
    magicLink({
      expiresIn: 15 * 60,
      sendMagicLink: async ({ email, url }) => {
        if (process.env.VERCEL) throw new Error('Magic link email is not configured for deployment.');
        console.info(`[auth] sign-in link for ${email}: ${url}`);
      },
    }),
    // Must stay last, so sign-in cookies set from server actions reach the browser.
    nextCookies(),
  ],
});
