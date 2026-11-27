import Link from 'next/link';
import styles from './DraftMarker.module.css';

/**
 * "Draft - not live", shown above a draft product's page.
 *
 * Only ever rendered on localhost. A draft is left out of every production
 * artifact by scripts/build-data.mjs, so no production page has a `draft`
 * row to render this for - and src/lib/content.ts refuses to build if one
 * somehow did.
 */
export default function DraftMarker({ slug }: { slug: string }) {
  return (
    <p className={styles.marker} role="note">
      <strong className="label-caps">Draft &mdash; not live</strong>
      <span>
        Built for localhost only. <code>npm run product -- publish {slug}</code> takes it live.{' '}
        <Link href="/dev/products">All products</Link>
      </span>
    </p>
  );
}
