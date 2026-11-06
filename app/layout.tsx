import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dead Internet',
  description: 'A scroll-driven film about the death of the real internet.',
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
