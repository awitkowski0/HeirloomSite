import type { Metadata, Viewport } from 'next';
import { GFS_Didot, Open_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

/*
 * GFS Didot is the classical Didone serif the editorial look is built on now:
 * headlines, prices and the wordmark, wherever --font-display is used.
 *
 * `weight` is required, not optional: GFS Didot ships exactly one static
 * weight (400, normal), no variable axis and no italic. Any selector that
 * asks it for a different weight/style gets a browser-fabricated fake
 * instead of erroring, so hierarchy on these surfaces comes from size and
 * letter-spacing rather than weight - see the font-role comment in
 * globals.css. Tracked small-caps UI (nav, buttons, labels) moved off this
 * family onto --font-caps = Open Sans for exactly that reason.
 */
const gfsDidot = GFS_Didot({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-gfs-didot',
  display: 'swap',
});

/*
 * Body copy, forms, checkout, search, and now also the tracked small-caps
 * role (--font-caps) that used to sit on the display serif. Open Sans is a
 * variable font (300-800) with real italics, so no `weight` array is needed
 * and it can carry every weight/emphasis the UI asks for.
 */
const openSans = Open_Sans({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-open-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  // Makes every relative canonical and og:image absolute in one place.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Heirloom Cribs — Built to Grow Up.',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Solid hardwood nursery furniture, forest to family, delivered white-glove and built to ' +
    'grow with your child. Meets or exceeds CPSC and ASTM safety standards.',
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: '/',
    title: 'Heirloom Cribs — Built to Grow Up.',
    description: 'Forest-to-family hardwood nursery furniture, built to grow with your child.',
    images: [{ url: '/logo-wide.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heirloom Cribs — Built to Grow Up.',
    description: 'Forest-to-family hardwood nursery furniture, built to grow with your child.',
    images: ['/logo-wide.png'],
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon/favicon.ico' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/favicon/site.webmanifest',
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#3E3A39',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${gfsDidot.variable} ${openSans.variable}`}>
      <head>
        {/*
          Material Symbols stays a plain <link> rather than next/font: it is a
          variable icon font with wght,FILL axes, which next/font/google handles
          poorly. Preconnects recover most of what the old CSS @import cost --
          that version serialised the font request behind the stylesheet.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Deliberate: this lives in the ROOT layout, so it is not a per-page
            custom font. next/font/google is a poor fit for a variable icon font
            with wght,FILL axes. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body>
        <Providers>
          {/* Keyboard users previously had to tab the entire header and nav on
              every page to reach content. */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Header />
          <main id="main-content">{children}</main>
          <BottomNav />
          <Footer />
        </Providers>

        <Script id="babylist-partner" strategy="afterInteractive">
          {`window._bl = { partner: window.location.hostname };`}
        </Script>
        <Script src="https://babylist.com/add.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
