'use client';

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { TtsButton } from '@/components/news/tts-button';

interface Props { slug: string; lang: Lang; title: string; summary: string; initialAiSummary: string[] | null; initialFullText: string | null }

/** Haber okunurken: AI hızlı özet (otomatik, önbellekli), isteğe bağlı tam metin çevirisi, sesli okuma. */
export function ArticleTools({ slug, lang, title, summary, initialAiSummary, initialFullText }: Props) {
  const t = getDictionary(lang);
  const [bullets, setBullets] = useState<string[] | null>(initialAiSummary);
  const [sumState, setSumState] = useState<'loading' | 'done' | 'fail'>(initialAiSummary ? 'done' : 'loading');
  const [full, setFull] = useState<string | null>(initialFullText);
  const [fullState, setFullState] = useState<'idle' | 'loading' | 'fail'>('idle');

  useEffect(() => {
    if (initialAiSummary) return;
    let alive = true;
    fetch('/api/ai-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, lang }) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) { setBullets(d.bullets); setSumState('done'); } })
      .catch(() => alive && setSumState('fail'));
    return () => { alive = false; };
  }, [slug, lang, initialAiSummary]);

  async function loadFull() {
    setFullState('loading');
    try {
      const r = await fetch('/api/fulltext', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, lang }) });
      if (!r.ok) throw new Error();
      setFull((await r.json()).text);
      setFullState('idle');
    } catch {
      setFullState('fail');
    }
  }

  const ttsText = [title, summary, ...(bullets ?? []), full ?? ''].filter(Boolean).join('. ');

  return (
    <div className="space-y-6">
      <TtsButton text={ttsText} lang={lang} />

      <section className="rounded-xl border border-brand/30 bg-brand/5 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-brand-light"><Sparkles className="h-4 w-4" />{t.aiSummary}</h3>
        {sumState === 'loading' && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t.aiSummaryLoading}</p>}
        {sumState === 'fail' && <p className="text-sm text-muted-foreground">{t.aiSummaryFail}</p>}
        {bullets && <ul className="list-disc space-y-1 ps-5 text-sm">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}
        <p className="mt-3 text-xs text-muted-foreground">{t.aiDisclaimer}</p>
      </section>

      {full ? (
        <section className="rounded-xl border border-oled-border p-4">
          <h3 className="mb-2 font-bold">{t.fullTextOriginal}</h3>
          <div className="space-y-3 text-sm leading-relaxed">{full.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
          <p className="mt-3 text-xs text-muted-foreground">{t.fullTextNote}</p>
        </section>
      ) : (
        <div>
          <button onClick={loadFull} disabled={fullState === 'loading'} className="inline-flex items-center gap-2 rounded-full border border-oled-border px-4 py-2 text-sm font-semibold hover:bg-oled-panel2 disabled:opacity-60">
            {fullState === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
            {fullState === 'loading' ? t.fullTextLoading : t.fullTextBtn}
          </button>
          {fullState === 'fail' && <p className="mt-2 text-sm text-red-400">{t.fullTextFail}</p>}
        </div>
      )}
    </div>
  );
}
