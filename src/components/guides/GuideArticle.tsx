import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Guide, GuideImage } from '@/content/guides/types';
import { jsonLdScript, SITE_NAME } from '@/lib/seo';
import { isInternalHref, parseInline } from '@/lib/guide-text';
import { formatGuideDate, guideBreadcrumb, guideJsonLd } from '@/lib/guides';

/*
 * The article template. A server component with no state: everything it
 * shows comes from the Guide object, and the JSON-LD it writes comes from the
 * same object (src/lib/guides.ts), so the FAQ answers in the markup are the
 * exact strings on the page.
 */

function Inline({ text }: { text: string }): ReactNode {
  return parseInline(text).map((seg, i) => {
    if ('text' in seg) return seg.text;
    return isInternalHref(seg.href) ? (
      <Link key={i} href={seg.href} className="doc-link">
        {seg.label}
      </Link>
    ) : (
      <a key={i} href={seg.href} className="doc-link" rel="noopener noreferrer">
        {seg.label}
      </a>
    );
  });
}

function Figure({ image }: { image: GuideImage }) {
  return (
    <figure className="guide-figure">
      {/* eslint-disable-next-line @next/next/no-img-element -- static file with a declared size no larger than the source. */}
      <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" />
      {image.caption ? <figcaption>{image.caption}</figcaption> : null}
    </figure>
  );
}

export default function GuideArticle({ guide }: { guide: Guide }) {
  const crumbs = guideBreadcrumb(guide);
  const leadImages = guide.images.filter(i => i.afterSection === undefined);

  return (
    <article className="container doc-page guide-article">
      {guideJsonLd(guide).map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }} />
      ))}

      <nav aria-label="Breadcrumb" className="guide-breadcrumb">
        <ol>
          {crumbs.map((c, i) =>
            i === crumbs.length - 1 ? (
              <li key={c.path} aria-current="page">
                {c.name}
              </li>
            ) : (
              <li key={c.path}>
                <Link href={c.path}>{c.name}</Link>
              </li>
            )
          )}
        </ol>
      </nav>

      <h1 className="headline-xl">{guide.title}</h1>
      <p className="guide-byline label-caps text-on-surface-variant">
        By {SITE_NAME} · Updated <time dateTime={guide.dateModified}>{formatGuideDate(guide.dateModified)}</time>
      </p>

      <div className="guide-answer">
        {guide.answerFirst.map((p, i) => (
          <p key={i} className="body-lg">
            <Inline text={p} />
          </p>
        ))}
      </div>

      {leadImages.map(img => (
        <Figure key={img.src} image={img} />
      ))}

      {guide.sections.map((section, si) => (
        <section key={section.h2}>
          <h2 className="headline-md">{section.h2}</h2>
          {section.paragraphs.map((p, i) => (
            <p key={i}>
              <Inline text={p} />
            </p>
          ))}
          {section.list
            ? (() => {
                const ListTag = section.list.ordered ? 'ol' : 'ul';
                return (
                  <ListTag className="doc-list">
                    {section.list.items.map((item, i) => (
                      <li key={i}>
                        <Inline text={item} />
                      </li>
                    ))}
                  </ListTag>
                );
              })()
            : null}
          {section.table ? (
            <div className="doc-table-wrap">
              <table className="doc-table">
                <caption>{section.table.caption}</caption>
                <thead>
                  <tr>
                    {section.table.head.map(h => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci}>
                          <Inline text={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {guide.images
            .filter(img => img.afterSection === si)
            .map(img => (
              <Figure key={img.src} image={img} />
            ))}
        </section>
      ))}

      <hr className="doc-rule" />
      <section className="guide-faq">
        <h2 className="headline-md">Frequently asked questions</h2>
        {guide.faq.map(f => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>

      {guide.related.length > 0 ? (
        <section className="guide-related">
          <h2 className="headline-md">Related</h2>
          <ul className="doc-list">
            {guide.related.map(r => (
              <li key={r.href}>
                <Link href={r.href} className="doc-link">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {guide.sources.length > 0 ? (
        <section className="guide-sources">
          <h2 className="headline-md">Sources</h2>
          <ol className="doc-list">
            {guide.sources.map(s => (
              <li key={s.url}>
                <a href={s.url} className="doc-link" rel="noopener noreferrer">
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="guide-cta">
        <Link href="/contact" className="button-primary">
          Get Personal Assistance
        </Link>
      </p>
    </article>
  );
}
