import type { Metadata } from 'next';
import { Inter, Vazirmatn } from 'next/font/google';
import { notFound } from 'next/navigation';

import '../globals.css';
import { LANGS, dirOf, isLang, siteUrl, type Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { FloatingChatbot } from '@/components/chat/floating-chatbot';
import { getFlashItems } from '@/lib/news/queries';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const vazir = Vazirmatn({ subsets: ['arabic', 'latin'], variable: '--font-vazir', display: 'swap' });

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: { lang: string } }): Promise<Metadata> {
  if (!isLang(params.lang)) return {};
  const lang = params.lang;
  const t = getDictionary(lang);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: `${t.siteName} — ${t.tagline}`, template: `%s — ${t.siteName}` },
    description: t.description,
    openGraph: { type: 'website', siteName: t.siteName, locale: lang === 'fa' ? 'fa_IR' : 'tr_TR', alternateLocale: lang === 'fa' ? 'tr_TR' : 'fa_IR', title: t.siteName, description: t.description },
    alternates: {
      canonical: `${siteUrl}/${lang}`,
      languages: { fa: `${siteUrl}/fa`, tr: `${siteUrl}/tr`, 'x-default': `${siteUrl}/fa` },
      types: { 'application/rss+xml': `${siteUrl}/${lang}/feed.xml` },
    },
    robots: { index: true, follow: true },
  };
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang as Lang;
  const flash = await getFlashItems(lang);
  return (
    <html lang={lang} dir={dirOf(lang)} className={`dark ${inter.variable} ${vazir.variable}`}>
      <body className="min-h-screen bg-oled text-foreground antialiased">
        <SiteHeader lang={lang} flash={flash} />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter lang={lang} />
        <FloatingChatbot lang={lang} />
      </body>
    </html>
  );
}
