import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenderBase — Find the opportunities that matter',
  description:
    'Discover relevant South African government and private-sector tender opportunities, track closing dates and stay ahead of new opportunities.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0F2A47',
  width: 'device-width',
  initialScale: 1,
  // Prevents zoom-on-input jitter inside the Capacitor webview.
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
