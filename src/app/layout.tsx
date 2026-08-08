import type { Metadata, Viewport } from 'next';
import { Noto_Serif, Manrope } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  // Makes every relative canonical and og:image absolute in one place.
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Heirloom Cribs — Handcrafted for Generations',
    template: `%s | ${SITE_NAME}`,
  },
  description:
    'Handcrafted nursery furniture built to hold your most precious cargo for generations. ' +
    'Traditional joinery, botanical finishes, solid American hardwoods.',
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: '/',
    title: 'Heirloom Cribs — Handcrafted for Generations',
    description: 'Handcrafted nursery furniture built for generations.',
    images: [{ url: '/logo-wide.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heirloom Cribs — Handcrafted for Generations',
    description: 'Handcrafted nursery furniture built for generations.',
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
  themeColor: '#322214',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${manrope.variable}`}>
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
