'use client';

import { useEffect, useState } from 'react';
import type { Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { MarketQuote, MarketSymbol } from '@/types';

const LABELS: Record<Lang, Record<MarketSymbol, string>> = {
  fa: { USDIRR: 'دلار/ریال (رسمی)', USDTRY: 'دلار/لیر', GOLD: 'طلا (اونس $)', BRENT: 'برنت ($)', BTC: 'بیت‌کوین ($)' },
  tr: { USDIRR: 'USD/IRR (resmî)', USDTRY: 'USD/TRY', GOLD: 'Altın (ons $)', BRENT: 'Brent ($)', BTC: 'BTC ($)' },
};

export function MarketTicker({ lang }: { lang: Lang }) {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const t = getDictionary(lang);

  useEffect(() => {
    let alive = true;
    const load = () => fetch('/api/markets').then((r) => r.json()).then((d) => alive && setQuotes(d.quotes ?? [])).catch(() => undefined);
    load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (quotes.length === 0) return null;
  return (
    <div className="border-b border-oled-border bg-oled-panel text-xs" title={t.marketNote}>
      <div className="container hide-scrollbar flex gap-5 overflow-x-auto whitespace-nowrap py-1.5" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
        {quotes.map((q) => (
          <span key={q.symbol} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{LABELS[lang][q.symbol]}</span>
            <span className="num font-semibold">{formatNumber(q.price, lang, q.price < 100 ? 2 : 0)}</span>
            <span className={`num ${q.direction === 'up' ? 'text-market-up' : q.direction === 'down' ? 'text-market-down' : 'text-market-flat'}`} dir="ltr">
              {q.direction === 'up' ? '▲' : q.direction === 'down' ? '▼' : '•'} {Math.abs(q.changePercent).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
