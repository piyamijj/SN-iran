import Groq from 'groq-sdk';
import { geminiGenerate } from '@/lib/ai/gemini';
import type { NewsCategory } from '@/types';
import { NEWS_CATEGORIES } from '@/types';

/**
 * Ucuz/hızlı model: çeviri ve özet. GROQ_FAST_MODEL ile değiştirilebilir.
 * Groq başarısız olursa (anahtar yok, kota, model kapandı) Gemini'ye düşer.
 */
const FAST_MODEL = process.env.GROQ_FAST_MODEL ?? 'openai/gpt-oss-20b';
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? 'openai/gpt-oss-120b';

const groqClients = new Map<string, Groq>();
let groqIdx = 0;
/** GROQ_API_KEYS (virgülle ayrılmış) veya GROQ_API_KEY: istekler anahtarlar arasında dönüşümlü dağıtılır. */
function getGroq(): Groq | null {
  const keys = [...(process.env.GROQ_API_KEYS ?? '').split(','), process.env.GROQ_API_KEY].map((k) => k?.trim()).filter((k): k is string => !!k);
  if (keys.length === 0) return null;
  const key = keys[groqIdx++ % keys.length];
  let c = groqClients.get(key);
  if (!c) { c = new Groq({ apiKey: key }); groqClients.set(key, c); }
  return c;
}

export async function llmText(system: string, user: string, opts: { json?: boolean; chat?: boolean; maxTokens?: number } = {}): Promise<string | null> {
  const client = getGroq();
  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: opts.chat ? CHAT_MODEL : FAST_MODEL,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.2,
        max_tokens: opts.maxTokens ?? 2000,
        reasoning_effort: 'low',
        ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) {
      console.error('[llm] Groq hata, Gemini yedeğine geçiliyor:', e instanceof Error ? e.message : e);
    }
  }
  return geminiGenerate(system, user, opts.json);
}

export async function llmChat(system: string, messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string | null> {
  const client = getGroq();
  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: CHAT_MODEL,
        messages: [{ role: 'system', content: system }, ...messages],
        temperature: 0.3,
        max_tokens: 700,
        reasoning_effort: 'low',
      });
      const text = completion.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) {
      console.error('[llm] Groq sohbet hatası:', e instanceof Error ? e.message : e);
    }
  }
  const last = messages[messages.length - 1]?.content ?? '';
  const history = messages.slice(0, -1).map((m) => `${m.role}: ${m.content}`).join('\n');
  return geminiGenerate(system, `${history}\nuser: ${last}`);
}

function parseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw.replace(/^```json\s*|```$/g, '').trim()) as T;
  } catch {
    return null;
  }
}

export interface TranslateInput { id: string; title: string; summary: string }
export interface TranslateOutput { id: string; title: string; summary: string; category?: NewsCategory }

const LANG_NAME = { fa: 'Persian (Farsi)', tr: 'Turkish', en: 'English' } as const;

/**
 * Başlık+özeti HAM ÇEVİRİ olarak çevirir (yeniden yazma/özetleme yok).
 * Tek istekte birden fazla haber; ayrıca kategori de döner (ek maliyet yok).
 */
export async function translateBatch(
  items: TranslateInput[],
  from: 'fa' | 'en',
  to: 'fa' | 'tr',
  withCategory: boolean,
): Promise<Map<string, TranslateOutput>> {
  const out = new Map<string, TranslateOutput>();
  if (items.length === 0) return out;
  const system = [
    `You are a professional news translator. Translate from ${LANG_NAME[from]} to ${LANG_NAME[to]}.`,
    'Translate faithfully and literally in a neutral news register. Do NOT rewrite, summarize, add or remove information, or add commentary.',
    'Keep proper nouns, numbers and quotes accurate. If the summary is empty, return an empty string.',
    withCategory ? `Also classify each item into exactly one category from: ${NEWS_CATEGORIES.join(', ')}.` : '',
    `Reply ONLY with JSON: {"items":[{"id":"...","title":"...","summary":"..."${withCategory ? ',"category":"..."' : ''}}]}`,
  ].filter(Boolean).join('\n');
  const user = JSON.stringify({ items });
  const parsed = parseJson<{ items?: TranslateOutput[] }>(await llmText(system, user, { json: true, maxTokens: 4000 }));
  for (const it of parsed?.items ?? []) {
    if (it && typeof it.id === 'string' && typeof it.title === 'string') {
      const category = NEWS_CATEGORIES.includes(it.category as NewsCategory) ? (it.category as NewsCategory) : undefined;
      out.set(it.id, { id: it.id, title: it.title.trim(), summary: (it.summary ?? '').trim(), category });
    }
  }
  return out;
}

/** Uzun metni paragraf sınırlarından bölüp çevirir. */
export async function translateLongText(text: string, from: 'fa' | 'en', to: 'fa' | 'tr'): Promise<string | null> {
  const chunks: string[] = [];
  let current = '';
  for (const para of text.split(/\n+/)) {
    if ((current + para).length > 2500 && current) {
      chunks.push(current);
      current = '';
    }
    current += `${para}\n`;
  }
  if (current.trim()) chunks.push(current);
  const system = `Translate the following news text from ${LANG_NAME[from]} to ${LANG_NAME[to]}. Faithful translation only; keep paragraph breaks; no commentary.`;
  const parts: string[] = [];
  for (const chunk of chunks.slice(0, 8)) {
    const r = await llmText(system, chunk, { maxTokens: 4000 });
    if (!r) return null;
    parts.push(r);
  }
  return parts.join('\n\n');
}

/** Haber okurken gösterilen 3 maddelik hızlı özet, istenen dilde. */
export async function summarizeBullets(title: string, body: string, lang: 'fa' | 'tr'): Promise<string[] | null> {
  const system = [
    `You write a quick summary of a news item in ${LANG_NAME[lang]}.`,
    'Use ONLY facts present in the given text. No speculation, no opinions. Exactly 3 short bullet sentences.',
    'Reply ONLY with JSON: {"bullets":["...","...","..."]}',
  ].join('\n');
  const parsed = parseJson<{ bullets?: string[] }>(await llmText(system, `Title: ${title}\n\nText: ${body.slice(0, 6000)}`, { json: true, maxTokens: 800 }));
  const bullets = parsed?.bullets?.filter((b) => typeof b === 'string' && b.trim()).slice(0, 3);
  return bullets && bullets.length > 0 ? bullets : null;
}
