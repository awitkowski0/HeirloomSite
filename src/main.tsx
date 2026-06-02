import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import { HelmetProvider } from 'react-helmet-async'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'
import { ContentProvider } from './content'

const posthogToken = import.meta.env.VITE_POSTHOG_TOKEN || '';
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
        <ContentProvider>
          <App />
        </ContentProvider>
      </PostHogProvider>
    </HelmetProvider>
  </StrictMode>,
)
