import { fetchText, stripHtml } from '@/lib/news/fetch-feed';

/**
 * Kaynak sayfadan okunabilir ana metni çıkarır (bağımlılıksız, basit sezgisel).
 * YALNIZCA kullanıcı isteğiyle çağrılır; sonuç önbelleğe alınır.
 */
export async function extractArticleText(url: string, useProxy: boolean): Promise<string | null> {
  const html = await fetchText(url, useProxy, 20000);
  const cleaned = html.replace(/<(script|style|nav|header|footer|aside|form|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '');
  const articleBlock = cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? cleaned.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? cleaned;
  const paragraphs = [...articleBlock.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripHtml(m[1]))
    .filter((p) => p.length > 40);
  const text = paragraphs.join('\n\n').trim();
  return text.length > 200 ? text.slice(0, 12000) : null;
}
