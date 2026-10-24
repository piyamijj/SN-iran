import type { MarketQuote, MarketSymbol } from '@/types';
import { cacheMarketQuotes, getCachedMarketQuotes } from '@/lib/redis/client';

/**
 * Anahtarsız Yahoo Finance chart uç noktası.
 * UYARI: USDIRR=X resmî/bankalararası kurdur; Tahran serbest piyasası (bonbast/alanchand)
 * için ücretsiz ve kararlı bir resmî API yoktur. README'de serbest piyasa için
 * OPEN_MARKET_USD_URL (opsiyonel JSON kaynağı) seçeneği anlatılır.
 */
const SYMBOLS: { symbol: MarketSymbol; yahoo: string }[] = [
  { symbol: 'USDIRR', yahoo: 'USDIRR=X' },
  { symbol: 'USDTRY', yahoo: 'TRY=X' },
  { symbol: 'GOLD', yahoo: 'GC=F' },
  { symbol: 'BRENT', yahoo: 'BZ=F' },
  { symbol: 'BTC', yahoo: 'BTC-USD' },
];

async function fetchYahoo(symbol: string) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SNIranBot/1.0)' },
      signal: AbortSignal.timeout(6000), cache: 'no-store',
    });
    if (!res.ok) return null;
    const meta = (await res.json())?.chart?.result?.[0]?.meta;
    if (typeof meta?.regularMarketPrice !== 'number') return null;
    const prev = typeof meta.chartPreviousClose === 'number' ? meta.chartPreviousClose : meta.regularMarketPrice;
    return { price: meta.regularMarketPrice as number, prev: prev as number };
  } catch {
    return null;
  }
}

export async function getMarketQuotes(): Promise<MarketQuote[]> {
  try {
    const cached = await getCachedMarketQuotes();
    if (cached?.length) return cached;
  } catch { /* Redis opsiyonel */ }
  const now = new Date().toISOString();
  const results = await Promise.all(SYMBOLS.map(async (s) => ({ s, q: await fetchYahoo(s.yahoo) })));
  const quotes: MarketQuote[] = results.flatMap(({ s, q }) => {
    if (!q) return [];
    const changePercent = q.prev ? ((q.price - q.prev) / q.prev) * 100 : 0;
    return [{ symbol: s.symbol, price: q.price, changePercent, direction: Math.abs(changePercent) < 0.005 ? 'flat' : changePercent > 0 ? 'up' : 'down', updatedAt: now } as MarketQuote];
  });
  if (quotes.length) { try { await cacheMarketQuotes(quotes); } catch { /* yoksay */ } }
  return quotes;
}
