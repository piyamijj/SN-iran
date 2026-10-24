import Link from 'next/link';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { FlashItem } from '@/types';

export function FlashStrip({ lang, items }: { lang: Lang; items: FlashItem[] }) {
  if (items.length === 0) return null;
  const t = getDictionary(lang);
  return (
    <div className="border-t border-oled-border bg-oled-panel">
      <div className="container flex items-center gap-3 py-1.5 text-sm">
        <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{t.flash}</span>
        <div className="hide-scrollbar flex gap-6 overflow-x-auto whitespace-nowrap">
          {items.map((i) => (
            <Link key={i.id} href={`/${lang}/article/${i.slug}` as never} className="hover:text-brand-light">{i.title}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
