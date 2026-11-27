/**
 * Live chat (Crisp), loaded only when a visitor asks for it.
 *
 * Inert without NEXT_PUBLIC_CRISP_WEBSITE_ID, the same way Turnstile and the
 * Meta Pixel are: unset, `liveChatEnabled` is false and nothing loads. Set it
 * in Vercel (production) once the Crisp account exists. It is read at BUILD
 * time, like every NEXT_PUBLIC_ variable, so a redeploy is needed after
 * setting it.
 *
 * Nothing is fetched from Crisp until someone presses "Chat with us". The
 * widget is ~100KB of script and sets its own session cookie, so loading it on
 * every page view would slow every page for a feature most visitors never
 * use, and would set a third-party cookie before anyone asked to talk. A
 * click is an explicit request for the service, which is also why this is not
 * gated on the analytics consent in src/lib/consent.ts.
 *
 * Crisp's own floating bubble is hidden again whenever the chat closes, so the
 * side rail stays the one way in rather than a second launcher appearing on
 * top of the page after the first conversation.
 *
 * Swapping provider means replacing this file and the Crisp origins in the
 * CSP in next.config.ts; callers only use `liveChatEnabled` and
 * `openLiveChat()`.
 */

type CrispQueue = unknown[];

declare global {
  interface Window {
    $crisp?: CrispQueue;
    CRISP_WEBSITE_ID?: string;
  }
}

const WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID;
const SCRIPT_SRC = 'https://client.crisp.chat/l.js';

export const liveChatEnabled = Boolean(WEBSITE_ID);

/**
 * Load the widget if needed and open the chat window. Returns false when live
 * chat is not configured, so the caller can fall back to the contact page.
 */
export function openLiveChat(): boolean {
  if (!WEBSITE_ID || typeof window === 'undefined') return false;

  if (!window.$crisp) {
    // Crisp reads this array as a command queue, so commands pushed before
    // l.js arrives run once it loads.
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = WEBSITE_ID;
    window.$crisp.push(['on', 'chat:closed', () => window.$crisp?.push(['do', 'chat:hide'])]);
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    document.head.appendChild(script);
  }

  window.$crisp.push(['do', 'chat:show']);
  window.$crisp.push(['do', 'chat:open']);
  return true;
}
