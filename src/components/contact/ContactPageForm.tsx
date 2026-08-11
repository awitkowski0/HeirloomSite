'use client';

import { useState, type FormEvent } from 'react';
import { contactMessageSubmitted } from '@/lib/analytics';

export default function ContactPageForm({ email: supportEmail }: { email: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const subject = `Contact from ${name}`;
    const body = `From: ${name} (${email})\n\n${message}`;
    // Opens the visitor's mail client; there is no server-side mail handler.
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    contactMessageSubmitted();
    setSent(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  if (sent) {
    return (
      <div className="contact-sent" role="status">
        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
        <p className="body-lg">
          Your mail app should have opened with the message ready to send. If it didn&rsquo;t, email
          us directly at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
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
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message" className="label-caps">Message</label>
        <textarea
          id="contact-message"
          name="message"
          rows={6}
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="button-primary contact-submit">
        Send Message
      </button>
    </form>
  );
}
