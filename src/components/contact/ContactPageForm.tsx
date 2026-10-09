'use client';

import { useRef, useState, type FormEvent } from 'react';
import { contactMessageSubmitted } from '@/lib/analytics';
import { submitInquiry, ApiError } from '@/lib/api-client';
import TurnstileWidget, {
  type TurnstileHandle,
  type TurnstileStatus,
} from '@/components/checkout/TurnstileWidget';
import { TURNSTILE_ACTIONS } from '@/lib/turnstile-action';

/**
 * The /contact form.
 *
 * This used to end in `window.location.href = mailto:...`, which handed the
 * message to the VISITOR's mail client and recorded nothing anywhere - if that
 * app never opened, or the send was forgotten, Heirloom never knew a person
 * asked. It now POSTs to /api/inquiry, which delivers to the shop inbox and
 * sends the acknowledgement from the copy package
 * (docs/customer-auto-response-basics.md ┬º3, final).
 *
 * The mailto fallback survives on both outcomes below: a failed POST (error
 * state) and a delivered message (sent state) each keep a direct link to the
 * support inbox, so the form can never become a dead end.
 *
 * Field set is ┬º4.3 of the same package - name, email and message required;
 * phone, ZIP, product/style interest and target timing optional, because the
 * auto-response asks for exactly those and a required ZIP would gate a visitor
 * who has not chosen a nursery location yet.
 */
export default function ContactPageForm({ email: supportEmail }: { email: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [zip, setZip] = useState('');
  const [interest, setInterest] = useState('');
  const [timing, setTiming] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [ackSent, setAckSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileStatus, setTurnstileStatus] = useState<TurnstileStatus>('pending');
  /* Turnstile tokens are single-use; see the note on TurnstileHandle. Without
     resetting on failure, a retry resends the same dead token and every
     subsequent attempt fails with the same unrecoverable "Verification failed"
     message - the pattern CheckoutClient and EmailCapturePopup both follow. */
  const turnstileRef = useRef<TurnstileHandle>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);

    try {
      const result = await submitInquiry({ name, email, message, phone, zip, interest, timing, turnstileToken });
      // Marked only after the server confirmed delivery - this event must keep
      // meaning "a contact attempt exists", which it did not under mailto.
      contactMessageSubmitted();
      setAckSent(result.customerAckSent);
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setZip('');
      setInterest('');
      setTiming('');
      setMessage('');
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
      );
      // The token is spent whatever went wrong, since verifyTurnstile runs
      // first server-side - a retry without this resends the dead token.
      turnstileRef.current?.reset();
    } finally {
      setSending(false);
    }
  };

  /* Status is 'disabled' with no site key configured, so gating submit on
     'pending' alone is what keeps a deployment without Turnstile usable. */
  const awaitingToken = turnstileStatus === 'pending';
  const verifyFailed = turnstileStatus === 'error';

  if (sent) {
    return (
      <div className="contact-sent" role="status">
        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
        <p className="body-lg">
          {ackSent ? (
            <>
              Thank you &mdash; your request is in. Check your email for a quick confirmation.
              We&rsquo;ll follow up with next steps. If you don&rsquo;t see our email, check
              spam/promotions.
            </>
          ) : (
            <>
              Thank you &mdash; your request is in. We&rsquo;ll follow up with next steps.
            </>
          )}{' '}
          If it&rsquo;s quicker, email us directly at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
        <button type="button" className="button-secondary" onClick={() => setSent(false)}>
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="contact-form">
      <div className="field">
        <label htmlFor="contact-name" className="label-caps">Full name</label>
        <input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={200}
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="contact-email" className="label-caps">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="contact-phone" className="label-caps">Phone (optional)</label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={300}
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-zip" className="label-caps">Zip code (preferred)</label>
        <input
          id="contact-zip"
          name="zip"
          type="text"
          autoComplete="postal-code"
          maxLength={300}
          value={zip}
          onChange={e => setZip(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="contact-interest" className="label-caps">
          Product / style interest (optional)
        </label>
        <input
          id="contact-interest"
          name="interest"
          type="text"
          maxLength={300}
          value={interest}
          onChange={e => setInterest(e.target.value)}
          placeholder="e.g. Mission crib in natural"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-timing" className="label-caps">
          Target timing (optional)
        </label>
        <input
          id="contact-timing"
          name="timing"
          type="text"
          maxLength={300}
          value={timing}
          onChange={e => setTiming(e.target.value)}
          placeholder="e.g. December"
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message" className="label-caps">Message</label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          maxLength={5000}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
      </div>
      {/*
        interaction-only, so Cloudflare renders nothing unless it actually wants
        a challenge. The visitor navigated here deliberately, but a visible
        badge on a three-line contact form reads as friction the same widget
        spends its time on only when a bot is the one submitting.
      */}
      <TurnstileWidget
        ref={turnstileRef}
        onToken={setTurnstileToken}
        onStatus={setTurnstileStatus}
        action={TURNSTILE_ACTIONS.contact}
        appearance="interaction-only"
      />
      {error && (
        <p className="field-error" role="alert">
          {error} If it keeps happening, email us directly at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      )}
      {verifyFailed && !error && (
        <p className="field-error" role="alert">
          We couldn&rsquo;t load the browser check. Please disable your ad blocker for this
          site, or email us directly at{' '}
          <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
        </p>
      )}
      <button
        type="submit"
        className="button-primary contact-submit"
        disabled={sending || awaitingToken || verifyFailed}
      >
        {sending ? 'SendingΓÇª' : 'Send Message'}
      </button>
    </form>
  );
}
