import { NextRequest, NextResponse } from 'next/server';
import { isLang, DEFAULT_LANG } from '@/lib/i18n/config';
import { getArticles } from '@/lib/news/queries';
import { NEWS_CATEGORIES, type NewsCategory, type Region } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const lang = isLang(p.get('lang')) ? (p.get('lang') as 'fa' | 'tr') : DEFAULT_LANG;
  const region = p.get('region') === 'intl' ? 'intl' : p.get('region') === 'iran' ? 'iran' : undefined;
  const cat = p.get('category');
  const category = NEWS_CATEGORIES.includes(cat as NewsCategory) ? (cat as NewsCategory) : undefined;
  return NextResponse.json(await getArticles({ lang, region: region as Region | undefined, category, cursor: p.get('cursor') }));
}
