import type { MetadataRoute } from 'next';

const origin = process.env.WANTED_PUBLIC_ORIGIN?.startsWith('https') ? process.env.WANTED_PUBLIC_ORIGIN : 'https://trywanted.vercel.app';
const act = 'maya-ortiz';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', `/a/${act}`, `/a/${act}/tour`, `/a/${act}/posters`, `/a/${act}/pulse`, `/a/${act}/logbook`, `/w/${act}/burlington-vt`, '/llms.txt', '/llms-full.txt'];
  return paths.map((p) => ({ url: `${origin}${p}`, changeFrequency: 'daily', priority: p === '/' ? 1 : 0.7 }));
}
