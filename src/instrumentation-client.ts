import { analytics } from '@heycatch/sdk';
import { consentStatus, subscribeConsent } from '@/lib/consent';

/*
 * HeyCatch analytics, behind the same consent store as PostHog and the pixel.
 *
 * optOutCapturingByDefault holds off both sending and browser storage, so
 * initialising here, before anyone has answered the banner, writes and sends
 * nothing. Capturing starts when src/lib/consent.ts reports `granted`, which
 * includes the implied grant for visitors outside the gated regions.
 */
analytics.init({
  projectKey: 'hck_pk_FqSXYC0fGyqx-Lr0snlmzNnt2LwV0Vfo',
  install: { framework: 'nextjs', frameworkVersion: '16.3.0', agent: 'claude-code' },
  site: 'landing',
  optOutCapturingByDefault: true,
});

let capturing = false;

subscribeConsent(() => {
  const status = consentStatus();
  if (status === 'granted' && !capturing) {
    capturing = true;
    analytics.optInCapturing();
  } else if (status === 'denied' && capturing) {
    capturing = false;
    analytics.optOutCapturing();
  }
});
