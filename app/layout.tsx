import type { Metadata, Viewport } from 'next';
import { SITE } from '@/data/flow/site';
import './globals.css';

/**
 * Where the site lives, for the absolute URLs share cards need. Set
 * NEXT_PUBLIC_SITE_URL to the real domain; on Vercel the production URL is
 * used by default.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:7822');

const TITLE = SITE.title;
const DESCRIPTION = SITE.description;

// Icons and the share image come from files in app/ (scripts/render-brand.mjs).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: 'Dead Internet',
  authors: [{ name: 'Dylan Jones', url: 'https://hidylanjones.com/' }],
  creator: 'Dylan Jones',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Dead Internet',
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: 'black',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
