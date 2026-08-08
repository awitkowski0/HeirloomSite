'use client';

import { useEffect } from 'react';

/**
 * Error boundary. The app previously had none anywhere, so a single throw in a
 * render or effect (a quota-exceeded localStorage write, a malformed cart)
 * unmounted the whole tree to a blank white page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container narrow-page">
      <h1 className="headline-lg">Something went wrong</h1>
      <p className="body-lg text-on-surface-variant">
        An unexpected error occurred. Trying again often resolves it.
      </p>
      <div className="not-found-actions">
        <button type="button" className="button-primary" onClick={reset}>Try again</button>
        <a href="/" className="button-secondary">Back to the showroom</a>
      </div>
    </div>
  );
}
