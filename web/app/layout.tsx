import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './fonts.css';
import './globals.css';
import './shell.css';

export const metadata: Metadata = {
  title: 'Wanted',
  description: "Find out where you're wanted. Fans prove it. Gus books it.",
  icons: { apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F4EF' },
    { media: '(prefers-color-scheme: dark)', color: '#12110E' },
  ],
};

/** Applies a saved theme before paint, so a dark-mode visitor never sees a cream flash. */
const themeBoot = `try{var t=localStorage.getItem('wanted-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        {/* Josh Puckett's seamless Safari: strips painted with the page colour sit under Safari's bars. */}
        <div className="edge-top" aria-hidden />
        {children}
        <div className="edge-bottom" aria-hidden />
      </body>
    </html>
  );
}
