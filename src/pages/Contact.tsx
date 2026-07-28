import { useState, type FormEvent } from 'react';
import { Helmet } from 'react-helmet-async';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:support@heirloomcribsandmore.com?subject=Contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(`From: ${name} (${email})\n\n${message}`)}`;
    window.open(mailto, '_blank');
    setSent(true);
    setName(''); setEmail(''); setMessage('');
  };

  return (
    <>
      <Helmet>
        <title>Contact Us | Heirloom Cribs and More</title>
        <meta name="description" content="Get in touch with Heirloom Cribs and More. We'd love to hear from you about our handcrafted nursery furniture." />
        <meta property="og:title" content="Contact Us | Heirloom Cribs and More" />
      </Helmet>
      <div className="container" style={{ padding: '80px 24px', maxWidth: '640px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 className="headline-lg text-primary" style={{ fontSize: '28px', marginBottom: '8px' }}>Contact Us</h1>
          <p className="body-md text-on-surface-variant">We'd love to hear from you. Send us a message and we'll respond promptly.</p>
        </header>

        <section>
          <div className="contact-info-grid" style={{ display: 'grid', gap: '24px', marginBottom: '40px' }}>
            <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>mail</span>
              <h2 className="label-caps" style={{ marginBottom: '4px' }}>Email</h2>
              <p className="body-md" style={{ overflowWrap: 'anywhere' }}>support@heirloomcribsandmore.com</p>
            </div>
            <div style={{ padding: '20px', borderRadius: '10px', backgroundColor: 'var(--surface-container-lowest)', border: '1px solid var(--outline-variant)' }}>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px', marginBottom: '8px', display: 'block' }}>call</span>
              <h2 className="label-caps" style={{ marginBottom: '4px' }}>Phone</h2>
              <p className="body-md">(555) 123-4567</p>
            </div>
          </div>

          {sent ? (
            <div style={{ padding: '32px', borderRadius: '10px', backgroundColor: 'rgba(0,128,0,0.05)', border: '1px solid rgba(0,128,0,0.2)', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'green', display: 'block', marginBottom: '12px' }}>check_circle</span>
              <p className="body-lg" style={{ fontWeight: 600 }}>Message sent! We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="name" className="label-caps" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>FULL NAME</label>
                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '14px' }} />
              </div>
              <div>
                <label htmlFor="email" className="label-caps" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>EMAIL</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '14px' }} />
              </div>
              <div>
                <label htmlFor="message" className="label-caps" style={{ display: 'block', marginBottom: '6px', fontSize: '11px' }}>MESSAGE</label>
                <textarea id="message" value={message} onChange={e => setMessage(e.target.value)} required rows={6}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--outline-variant)', fontSize: '14px', resize: 'vertical' }} />
              </div>
              <button type="submit" className="add-to-cart" style={{ alignSelf: 'flex-start' }}>Send Message</button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
