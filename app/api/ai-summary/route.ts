import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { summarizeBullets } from '@/lib/ai/llm';
import { allow, clientIp } from '@/lib/rate-limit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/** POST {slug, lang}: haber için 3 maddelik AI özeti üretir ve DB'de önbelleğe alır (haber başına dil başına bir kez). */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { slug?: string; lang?: string } | null;
  const lang = body?.lang === 'tr' ? 'tr' : 'fa';
  if (!body?.slug) return NextResponse.json({ error: 'slug gerekli' }, { status: 400 });
  const db = getSupabaseServiceClient();
  const { data: a } = await db.from('articles').select('id,title_src,summary_src,title_fa,summary_fa,title_tr,summary_tr,full_text_fa,full_text_tr,full_text_src,ai_summary_fa,ai_summary_tr').eq('slug', body.slug).single();
  if (!a) return NextResponse.json({ error: 'bulunamadı' }, { status: 404 });
  const cached = lang === 'tr' ? a.ai_summary_tr : a.ai_summary_fa;
  if (cached?.length) return NextResponse.json({ bullets: cached, cached: true });
  if (!(await allow(`sum:${clientIp(request)}`, 20))) return NextResponse.json({ error: 'çok fazla istek' }, { status: 429 });

  const title = (lang === 'tr' ? a.title_tr : a.title_fa) ?? a.title_fa ?? a.title_src;
  const text = (lang === 'tr' ? a.full_text_tr ?? a.summary_tr : a.full_text_fa ?? a.full_text_src ?? a.summary_fa) ?? a.summary_src ?? '';
  const bullets = await summarizeBullets(title, `${text}`.trim() || title, lang);
  if (!bullets) return NextResponse.json({ error: 'özet üretilemedi' }, { status: 502 });
  await db.from('articles').update(lang === 'tr' ? { ai_summary_tr: bullets } : { ai_summary_fa: bullets }).eq('id', a.id);
  return NextResponse.json({ bullets, cached: false });
}
