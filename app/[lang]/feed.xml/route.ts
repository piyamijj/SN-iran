import { isLang, siteUrl } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getArticles } from '@/lib/news/queries';

export const revalidate = 300;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** /fa/feed.xml ve /tr/feed.xml — başlık + kısa özet + kaynak atfı. */
export async function GET(_req: Request, { params }: { params: { lang: string } }) {
  if (!isLang(params.lang)) return new Response('Not found', { status: 404 });
  const lang = params.lang;
  const t = getDictionary(lang);
  const { items } = await getArticles({ lang, limit: 40 });
  const body = items.map((i) => `<item><title>${esc(i.title)}</title><link>${siteUrl}/${lang}/article/${i.slug}</link><guid isPermaLink="true">${siteUrl}/${lang}/article/${i.slug}</guid><pubDate>${new Date(i.publishedAt).toUTCString()}</pubDate><source url="${siteUrl}">${esc(i.sourceName)}</source><description>${esc(i.summary)}</description></item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(t.siteName)}</title><link>${siteUrl}/${lang}</link><description>${esc(t.description)}</description><language>${lang}</language>${body}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' } });
}
