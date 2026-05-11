import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { PostHogProvider } from 'posthog-js/react'
import { HelmetProvider } from 'react-helmet-async'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'

const convexUrl = import.meta.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("VITE_CONVEX_URL is not defined. Please add it to your environment variables.");
}
const normalizedUrl = convexUrl?.endsWith('/') ? convexUrl.slice(0, -1) : convexUrl;
const convex = new ConvexReactClient(normalizedUrl as string);

const posthogToken = import.meta.env.VITE_POSTHOG_TOKEN || 'phc_rcWmzXb38Qk2ZrQHV7s4Xjn85oQATPLfDxEuXv93oxPg';
if (typeof window !== 'undefined') {
  posthog.init(posthogToken, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing();
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <PostHogProvider client={posthog}>
        <ConvexProvider client={convex}>
          <App />
        </ConvexProvider>
      </PostHogProvider>
    </HelmetProvider>
  </StrictMode>,
)
