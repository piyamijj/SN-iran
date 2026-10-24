import type { MetadataRoute } from 'next';
import { LANGS, siteUrl } from '@/lib/i18n/config';
import { getSitemapEntries } from '@/lib/news/queries';

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getSitemapEntries();
  const alternatesOf = (path: string) => ({ languages: Object.fromEntries(LANGS.map((l) => [l, `${siteUrl}/${l}${path}`])) });
  return [
    ...LANGS.map((l) => ({ url: `${siteUrl}/${l}`, changeFrequency: 'hourly' as const, priority: 1, alternates: alternatesOf('') })),
    ...articles.flatMap((a) =>
      LANGS.map((l) => ({
        url: `${siteUrl}/${l}/article/${a.slug}`, lastModified: new Date(a.publishedAt), changeFrequency: 'weekly' as const, priority: 0.7,
        alternates: alternatesOf(`/article/${a.slug}`),
      })),
    ),
  ];
}
