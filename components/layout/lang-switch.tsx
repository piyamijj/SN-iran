'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { Lang } from '@/lib/i18n/config';

/** FA <-> TR geçişi: aynı sayfada kalır, yalnızca dil öneki değişir (arayüz + haber metni birlikte). */
export function LangSwitch({ lang }: { lang: Lang }) {
  const pathname = usePathname() ?? `/${lang}`;
  const search = useSearchParams()?.toString();
  const other: Lang = lang === 'fa' ? 'tr' : 'fa';
  const rest = pathname.replace(/^\/(fa|tr)/, '');
  const href = `/${other}${rest}${search ? `?${search}` : ''}`;
  return (
    <div className="flex overflow-hidden rounded-full border border-oled-border text-xs font-semibold" role="group" aria-label="Language">
      {(['fa', 'tr'] as const).map((l) =>
        l === lang ? (
          <span key={l} className="bg-brand px-3 py-1.5 text-white" aria-current="true">{l.toUpperCase()}</span>
        ) : (
          <Link key={l} href={href as never} prefetch={false} hrefLang={l} className="px-3 py-1.5 text-muted-foreground hover:bg-oled-panel2" aria-label={l === 'tr' ? 'Türkçe' : 'فارسی'}>{l.toUpperCase()}</Link>
        ),
      )}
    </div>
  );
}
