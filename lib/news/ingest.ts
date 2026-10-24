import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { fetchFeed, normalizeForHash, sha256 } from '@/lib/news/fetch-feed';
import { isHashSeen, isSemanticDuplicate, markHashSeen } from '@/lib/news/dedup';
import { generateEmbedding } from '@/lib/ai/gemini';
import { translateBatch, type TranslateInput } from '@/lib/ai/llm';
import type { NewsCategory, RssFeedItem } from '@/types';

interface SourceRow {
  id: string; name: string; display_name: string; display_name_tr: string | null;
  rss_url: string; region: 'iran' | 'intl'; lang: 'fa' | 'en'; use_proxy: boolean;
}

export interface IngestSummary {
  status: 'ok' | 'error';
  message: string;
  sources: { name: string; ok: boolean; items: number; error?: string }[];
  fetched: number; inserted: number; updated: number; translatedBackfill: number;
  duplicates: number; errors: number;
}

/** Vercel 60 sn sınırı için çalıştırma başına işlenecek yeni/değişen haber üst sınırı. */
const MAX_NEW_PER_RUN = Number(process.env.INGEST_MAX_PER_RUN ?? 24);
const MAX_BACKFILL_PER_RUN = 12;
const BATCH_SIZE = 8;
const FLASH_RE = /(خبر فوری|فوری:|^فوری|عاجل|breaking)/i;

type Translated = { fa?: { title: string; summary: string }; tr?: { title: string; summary: string }; category?: NewsCategory };

/** Bir grup haberi (aynı kaynak dili) çevirir: fa kaynak -> tr; en kaynak -> fa + tr. */
async function translateItems(
  rows: { id: string; title: string; summary: string; lang: 'fa' | 'en'; needCategory: boolean }[],
): Promise<Map<string, Translated>> {
  const result = new Map<string, Translated>();
  const byLang = { fa: rows.filter((r) => r.lang === 'fa'), en: rows.filter((r) => r.lang === 'en') };
  for (const lang of ['fa', 'en'] as const) {
    const group = byLang[lang];
    for (let i = 0; i < group.length; i += BATCH_SIZE) {
      const slice = group.slice(i, i + BATCH_SIZE);
      const input: TranslateInput[] = slice.map((r) => ({ id: r.id, title: r.title, summary: r.summary }));
      const [toTr, toFa] = await Promise.all([
        translateBatch(input, lang, 'tr', true),
        lang === 'en' ? translateBatch(input, 'en', 'fa', false) : Promise.resolve(new Map()),
      ]);
      for (const r of slice) {
        const tr = toTr.get(r.id);
        const fa = toFa.get(r.id);
        result.set(r.id, {
          tr: tr ? { title: tr.title, summary: tr.summary } : undefined,
          fa: lang === 'fa' ? { title: r.title, summary: r.summary } : fa ? { title: fa.title, summary: fa.summary } : undefined,
          category: tr?.category,
        });
      }
    }
  }
  return result;
}

export async function runIngest(): Promise<IngestSummary> {
  const db = getSupabaseServiceClient();
  const summary: IngestSummary = { status: 'ok', message: '', sources: [], fetched: 0, inserted: 0, updated: 0, translatedBackfill: 0, duplicates: 0, errors: 0 };

  const { data: srcData, error: srcErr } = await db.from('sources').select('id,name,display_name,display_name_tr,rss_url,region,lang,use_proxy').eq('active', true);
  if (srcErr) return { ...summary, status: 'error', message: `Kaynaklar okunamadı: ${srcErr.message}`, errors: 1 };
  const sources = (srcData ?? []) as SourceRow[];
  const byName = new Map(sources.map((s) => [s.name, s]));

  // 1) Tüm feed'leri paralel çek; biri başarısız olursa diğerleri etkilenmez
  const fetched: RssFeedItem[] = [];
  await Promise.all(sources.map(async (s) => {
    try {
      const items = await fetchFeed(s.name, s.rss_url, s.use_proxy);
      fetched.push(...items);
      summary.sources.push({ name: s.name, ok: true, items: items.length });
      await db.from('sources').update({ last_fetch_at: new Date().toISOString(), last_fetch_status: `ok:${items.length}` }).eq('id', s.id);
    } catch (e) {
      const error = e instanceof Error ? e.message : 'bilinmeyen hata';
      summary.sources.push({ name: s.name, ok: false, items: 0, error });
      await db.from('sources').update({ last_fetch_at: new Date().toISOString(), last_fetch_status: `error:${error}`.slice(0, 200) }).eq('id', s.id);
    }
  }));
  summary.fetched = fetched.length;

  // 2) Mevcut kayıtlar: yeni mi, kaynak metni değişmiş mi?
  const time = (i: RssFeedItem) => (i.isoDate ? new Date(i.isoDate).getTime() || 0 : 0);
  fetched.sort((a, b) => time(b) - time(a));
  const links = fetched.map((i) => i.link);
  const existing = new Map<string, { id: string; src_fingerprint: string }>();
  for (let i = 0; i < links.length; i += 150) {
    const { data } = await db.from('articles').select('id,source_url,src_fingerprint').in('source_url', links.slice(i, i + 150));
    for (const r of data ?? []) existing.set(r.source_url, { id: r.id, src_fingerprint: r.src_fingerprint });
  }

  const fresh: { item: RssFeedItem; src: SourceRow; fp: string }[] = [];
  const changed: { item: RssFeedItem; src: SourceRow; fp: string; id: string }[] = [];
  for (const item of fetched) {
    const src = byName.get(item.sourceName);
    if (!src) continue;
    const fp = sha256(`${item.title}\n${item.summary}`);
    const prev = existing.get(item.link);
    if (!prev) fresh.push({ item, src, fp });
    else if (prev.src_fingerprint !== fp) changed.push({ item, src, fp, id: prev.id });
  }

  // Her kaynaktan adil pay: kaynaklar arasında dönüşümlü seç (tek kaynak kuyruğu doldurmasın)
  const queues = new Map<string, typeof fresh>();
  for (const f of fresh) queues.set(f.src.name, [...(queues.get(f.src.name) ?? []), f]);
  const picked: typeof fresh = [];
  while (picked.length < MAX_NEW_PER_RUN && [...queues.values()].some((q) => q.length)) {
    for (const q of queues.values()) {
      const n = q.shift();
      if (n && picked.length < MAX_NEW_PER_RUN) picked.push(n);
    }
  }

  // 3) Mükerrer ön eleme (hash), sonra çeviri
  const candidates: (typeof fresh[number] & { hash: string })[] = [];
  const seenThisRun = new Set<string>();
  for (const f of picked) {
    const hash = sha256(normalizeForHash(f.item.title));
    if (seenThisRun.has(hash) || (await isHashSeen(hash))) { summary.duplicates += 1; continue; }
    seenThisRun.add(hash);
    candidates.push({ ...f, hash });
  }

  const translations = await translateItems(candidates.map((c) => ({ id: c.hash, title: c.item.title, summary: c.item.summary, lang: c.src.lang, needCategory: true })));

  // Embedding (paralel, 4'lü gruplar) + anlamsal dedup + insert
  for (let i = 0; i < candidates.length; i += 4) {
    await Promise.all(candidates.slice(i, i + 4).map(async (c) => {
      try {
        const t = translations.get(c.hash);
        const embedding = await generateEmbedding(`${c.item.title}\n${c.item.summary}`);
        if (await isSemanticDuplicate(embedding)) { summary.duplicates += 1; await markHashSeen(c.hash); return; }
        const { error } = await db.from('articles').insert({
          slug: `n-${sha256(c.item.link).slice(0, 12)}`,
          region: c.src.region,
          category: t?.category ?? (c.src.region === 'intl' ? 'world' : 'other'),
          source_id: c.src.id,
          source_name: c.src.display_name,
          source_name_tr: c.src.display_name_tr,
          source_lang: c.src.lang,
          source_url: c.item.link,
          image_url: c.item.imageUrl,
          published_at: c.item.isoDate ? new Date(c.item.isoDate).toISOString() : new Date().toISOString(),
          title_src: c.item.title,
          summary_src: c.item.summary,
          title_fa: t?.fa?.title ?? null, summary_fa: t?.fa?.summary ?? null,
          title_tr: t?.tr?.title ?? null, summary_tr: t?.tr?.summary ?? null,
          src_fingerprint: c.fp,
          translated_at: t?.tr && t?.fa ? new Date().toISOString() : null,
          is_flash: FLASH_RE.test(c.item.title),
          content_hash: c.hash,
          embedding: embedding.length ? embedding : null,
        });
        if (error) {
          if (error.code === '23505') { summary.duplicates += 1; await markHashSeen(c.hash); } else { summary.errors += 1; console.error('[ingest] insert hatası:', error.message); }
          return;
        }
        await markHashSeen(c.hash);
        summary.inserted += 1;
      } catch (e) {
        summary.errors += 1;
        console.error('[ingest] öğe hatası:', e instanceof Error ? e.message : e);
      }
    }));
  }

  // 4) Kaynak metni değişen haberleri yeniden çevir (yalnızca değişenleri)
  const changedPick = changed.slice(0, 8);
  if (changedPick.length) {
    const tr = await translateItems(changedPick.map((c) => ({ id: c.id, title: c.item.title, summary: c.item.summary, lang: c.src.lang, needCategory: false })));
    for (const c of changedPick) {
      const t = tr.get(c.id);
      const { error } = await db.from('articles').update({
        title_src: c.item.title, summary_src: c.item.summary, src_fingerprint: c.fp,
        title_fa: t?.fa?.title ?? null, summary_fa: t?.fa?.summary ?? null,
        title_tr: t?.tr?.title ?? null, summary_tr: t?.tr?.summary ?? null,
        translated_at: t?.tr ? new Date().toISOString() : null,
        ai_summary_fa: null, ai_summary_tr: null, // eski özet geçersiz
      }).eq('id', c.id);
      if (!error) summary.updated += 1;
    }
  }

  // 5) Önceki çalıştırmalarda çevirisi başarısız olanları tamamla (backfill)
  const { data: pending } = await db.from('articles').select('id,title_src,summary_src,source_lang').is('title_tr', null).order('published_at', { ascending: false }).limit(MAX_BACKFILL_PER_RUN);
  if (pending?.length) {
    const tr = await translateItems(pending.map((p) => ({ id: p.id, title: p.title_src, summary: p.summary_src, lang: (p.source_lang === 'en' ? 'en' : 'fa') as 'fa' | 'en', needCategory: false })));
    for (const p of pending) {
      const t = tr.get(p.id);
      if (!t?.tr) continue;
      const { error } = await db.from('articles').update({
        title_tr: t.tr.title, summary_tr: t.tr.summary,
        ...(t.fa ? { title_fa: t.fa.title, summary_fa: t.fa.summary } : {}),
        translated_at: new Date().toISOString(),
      }).eq('id', p.id);
      if (!error) summary.translatedBackfill += 1;
    }
  }

  const failed = summary.sources.filter((s) => !s.ok).map((s) => s.name);
  summary.message = `${sources.length} kaynak, ${summary.fetched} öğe çekildi; ${summary.inserted} eklendi, ${summary.updated} güncellendi, ${summary.translatedBackfill} çeviri tamamlandı, ${summary.duplicates} mükerrer, ${summary.errors} hata.${failed.length ? ` Başarısız kaynaklar: ${failed.join(', ')}.` : ''}`;
  return summary;
}
