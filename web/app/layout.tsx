import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './fonts.css';
import './globals.css';
import './shell.css';

/** Where share links and previews point: the set origin, else Vercel's production host, else local. */
const origin = process.env.WANTED_PUBLIC_ORIGIN?.startsWith('http') && !process.env.WANTED_PUBLIC_ORIGIN.includes(':8081')
  ? process.env.WANTED_PUBLIC_ORIGIN
  : process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3100';

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: 'Wanted',
  description: "Find out where you're wanted. Fans prove it. Gus books it.",
  appleWebApp: { title: 'Wanted', statusBarStyle: 'black-translucent' },
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

/** Applies a saved theme and the page's ground before paint, so a dark-mode visitor never sees a cream flash
 *  and Safari samples the wall, Fan Mail or Logbook colour for its bars on first load (the pages' effects add it too late).
 *  First, the demo link (`/a/<act>?tour=1`) on a device that hasn't been through Welcome goes there instead. */
const themeBoot = `try{if(/^\\/a\\//.test(location.pathname)&&/[?&]tour=/.test(location.search)&&!localStorage.getItem('wanted.welcomed'))location.replace('/?tour=1')}catch(e){}try{var t=localStorage.getItem('wanted-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}try{var p=location.pathname,g=/^\\/w\\//.test(p)||/\\/posters$/.test(p)?'on-wall':/\\/pulse$/.test(p)?'on-mail':/\\/logbook$/.test(p)?'on-log':'';if(g)document.documentElement.classList.add(g)}catch(e){}`;

/** Keeps theme-color on the page's own colour (a wall, Fan Mail, the Logbook, light or dark), so Safari's bars match it. */
const edgeSync = `(function(){var h=document.documentElement;function s(){var c=getComputedStyle(h),v=(c.getPropertyValue('--edge')||c.getPropertyValue('--page')||c.getPropertyValue('--bg')).trim();if(!v)return;document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.removeAttribute('media');m.setAttribute('content',v)})}s();new MutationObserver(s).observe(h,{attributes:true,attributeFilter:['class','data-theme','style']});matchMedia('(prefers-color-scheme: dark)').addEventListener('change',s)})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        {/* Josh Puckett's seamless Safari: thin strips of the page colour for Safari to sample under its bars. */}
        <div className="edge-top" aria-hidden />
        {children}
        <div className="edge-bottom" aria-hidden />
        <script dangerouslySetInnerHTML={{ __html: edgeSync }} />
      </body>
    </html>
  );
}
