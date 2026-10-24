import Link from 'next/link';
import type { Lang } from '@/lib/i18n/config';
import { isLang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getArticles } from '@/lib/news/queries';
import { NewsFeed } from '@/components/news/news-feed';
import { NEWS_CATEGORIES, type NewsCategory, type Region } from '@/types';

export const revalidate = 60;

interface Props { params: { lang: string }; searchParams: { region?: string; category?: string } }

export default async function HomePage({ params, searchParams }: Props) {
  const lang = (isLang(params.lang) ? params.lang : 'fa') as Lang;
  const t = getDictionary(lang);
  const region: Region = searchParams.region === 'intl' ? 'intl' : 'iran';
  const category = NEWS_CATEGORIES.includes(searchParams.category as NewsCategory) ? (searchParams.category as NewsCategory) : undefined;
  const { items, nextCursor } = await getArticles({ lang, region, category });

  const chip = (active: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${active ? 'bg-brand text-white' : 'bg-oled-panel2 text-muted-foreground hover:text-foreground'}`;
  const href = (r: Region, c?: string) => `/${lang}?region=${r}${c ? `&category=${c}` : ''}`;

  return (
    <div className="container py-6">
      <div className="mb-5 flex gap-2 border-b border-oled-border pb-3">
        <Link href={href('iran') as never} className={chip(region === 'iran')}>{t.navIran}</Link>
        <Link href={href('intl') as never} className={chip(region === 'intl')}>{t.navIntl}</Link>
      </div>
      <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto">
        <Link href={href(region) as never} className={chip(!category)}>{t.all}</Link>
        {NEWS_CATEGORIES.map((c) => (
          <Link key={c} href={href(region, c) as never} className={chip(category === c)}>{t.categories[c]}</Link>
        ))}
      </div>
      <NewsFeed key={`${lang}-${region}-${category ?? 'all'}`} lang={lang} region={region} category={category} initial={items} initialCursor={nextCursor} />
    </div>
  );
}
