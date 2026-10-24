import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

import { LANGS, isLang, siteUrl, type Lang } from '@/lib/i18n/config';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { formatDateTime } from '@/lib/i18n/format';
import { getArticleBySlug, getRelated } from '@/lib/news/queries';
import { ArticleTools } from '@/components/news/article-tools';
import { NewsCard } from '@/components/news/news-card';

export const revalidate = 300;

interface Props { params: { lang: string; slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isLang(params.lang)) return {};
  const a = await getArticleBySlug(params.slug, params.lang);
  if (!a) return {};
  return {
    title: a.title,
    description: a.summary.slice(0, 160),
    alternates: {
      canonical: `${siteUrl}/${params.lang}/article/${params.slug}`,
      languages: Object.fromEntries([...LANGS.map((l) => [l, `${siteUrl}/${l}/article/${params.slug}`]), ['x-default', `${siteUrl}/fa/article/${params.slug}`]]),
    },
    openGraph: { type: 'article', title: a.title, description: a.summary.slice(0, 160), publishedTime: a.publishedAt },
  };
}

export default async function ArticlePage({ params }: Props) {
  if (!isLang(params.lang)) notFound();
  const lang = params.lang as Lang;
  const t = getDictionary(lang);
  const a = await getArticleBySlug(params.slug, lang);
  if (!a) notFound();
  const related = await getRelated(a.category, a.region, a.id, lang);

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle', headline: a.title, description: a.summary,
    datePublished: a.publishedAt, inLanguage: lang, image: a.imageUrl ? [a.imageUrl] : undefined,
    isBasedOn: a.sourceUrl, publisher: { '@type': 'Organization', name: t.siteName },
  };

  return (
    <div className="container max-w-3xl py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/${lang}?region=${a.region}` as never} className="text-sm text-muted-foreground hover:text-foreground">← {t.back}</Link>
      <article className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-brand/15 px-2 py-0.5 font-semibold text-brand-light">{t.categories[a.category]}</span>
          <span>{a.sourceName}</span>
          <span className="num">· {formatDateTime(a.publishedAt, lang)}</span>
        </div>
        <h1 className="text-2xl font-extrabold leading-snug sm:text-3xl">{a.title}</h1>
        {a.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imageUrl} alt="" referrerPolicy="no-referrer" className="w-full rounded-xl object-cover" />
        )}
        {a.summary && <p className="text-lg text-muted-foreground">{a.summary}</p>}
        {a.translated && <p className="text-xs text-muted-foreground">{t.translatedNote}</p>}

        <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-light hover:underline">
          <ExternalLink className="h-4 w-4" />{t.readAtSource} — {a.sourceName}
        </a>

        <ArticleTools slug={a.slug} lang={lang} title={a.title} summary={a.summary} initialAiSummary={a.aiSummary} initialFullText={a.fullText} />

        {a.translated && a.titleSrc !== a.title && (
          <details className="rounded-xl border border-oled-border p-3 text-sm">
            <summary className="cursor-pointer font-semibold">{t.originalNote}</summary>
            <p dir={a.sourceLang === 'fa' ? 'rtl' : 'ltr'} className="mt-2 font-semibold">{a.titleSrc}</p>
            {a.summarySrc && <p dir={a.sourceLang === 'fa' ? 'rtl' : 'ltr'} className="mt-1 text-muted-foreground">{a.summarySrc}</p>}
          </details>
        )}
      </article>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">{t.related}</h2>
          <div className="grid gap-4 sm:grid-cols-2">{related.map((r) => <NewsCard key={r.id} item={r} lang={lang} />)}</div>
        </section>
      )}
    </div>
  );
}
