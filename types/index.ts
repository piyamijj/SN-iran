import type { Lang } from '@/lib/i18n/config';

export type Region = 'iran' | 'intl';
export type NewsCategory = 'politics' | 'economy' | 'society' | 'culture' | 'sport' | 'tech' | 'world' | 'other';
export const NEWS_CATEGORIES: NewsCategory[] = ['politics', 'economy', 'society', 'culture', 'sport', 'tech', 'world', 'other'];

/** Seçili dile göre çözümlenmiş haber (liste görünümü). */
export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: NewsCategory;
  region: Region;
  sourceName: string;
  imageUrl: string | null;
  publishedAt: string;
  isFlash: boolean;
  /** Metin makine çevirisi mi (tr, veya yabancı kaynaktan fa)? */
  translated: boolean;
}

export interface ArticleDetail extends ArticleListItem {
  sourceUrl: string;
  sourceLang: string;
  titleSrc: string;
  summarySrc: string;
  aiSummary: string[] | null;
  fullText: string | null;
  fullTextAvailableLang: Lang | null;
}

export interface PaginatedArticles {
  items: ArticleListItem[];
  nextCursor: string | null;
}

export interface FlashItem { id: string; slug: string; title: string; publishedAt: string }

export type MarketSymbol = 'USDIRR' | 'USDTRY' | 'GOLD' | 'BRENT' | 'BTC';
export interface MarketQuote {
  symbol: MarketSymbol;
  price: number;
  changePercent: number;
  direction: 'up' | 'down' | 'flat';
  updatedAt: string;
}

export interface RssFeedItem {
  sourceName: string;
  title: string;
  link: string;
  summary: string;
  isoDate: string | null;
  imageUrl: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  cited?: { title: string; slug: string }[];
}
