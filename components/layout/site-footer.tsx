import type { Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';

export function SiteFooter({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <footer className="mt-12 border-t border-oled-border py-8 text-center text-xs text-muted-foreground">
      <div className="container space-y-2">
        <p className="font-semibold text-foreground">{t.siteName}</p>
        <p>{t.footer}</p>
        <p>{t.marketNote}</p>
      </div>
    </footer>
  );
}
