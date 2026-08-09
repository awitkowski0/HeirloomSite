import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PostHogProvider } from 'posthog-js/react'
import { HelmetProvider } from 'react-helmet-async'
import posthog from 'posthog-js'
import './index.css'
import App from './App.tsx'
import { ContentProvider } from './content'

const posthogToken = import.meta.env.VITE_POSTHOG_TOKEN
const posthogHost = import.meta.env.VITE_POSTHOG_HOST

if (typeof window !== 'undefined' && posthogToken && posthogHost) {
  posthog.init(posthogToken, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  })
} else if (import.meta.env.DEV) {
  if (!posthogToken) {
    throw new Error('VITE_POSTHOG_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_TOKEN is configured')
  }

  throw new Error('VITE_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_HOST is configured')
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
