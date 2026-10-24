'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Send, X } from 'lucide-react';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { ChatMessage } from '@/types';

/** RAG chatbot: yanıtlar kullanıcının seçili dilinde (fa/tr) döner. */
export function FloatingChatbot({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages([]); }, [lang]); // dil değişince karşılama ve bağlam sıfırlanır
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next); setInput(''); setBusy(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, messages: next.map(({ role, content }) => ({ role, content })) }) });
      const data = await res.json();
      setMessages([...next, { role: 'assistant', content: data.content ?? t.chatError, cited: data.cited }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: t.chatError }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-4 end-4 z-50">
      {open ? (
        <div className="flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-oled-border bg-oled-panel shadow-2xl">
          <div className="flex items-center justify-between bg-brand px-4 py-2.5 text-white">
            <span className="font-bold">{t.chatTitle}</span>
            <button onClick={() => setOpen(false)} aria-label={t.close}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            <div className="rounded-xl bg-oled-panel2 p-3">{t.chatWelcome}</div>
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ms-8 rounded-xl bg-brand/20 p-3' : 'me-8 rounded-xl bg-oled-panel2 p-3'}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.cited && m.cited.length > 0 && (
                  <div className="mt-2 border-t border-oled-border pt-2 text-xs text-muted-foreground">
                    {t.chatSources}: {m.cited.map((c) => <Link key={c.slug} href={`/${lang}/article/${c.slug}` as never} className="me-2 underline">{c.title.slice(0, 40)}</Link>)}
                  </div>
                )}
              </div>
            ))}
            {busy && <div className="me-8 rounded-xl bg-oled-panel2 p-3 text-muted-foreground">…</div>}
            <div ref={endRef} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2 border-t border-oled-border p-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.chatPlaceholder} className="min-w-0 flex-1 rounded-full bg-oled-panel2 px-4 py-2 text-sm outline-none" />
            <button type="submit" disabled={busy} className="rounded-full bg-brand p-2 text-white disabled:opacity-50" aria-label={t.send}><Send className="h-4 w-4 rtl:-scale-x-100" /></button>
          </form>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} aria-label={t.open} className="rounded-full bg-brand p-4 text-white shadow-lg"><MessageCircle className="h-6 w-6" /></button>
      )}
    </div>
  );
}
