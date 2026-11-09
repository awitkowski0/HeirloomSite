import Link from 'next/link';

/*
 * One help path everywhere. On a phone it dials. On a desktop it shows the number
 * and links to the contact form. CSS picks which; neither loads anything extra.
 */
export default function TalkToPerson({ label = 'Talk to a person' }: { label?: string }) {
  return (
    <span className="talk">
      <a href="tel:+14842931840" className="talk-call">{label}</a>
      <span className="talk-desk">
        {label}: (484) 293-1840 · <Link href="/contact">Send a message</Link>
      </span>
    </span>
  );
}
