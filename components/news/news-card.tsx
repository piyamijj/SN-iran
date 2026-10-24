import Link from 'next/link';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { formatRelative } from '@/lib/i18n/format';
import type { ArticleListItem } from '@/types';

export function NewsCard({ item, lang }: { item: ArticleListItem; lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <article className="group overflow-hidden rounded-xl border border-oled-border bg-oled-panel transition hover:border-brand/60">
      <Link href={`/${lang}/article/${item.slug}` as never} className="block">
        {item.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full object-cover" />
        )}
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-brand/15 px-2 py-0.5 font-semibold text-brand-light">{t.categories[item.category] ?? item.category}</span>
            {item.isFlash && <span className="rounded bg-red-600 px-2 py-0.5 font-bold text-white">{t.flash}</span>}
            <span>{item.sourceName}</span>
            <span className="num">· {formatRelative(item.publishedAt, lang)}</span>
          </div>
          <h2 className="text-base font-bold leading-snug group-hover:text-brand-light">{item.title}</h2>
          {item.summary && <p className="line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>}
        </div>
      </Link>
    </article>
  );
}
