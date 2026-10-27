import type { MetadataRoute } from 'next';

const origin = process.env.WANTED_PUBLIC_ORIGIN?.startsWith('https') ? process.env.WANTED_PUBLIC_ORIGIN : 'https://trywanted.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/cron', '/api/dev'] }], sitemap: `${origin}/sitemap.xml` };
}
