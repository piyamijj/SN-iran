import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { extractArticleText } from '@/lib/news/fulltext';
import { translateLongText } from '@/lib/ai/llm';
import { allow, clientIp } from '@/lib/rate-limit';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * POST {slug, lang}: KULLANICI İSTEĞİYLE kaynak sayfadan metni alır, çevirir, önbelleğe yazar.
 * Otomatik/toplu çağrılmaz; IP başına dakikada 5 istekle sınırlıdır.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { slug?: string; lang?: string } | null;
  const lang = body?.lang === 'tr' ? 'tr' : 'fa';
  if (!body?.slug) return NextResponse.json({ error: 'slug gerekli' }, { status: 400 });
  const db = getSupabaseServiceClient();
  const { data: a } = await db.from('articles').select('id,source_url,source_lang,source_id,full_text_src,full_text_fa,full_text_tr').eq('slug', body.slug).single();
  if (!a) return NextResponse.json({ error: 'bulunamadı' }, { status: 404 });

  const ready = lang === 'tr' ? a.full_text_tr : a.full_text_fa ?? (a.source_lang === 'fa' ? a.full_text_src : null);
  if (ready) return NextResponse.json({ text: ready, cached: true });
  if (!(await allow(`ft:${clientIp(request)}`, 5))) return NextResponse.json({ error: 'çok fazla istek' }, { status: 429 });

  try {
    let src: string | null = a.full_text_src;
    if (!src) {
      const { data: s } = a.source_id ? await db.from('sources').select('use_proxy').eq('id', a.source_id).single() : { data: null };
      src = await extractArticleText(a.source_url, Boolean(s?.use_proxy));
      if (!src) return NextResponse.json({ error: 'metin çıkarılamadı' }, { status: 502 });
      await db.from('articles').update({ full_text_src: src, full_text_fetched_at: new Date().toISOString() }).eq('id', a.id);
    }
    const from = a.source_lang === 'en' ? 'en' : 'fa';
    if (lang === 'fa' && from === 'fa') return NextResponse.json({ text: src, cached: false });
    const translated = await translateLongText(src, from, lang);
    if (!translated) return NextResponse.json({ error: 'çeviri başarısız' }, { status: 502 });
    await db.from('articles').update(lang === 'tr' ? { full_text_tr: translated } : { full_text_fa: translated }).eq('id', a.id);
    return NextResponse.json({ text: translated, cached: false });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'hata' }, { status: 502 });
  }
}
