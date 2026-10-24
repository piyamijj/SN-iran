import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/ai/gemini';
import { llmChat } from '@/lib/ai/llm';
import { allow, clientIp } from '@/lib/rate-limit';
import { getDictionary } from '@/lib/i18n/dictionaries';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface Match {
  slug: string; title_fa: string | null; title_tr: string | null; title_src: string;
  summary_fa: string | null; summary_tr: string | null; summary_src: string;
  source_name: string; source_name_tr: string | null; published_at: string; category: string;
}

/** POST {messages, lang}: RAG — son 7 günün haberlerinden bağlam çekip kullanıcının dilinde yanıtlar. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { messages?: { role: 'user' | 'assistant'; content: string }[]; lang?: string } | null;
  const lang = body?.lang === 'tr' ? 'tr' : 'fa';
  const t = getDictionary(lang);
  const messages = (body?.messages ?? []).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-8);
  const last = [...messages].reverse().find((m) => m.role === 'user');
  if (!last?.content.trim()) return NextResponse.json({ content: t.chatError, cited: [] }, { status: 400 });
  if (!(await allow(`chat:${clientIp(request)}`, 15))) return NextResponse.json({ content: t.chatError, cited: [] }, { status: 429 });

  try {
    const embedding = await generateEmbedding(last.content);
    let matches: Match[] = [];
    if (embedding.length) {
      const { data } = await getSupabaseServiceClient().rpc('match_articles_for_rag', { query_embedding: embedding, match_count: 6, day_range: 7 });
      matches = (data ?? []) as Match[];
    }
    const langName = lang === 'tr' ? 'Turkish' : 'Persian (Farsi)';
    const context = matches.map((m, i) => {
      const title = lang === 'tr' ? m.title_tr ?? m.title_fa ?? m.title_src : m.title_fa ?? m.title_src;
      const summary = lang === 'tr' ? m.summary_tr ?? m.summary_fa ?? m.summary_src : m.summary_fa ?? m.summary_src;
      return `[${i + 1}] ${title}\nSource: ${lang === 'tr' ? m.source_name_tr ?? m.source_name : m.source_name} | ${m.published_at}\n${summary}`;
    }).join('\n\n');
    const system = [
      `You are the news assistant of SN-iran, a news site about Iran. ALWAYS answer in ${langName}, whatever language the question is in.`,
      'Answer ONLY from the news context below. Never invent facts. If the context does not cover the question, say so plainly.',
      'Be concise (max ~6 sentences). Mention which source/headline your answer relies on.',
      matches.length ? `=== NEWS CONTEXT ===\n${context}\n=== END ===` : 'No relevant news was found in the last 7 days; say so and do not guess.',
    ].join('\n');
    const reply = await llmChat(system, messages);
    if (!reply) return NextResponse.json({ content: t.chatError, cited: [] });
    return NextResponse.json({
      content: reply,
      cited: matches.slice(0, 3).map((m) => ({ slug: m.slug, title: lang === 'tr' ? m.title_tr ?? m.title_fa ?? m.title_src : m.title_fa ?? m.title_src })),
    });
  } catch {
    return NextResponse.json({ content: t.chatError, cited: [] });
  }
}
