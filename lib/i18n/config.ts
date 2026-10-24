export const LANGS = ['fa', 'tr'] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = 'fa';

export function isLang(value: string | undefined | null): value is Lang {
  return value === 'fa' || value === 'tr';
}
export const dirOf = (lang: Lang) => (lang === 'fa' ? 'rtl' : 'ltr');
export const localeOf = (lang: Lang) => (lang === 'fa' ? 'fa-IR' : 'tr-TR');
export const siteDomain = process.env.NEXT_PUBLIC_DOMAIN ?? 'sn-iran.vercel.app';
export const siteUrl = `https://${siteDomain}`;
