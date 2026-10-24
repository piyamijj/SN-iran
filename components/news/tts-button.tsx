'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Square, Volume2, VolumeX } from 'lucide-react';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

type State = 'idle' | 'speaking' | 'paused' | 'unsupported' | 'novoice';

const BCP47: Record<Lang, string> = { tr: 'tr-TR', fa: 'fa-IR' };

/** Metni cümle gruplarına böler (Chrome uzun utterance'ı ~15 sn sonra keser). */
function chunk(text: string, max = 180): string[] {
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?؟۔…])\s+/);
  const out: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).length > max && cur) { out.push(cur); cur = s; } else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Tarayıcı SpeechSynthesis ile sesli okuma. tr: tr-TR sesi. fa: fa-IR sesi varsa kullanılır;
 * yoksa (çoğu cihazda yok) hata vermeden açıklayıcı mesaj gösterilir.
 */
export function TtsButton({ text, lang }: { text: string; lang: Lang }) {
  const t = getDictionary(lang);
  const [state, setState] = useState<State>('idle');
  const queueRef = useRef<SpeechSynthesisUtterance[]>([]);

  const findVoice = useCallback((): SpeechSynthesisVoice | null => {
    const prefix = lang === 'fa' ? 'fa' : 'tr';
    return window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith(prefix)) ?? null;
  }, [lang]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) { setState('unsupported'); return; }
    const check = () => { setState((s) => (s === 'speaking' || s === 'paused' ? s : findVoice() || lang === 'tr' ? 'idle' : 'novoice')); };
    check();
    window.speechSynthesis.addEventListener?.('voiceschanged', check);
    return () => { window.speechSynthesis.removeEventListener?.('voiceschanged', check); window.speechSynthesis.cancel(); };
  }, [findVoice, lang]);

  const start = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = findVoice();
    if (!voice && lang === 'fa') { setState('novoice'); return; }
    const parts = chunk(text);
    queueRef.current = parts.map((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = BCP47[lang];
      if (voice) u.voice = voice;
      u.onend = () => { if (i === parts.length - 1) setState('idle'); };
      u.onerror = () => setState('idle');
      return u;
    });
    queueRef.current.forEach((u) => synth.speak(u));
    setState('speaking');
  };

  const btn = 'inline-flex items-center gap-2 rounded-full border border-oled-border px-4 py-1.5 text-sm font-semibold hover:bg-oled-panel2';

  if (state === 'unsupported') return <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><VolumeX className="h-4 w-4" />{t.ttsUnsupported}</span>;
  if (state === 'novoice') return <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><VolumeX className="h-4 w-4 shrink-0" />{t.ttsNoVoice}</span>;
  if (state === 'idle') return <button className={btn} onClick={start}><Volume2 className="h-4 w-4" />{t.listen}</button>;
  return (
    <div className="flex items-center gap-2">
      {state === 'speaking' ? (
        <button className={btn} onClick={() => { window.speechSynthesis.pause(); setState('paused'); }}><Pause className="h-4 w-4" />{t.pause}</button>
      ) : (
        <button className={btn} onClick={() => { window.speechSynthesis.resume(); setState('speaking'); }}><Play className="h-4 w-4" />{t.resume}</button>
      )}
      <button className={btn} onClick={() => { window.speechSynthesis.cancel(); setState('idle'); }}><Square className="h-4 w-4" />{t.stop}</button>
    </div>
  );
}
