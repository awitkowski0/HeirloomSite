import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getInventory } from '@/lib/content';
import { variantPathsFor } from '@/lib/variants';
import styles from './dev-products.module.css';

/*
 * Every product in one place - live, draft and hidden - for whoever is setting
 * pages up on localhost. Development only.
 *
 * In a production build this file prerenders to a static 404 and nothing
 * below the guard is reachable: process.env.NODE_ENV is inlined at build time,
 * so it does not opt the route (or anything else) out of static rendering.
 * It reads no searchParams, is not in the sitemap, and is noindex either way.
 *
 * The rows come from `npm run product -- list --json` rather than from the
 * generated data, on purpose: the generated data has no hidden products and no
 * check results, and asking the CLI means this page and `check` can never
 * disagree. It is read fresh on every request, so editing a product.json and
 * reloading shows the new state.
 */
export const metadata: Metadata = {
  title: 'Product previews',
  robots: { index: false, follow: false },
};

type Status = 'live' | 'unlisted' | 'draft' | 'hidden';

interface Row {
  folder: string;
  productName: string;
  slug: string | null;
  category: string | null;
  status: Status;
  image: string | null;
  finishes: number;
  photos: number;
  unusedPhotos: number;
  errors: string[];
  todo: string[];
  warnings: string[];
}

const ORDER: Status[] = ['draft', 'live', 'unlisted', 'hidden'];
const STATUS_NOTE: Record<Status, string> = {
  draft: 'on localhost only',
  live: 'on the site',
  unlisted: 'live, reached by link or bundle',
  hidden: 'withdrawn, no page',
};

async function loadRows(): Promise<Row[]> {
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync(process.execPath, ['scripts/product.mjs', 'list', '--json'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(out) as Row[];
}

export default async function DevProductsPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const rows = await loadRows();
  const inventory = getInventory();
  const sorted = [...rows].sort(
    (a, b) =>
      ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.productName.localeCompare(b.productName)
  );
  const counts = ORDER.map(s => ({ status: s, n: rows.filter(r => r.status === s).length })).filter(c => c.n > 0);

  return (
    <div className={`container ${styles.page}`}>
      <p className="label-caps">Development only</p>
      <h1 className={styles.title}>Product previews</h1>
      <p className={styles.lede}>
        Every product folder, as <code>npm run product -- check</code> sees it. Drafts are built for
        localhost only; <code>npm run product -- publish &lt;slug&gt;</code> takes one live.
      </p>
      <p className={styles.counts}>
        {counts.map(c => (
          <span key={c.status}>
            <span className={`${styles.badge} ${styles[c.status]}`}>{c.status}</span> {c.n}
          </span>
        ))}
      </p>

      <ul className={styles.list}>
        {sorted.map(row => {
          const configurations = row.slug ? inventory.filter(i => i.slug === row.slug) : [];
          // Not in the generated data: hidden, or a draft made since the data
          // was last built with drafts included.
          const built = configurations.length > 0;
          const finishPaths = built ? variantPathsFor(configurations).filter(v => v.length > 0) : [];
          const href = `/product/${row.slug}`;

          return (
            <li key={row.folder} className={styles.row}>
              <div className={styles.thumb}>
                {row.image ? (
                  <Image src={row.image} alt="" width={96} height={96} sizes="96px" />
                ) : (
                  <span>no photo</span>
                )}
              </div>

              <div className={styles.main}>
                <h2 className={styles.name}>
                  {built ? <Link href={href}>{row.productName}</Link> : row.productName}
                </h2>
                <p className={styles.meta}>
                  <span className={`${styles.badge} ${styles[row.status]}`} title={STATUS_NOTE[row.status]}>
                    {row.status}
                  </span>
                  <span>{row.category ?? 'no category'}</span>
                  <code>{row.slug ?? 'no slug'}</code>
                </p>
                <p className={styles.meta}>
                  <span>
                    {row.finishes} {row.finishes === 1 ? 'finish' : 'finishes'}
                  </span>
                  <span>
                    {row.photos} {row.photos === 1 ? 'photo' : 'photos'} on the page
                  </span>
                  {row.unusedPhotos > 0 && <span>{row.unusedPhotos} unused in the folder</span>}
                </p>
                {!built && row.status !== 'hidden' && (
                  <p className={styles.note}>
                    Not in the data this server is reading. Run{' '}
                    <code>npm run product -- preview {row.slug}</code>.
                  </p>
                )}
                {finishPaths.length > 0 && (
                  <details className={styles.finishes}>
                    <summary>Finish pages</summary>
                    <ul>
                      {finishPaths.map(v => (
                        <li key={v.join('/')}>
                          <Link href={`${href}/${v.join('/')}`}>{v.join(' / ')}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>

              <ul className={styles.issues}>
                {row.errors.map(e => (
                  <li key={e} className={styles.error}>
                    {e}
                  </li>
                ))}
                {row.todo.map(t => (
                  <li key={t} className={styles.todo}>
                    {t}
                  </li>
                ))}
                {row.warnings.map(w => (
                  <li key={w}>{w}</li>
                ))}
                {row.errors.length + row.todo.length + row.warnings.length === 0 && row.status !== 'hidden' && (
                  <li className={styles.clean}>Nothing to report</li>
                )}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
