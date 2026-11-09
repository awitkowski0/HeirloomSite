import Link from 'next/link';
import { tagHref } from '@/lib/uses';

const label = (tag: string) => `${tag[0]}${tag.slice(1).toLowerCase()}`;

/* Slim chips. Each one opens every piece that can be that thing. */
export default function UseTags({ uses, note }: { uses: readonly string[]; note?: string | null }) {
  if (uses.length === 0) return null;
  return (
    <div className="use-tags">
      <ul>
        {uses.map(tag => (
          <li key={tag}><Link href={tagHref(tag)} className="use-tag">{label(tag)}</Link></li>
        ))}
      </ul>
      {note && <p className="small">{note}</p>}
    </div>
  );
}
