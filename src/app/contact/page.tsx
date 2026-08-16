import type { Metadata } from 'next';
import ContactPageForm from '@/components/contact/ContactPageForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    "Get in touch with Heirloom Cribs and More about our handcrafted nursery furniture. We'd love to hear from you.",
  alternates: { canonical: '/contact' },
};

const EMAIL = 'HeirloomCribs.Care@HeirloomCribsandMore.com';
const PHONE = '(484) 293-1840';

export default function ContactPage() {
  return (
    <div className="container contact-page">
      <header className="page-header">
        <h1 className="headline-lg text-primary">Contact Us</h1>
        <p className="body-md text-on-surface-variant">
          We&rsquo;d love to hear from you. Send us a message and we&rsquo;ll respond promptly.
        </p>
      </header>

      {/* These were <h2 className="label-caps"> for the single words "Email" and
          "Phone" - 12px field labels masquerading as section headings. They are
          definition terms, not headings. */}
      <dl className="contact-cards">
        <div className="contact-card">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">mail</span>
          <dt className="label-caps">Email</dt>
          <dd className="body-md">
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </dd>
        </div>
        <div className="contact-card">
          <span className="material-symbols-outlined text-primary" aria-hidden="true">call</span>
          <dt className="label-caps">Phone</dt>
          <dd className="body-md">
            <a href={`tel:${PHONE.replace(/[^\d+]/g, '')}`}>{PHONE}</a>
          </dd>
        </div>
      </dl>

      <ContactPageForm email={EMAIL} />
    </div>
  );
}
