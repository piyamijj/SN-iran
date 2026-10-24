'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { NewsCard } from '@/components/news/news-card';
import type { ArticleListItem, NewsCategory, PaginatedArticles, Region } from '@/types';

interface Props { lang: Lang; region: Region; category?: NewsCategory; initial: ArticleListItem[]; initialCursor: string | null }

export function NewsFeed({ lang, region, category, initial, initialCursor }: Props) {
  const t = getDictionary(lang);
  const [items, setItems] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [busy, setBusy] = useState(false);

  async function more() {
    if (!cursor || busy) return;
    setBusy(true);
    try {
      const qs = new URLSearchParams({ lang, region, cursor, ...(category ? { category } : {}) });
      const data = (await (await fetch(`/api/articles?${qs}`)).json()) as PaginatedArticles;
      setItems((prev) => [...prev, ...data.items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setCursor(data.nextCursor);
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-oled-border p-10 text-center">
        <p className="font-semibold">{t.noNews}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.noNewsHint}</p>
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => <NewsCard key={i.id} item={i} lang={lang} />)}
      </div>
      {cursor && (
        <div className="mt-6 text-center">
          <button onClick={more} disabled={busy} className="rounded-full border border-oled-border px-6 py-2 text-sm font-semibold hover:bg-oled-panel2 disabled:opacity-50">
            {busy ? t.loading : t.loadMore}
          </button>
        </div>
      )}
    </>
  );
}
