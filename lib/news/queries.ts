import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { Lang } from '@/lib/i18n/config';
import type { ArticleDetail, ArticleListItem, FlashItem, NewsCategory, PaginatedArticles, Region } from '@/types';

const LIST_COLS = 'id,slug,category,region,source_name,source_name_tr,source_lang,image_url,published_at,is_flash,title_src,summary_src,title_fa,summary_fa,title_tr,summary_tr';
const PAGE_SIZE = 12;

interface Row {
  id: string; slug: string; category: NewsCategory; region: Region; source_name: string; source_name_tr: string | null;
  source_lang: string; image_url: string | null; published_at: string; is_flash: boolean;
  title_src: string; summary_src: string; title_fa: string | null; summary_fa: string | null; title_tr: string | null; summary_tr: string | null;
  source_url?: string; ai_summary_fa?: string[] | null; ai_summary_tr?: string[] | null;
  full_text_src?: string | null; full_text_fa?: string | null; full_text_tr?: string | null;
}

/** Seçili dile göre başlık/özet çözümler; çeviri yoksa kademeli yedek (tr -> fa -> özgün). */
export function resolveText(row: Row, lang: Lang) {
  if (lang === 'tr') {
    if (row.title_tr) return { title: row.title_tr, summary: row.summary_tr ?? '', translated: true };
    return { title: row.title_fa ?? row.title_src, summary: row.summary_fa ?? row.summary_src, translated: false };
  }
  return { title: row.title_fa ?? row.title_src, summary: row.summary_fa ?? row.summary_src, translated: row.source_lang !== 'fa' };
}

function toListItem(row: Row, lang: Lang): ArticleListItem {
  const t = resolveText(row, lang);
  return {
    id: row.id, slug: row.slug, title: t.title, summary: t.summary, translated: t.translated,
    category: row.category, region: row.region,
    sourceName: lang === 'tr' ? row.source_name_tr ?? row.source_name : row.source_name,
    imageUrl: row.image_url, publishedAt: row.published_at, isFlash: row.is_flash,
  };
}

export async function getArticles(opts: { lang: Lang; region?: Region; category?: NewsCategory; cursor?: string | null; limit?: number }): Promise<PaginatedArticles> {
  const limit = opts.limit ?? PAGE_SIZE;
  try {
    let q = getSupabaseServerClient().from('articles').select(LIST_COLS).order('published_at', { ascending: false }).limit(limit + 1);
    if (opts.region) q = q.eq('region', opts.region);
    if (opts.category) q = q.eq('category', opts.category);
    if (opts.cursor) q = q.lt('published_at', opts.cursor);
    const { data, error } = await q;
    if (error || !data) return { items: [], nextCursor: null };
    const rows = data as Row[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return { items: page.map((r) => toListItem(r, opts.lang)), nextCursor: hasMore ? page[page.length - 1].published_at : null };
  } catch {
    return { items: [], nextCursor: null };
  }
}

export async function getFlashItems(lang: Lang, region?: Region, limit = 8): Promise<FlashItem[]> {
  try {
    let q = getSupabaseServerClient().from('articles').select(LIST_COLS).eq('is_flash', true).order('published_at', { ascending: false }).limit(limit);
    if (region) q = q.eq('region', region);
    const { data } = await q;
    return ((data ?? []) as Row[]).map((r) => ({ id: r.id, slug: r.slug, title: resolveText(r, lang).title, publishedAt: r.published_at }));
  } catch {
    return [];
  }
}

export async function getArticleBySlug(slug: string, lang: Lang): Promise<ArticleDetail | null> {
  try {
    const db = getSupabaseServerClient();
    const { data, error } = await db.from('articles').select('*').eq('slug', slug).single();
    if (error || !data) return null;
    const row = data as Row;
    void db.rpc('increment_view_count', { article_id: row.id }).then(() => undefined, () => undefined);
    const fullText = lang === 'tr' ? row.full_text_tr ?? null : row.full_text_fa ?? row.full_text_src ?? null;
    return {
      ...toListItem(row, lang),
      sourceUrl: row.source_url ?? '', sourceLang: row.source_lang, titleSrc: row.title_src, summarySrc: row.summary_src,
      aiSummary: (lang === 'tr' ? row.ai_summary_tr : row.ai_summary_fa) ?? null,
      fullText: fullText || null,
      fullTextAvailableLang: fullText ? lang : null,
    };
  } catch {
    return null;
  }
}

export async function getRelated(category: NewsCategory, region: Region, excludeId: string, lang: Lang, limit = 4): Promise<ArticleListItem[]> {
  try {
    const { data } = await getSupabaseServerClient().from('articles').select(LIST_COLS).eq('region', region).eq('category', category).neq('id', excludeId).order('published_at', { ascending: false }).limit(limit);
    return ((data ?? []) as Row[]).map((r) => toListItem(r, lang));
  } catch {
    return [];
  }
}

export async function getSitemapEntries(limit = 500): Promise<{ slug: string; publishedAt: string }[]> {
  try {
    const { data } = await getSupabaseServerClient().from('articles').select('slug,published_at').order('published_at', { ascending: false }).limit(limit);
    return (data ?? []).map((r: { slug: string; published_at: string }) => ({ slug: r.slug, publishedAt: r.published_at }));
  } catch {
    return [];
  }
}
