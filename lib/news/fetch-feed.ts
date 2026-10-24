import { createHash } from 'node:crypto';
import Parser from 'rss-parser';
import type { RssFeedItem } from '@/types';

const parser = new Parser({
  customFields: { item: [['media:content', 'media:content'], ['media:thumbnail', 'media:thumbnail'], ['content:encoded', 'content:encoded']] },
});

const UA = 'Mozilla/5.0 (compatible; SNIranBot/1.0; +https://github.com/piyamijj/SN-iran)';
export const SUMMARY_MAX_CHARS = 400; // telif: yalnızca kısa özet saklanır

export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/?(p|br|div|li)[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}

/**
 * Bir URL'yi çeker. use_proxy=true ve RSS_PROXY_URL tanımlıysa istek proxy'den geçer
 * (İran siteleri yurtdışı IP'lerini engelleyebilir). Proxy biçimi: `${RSS_PROXY_URL}${encodeURIComponent(url)}`
 */
export async function fetchText(url: string, useProxy: boolean, timeoutMs = 15000): Promise<string> {
  const proxy = process.env.RSS_PROXY_URL;
  const target = useProxy && proxy ? `${proxy}${encodeURIComponent(url)}` : url;
  const headers: Record<string, string> = { 'User-Agent': UA, Accept: 'text/html,application/rss+xml,application/xml,*/*' };
  if (useProxy && proxy && process.env.RSS_PROXY_TOKEN) headers['x-proxy-token'] = process.env.RSS_PROXY_TOKEN;
  const res = await fetch(target, { headers, signal: AbortSignal.timeout(timeoutMs), redirect: 'follow', cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function imageOf(item: Record<string, any>): string | null {
  const direct = item.enclosure?.url ?? item['media:content']?.$?.url ?? item['media:thumbnail']?.$?.url;
  if (direct) return direct;
  const html = `${item['content:encoded'] ?? ''}${item.content ?? ''}`;
  return html.match(/<img[^>]+src=["']([^"'>]+)["']/i)?.[1] ?? null;
}

export async function fetchFeed(sourceName: string, url: string, useProxy: boolean): Promise<RssFeedItem[]> {
  const xml = await fetchText(url, useProxy);
  const feed = await parser.parseString(xml);
  return (feed.items ?? [])
    .filter((i) => i.title && i.link)
    .map((i) => ({
      sourceName,
      title: stripHtml(i.title),
      link: (i.link as string).trim(),
      summary: truncate(stripHtml(i.contentSnippet ?? i.content ?? (i as any).summary ?? ''), SUMMARY_MAX_CHARS),
      isoDate: i.isoDate ?? i.pubDate ?? null,
      imageUrl: imageOf(i as Record<string, any>),
    }));
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export function normalizeForHash(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u200c\u200f\u200e]/g, '')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
