import type { MetadataRoute } from 'next';

/** Add to Home Screen: Gus's face, the map as the first room. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wanted',
    short_name: 'Wanted',
    description: "Find out where you're wanted. Fans prove it. Gus books it.",
    start_url: '/',
    display: 'standalone',
    background_color: '#12110E',
    theme_color: '#FF5A1F',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
