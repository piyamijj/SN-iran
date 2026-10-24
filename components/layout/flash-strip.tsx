import Link from 'next/link';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { Marquee } from '@/components/layout/marquee';
import type { FlashItem } from '@/types';

export function FlashStrip({ lang, items }: { lang: Lang; items: FlashItem[] }) {
  if (items.length === 0) return null;
  const t = getDictionary(lang);
  return (
    <div className="border-t border-oled-border bg-oled-panel">
      <div className="container flex items-center gap-3 py-1.5 text-sm">
        <span className="shrink-0 rounded bg-red-600 px-2 py-0.5 text-xs font-bold text-white">{t.flash}</span>
        <div className="min-w-0 flex-1">
          <Marquee rtl={lang === 'fa'} seconds={Math.max(25, items.length * 12)}>
            {items.map((i) => (
              <Link key={i.id} href={`/${lang}/article/${i.slug}` as never} className="hover:text-brand-light">{i.title}</Link>
            ))}
          </Marquee>
        </div>
      </div>
    </div>
  );
}
