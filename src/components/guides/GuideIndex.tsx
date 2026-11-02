import Link from 'next/link';
import type { Guide } from '@/content/guides/types';
import { GUIDES_INDEX } from '@/content/guides';
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo';
import { plainText } from '@/lib/guide-text';
import { formatGuideDate, guidePath, GUIDES_PATH } from '@/lib/guides';

/* The /guides index: one card per guide, newest update first. */
export default function GuideIndex({ guides }: { guides: Guide[] }) {
  return (
    <div className="container doc-page guide-index">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: GUIDES_INDEX.heading, path: GUIDES_PATH },
            ])
          ),
        }}
      />
      <h1 className="headline-xl">{GUIDES_INDEX.heading}</h1>
      <p className="body-lg doc-lede">{GUIDES_INDEX.lede}</p>
      <ul className="guide-index-list">
        {guides.map(g => (
          <li key={g.slug} className="guide-index-item">
            <h2 className="headline-md">
              <Link href={guidePath(g.slug)} className="doc-link">
                {g.title}
              </Link>
            </h2>
            <p>{plainText(g.answerFirst[0] ?? '')}</p>
            <p className="label-caps text-on-surface-variant">
              Updated <time dateTime={g.dateModified}>{formatGuideDate(g.dateModified)}</time>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
