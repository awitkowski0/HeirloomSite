import type { Metadata } from 'next';
import PieceLink from '@/components/shop/PieceLink';
import TalkToPerson from '@/components/layout/TalkToPerson';
import { getBrowsableProducts } from '@/lib/content';
import { toShopItems } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Gifts',
  description: 'Buying a crib or nursery furniture for someone else? Gift orders are arranged by hand, with a person.',
  alternates: { canonical: '/gifts' },
};

const STARTERS = ['bloomington', 'mini-newport-with-mattress', 'newport-nightstand'];

export default function GiftsPage() {
  const items = toShopItems(getBrowsableProducts().filter(p => STARTERS.includes(p.slug)));
  return (
    <div className="page">
      <header className="page-intro">
        <h1>Buying for someone else?</h1>
        <p>Tell us who it’s for and when it needs to arrive. Gift orders are arranged by hand, so a person sets it up with you.</p>
        <p className="intent-row"><TalkToPerson /></p>
      </header>
      <h2 className="sub">Or start with a piece they’ll keep</h2>
      <div className="grid">{items.map(i => <PieceLink key={i.slug} item={i} />)}</div>
      <p className="small page-note">On a registry? Every piece has an Add to Babylist button.</p>
    </div>
  );
}
