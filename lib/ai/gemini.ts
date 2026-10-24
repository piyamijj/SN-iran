/**
 * Gemini yardımcıları: anahtar rotasyonu (kota hatasında yedek anahtar),
 * metin üretimi (yedek LLM) ve embedding (768 boyut, çok dilli).
 */
const GEN_MODEL = process.env.GEMINI_TEXT_MODEL ?? 'gemini-flash-lite-latest';
const EMBED_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;

let activeKey = 0;

function keys(): string[] {
  return [...(process.env.GEMINI_API_KEYS ?? '').split(','), process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].map((k) => k?.trim()).filter((k): k is string => !!k);
}

export function hasGemini(): boolean {
  return keys().length > 0;
}

async function callGemini(path: string, body: unknown): Promise<Response | null> {
  const list = keys();
  if (list.length === 0) return null;
  for (let attempt = 0; attempt < list.length; attempt += 1) {
    const key = list[(activeKey + attempt) % list.length];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${path}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if ((res.status === 429 || res.status === 403) && list.length > 1) {
      activeKey = (activeKey + attempt + 1) % list.length;
      continue;
    }
    return res;
  }
  return null;
}

/** Gemini ile metin üretir; hata olursa null döner (asla fırlatmaz). */
export async function geminiGenerate(system: string, user: string, json = false): Promise<string | null> {
  try {
    const res = await callGemini(`models/${GEN_MODEL}:generateContent`, {
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.2, ...(json ? { responseMimeType: 'application/json' } : {}) },
    });
    if (!res || !res.ok) return null;
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? null;
  } catch {
    return null;
  }
}

/** Çok dilli embedding (fa/en/tr aynı vektör uzayında). Hata olursa boş dizi. */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const res = await callGemini(`models/${EMBED_MODEL}:embedContent`, {
      content: { parts: [{ text: text.slice(0, 8000) }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    });
    if (!res || !res.ok) return [];
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? [];
  } catch {
    return [];
  }
}
