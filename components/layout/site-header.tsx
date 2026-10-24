import Link from 'next/link';
import { Suspense } from 'react';
import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { LangSwitch } from '@/components/layout/lang-switch';
import { MarketTicker } from '@/components/layout/market-ticker';
import { FlashStrip } from '@/components/layout/flash-strip';
import type { FlashItem } from '@/types';

export function SiteHeader({ lang, flash }: { lang: Lang; flash: FlashItem[] }) {
  const t = getDictionary(lang);
  return (
    <header className="sticky top-0 z-40 border-b border-oled-border bg-oled/95 backdrop-blur">
      <MarketTicker lang={lang} />
      <div className="container flex items-center justify-between gap-3 py-3">
        <Link href={`/${lang}` as never} className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-brand-light">{t.siteName}</span>
          <span className="hidden text-xs text-muted-foreground sm:inline">{t.tagline}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <Link href={`/${lang}?region=iran` as never} className="rounded-full px-3 py-1.5 hover:bg-oled-panel2">{t.navIran}</Link>
          <Link href={`/${lang}?region=intl` as never} className="rounded-full px-3 py-1.5 hover:bg-oled-panel2">{t.navIntl}</Link>
        </nav>
        <Suspense fallback={<div className="h-8 w-20" />}>
          <LangSwitch lang={lang} />
        </Suspense>
      </div>
      <FlashStrip lang={lang} items={flash} />
    </header>
  );
}
