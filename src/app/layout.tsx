import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Providers from '@/components/Providers';
import AuthButton from '@/components/AuthButton';
import './globals.css';

const BRAND = process.env.NEXT_PUBLIC_BRAND || 'DedSpot';

export const metadata: Metadata = {
  title: `${BRAND} — Free WiFi spots across Bangladesh`,
  description:
    'Find safe, free WiFi near you across Bangladesh. See distance, directions, safety info, reviews and who runs each spot.',
  applicationName: BRAND,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0b1220',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="site-header">
            <div className="container bar">
              <Link href="/" className="brand" aria-label={`${BRAND} home`}>
                <span className="dot" />
                {BRAND}
              </Link>
              <nav className="nav">
                <Link href="/">Find WiFi</Link>
                <Link href="/submit">Add a spot</Link>
                <Link href="/safety">Stay safe</Link>
                <AuthButton />
              </nav>
            </div>
          </header>

          <main className="container">{children}</main>

          <footer className="footer">
            <div className="container">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>© {new Date().getFullYear()} {BRAND}. Made for Bangladesh 🇧🇩</span>
                <span className="muted">
                  Community data — always verify safety yourself before you travel.
                </span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
