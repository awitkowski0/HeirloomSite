import BrandLogo from './BrandLogo';
import SearchBar from '@/components/search/SearchBar';
import CartBadge from './CartBadge';
import CategoryBar from './CategoryBar';
import HelpMenu from './HelpMenu';

/**
 * Server component. Only the search field, help menu and cart badge need JS.
 *
 * Two bars on desktop. The first is the utility row - identity, search, help,
 * cart - and the second is the catalogue. That split is the standard retail
 * arrangement (Wayfair, Amazon) for a good reason: it lets search be the size
 * it deserves to be.
 *
 * The previous single bar was a three-cell grid with the wordmark centred
 * between two navs. Centring the mark meant the outer cells were 1fr each, and
 * the clusters in them were nowhere near equal - two links on the left, three
 * plus a 220px search field on the right, roughly 167px against 504px. The
 * mark was dead centre by measurement and visibly shoved against the right,
 * with 369px of air on one side and 32px on the other. Splitting the bars
 * removes the constraint that caused it rather than tuning around it.
 *
 * The mark is the brand logo: crib and "Heirloom" from 768px up, the
 * wordmark alone below that, where the bar is 52px tall and the crib would
 * shrink to an unreadable smudge. Both are transparent PNGs sized at 128px
 * tall so they stay sharp at 2x. /logo-wide.png (the older brown artwork)
 * is not used here. The site-wide default og:image is the 1200x630 product
 * photo in seo.ts.
 */
export default function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <BrandLogo className="wordmark" />

        {/* The middle column, and the widest thing in the bar. On a catalogue
            this size, search is how someone who knows what they want gets
            there. */}
        <div className="header-search">
          <SearchBar />
        </div>

        <div className="header-end">
          <HelpMenu />
          <CartBadge />
        </div>
      </div>

      <CategoryBar />
    </header>
  );
}
