import { ImageResponse } from 'next/og';
import { getArticleBySlug } from '@/lib/news/queries';

export const runtime = 'nodejs';
export const alt = 'SN-iran';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * OG görseli. Satori varsayılan fontu Arapça harfleri doğru birleştirmediği için
 * Farsça sayfalarda başlık yerine marka kartı, Türkçe sayfalarda Türkçe başlık gösterilir.
 */
export default async function OgImage({ params }: { params: { lang: string; slug: string } }) {
  const tr = params.lang === 'tr';
  const a = tr ? await getArticleBySlug(params.slug, 'tr') : null;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#09090b', color: '#fafafa', padding: 64 }}>
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#4ade80' }}>SN Iran</div>
        <div style={{ display: 'flex', fontSize: a ? 56 : 72, fontWeight: 800, lineHeight: 1.2 }}>
          {a ? a.title.slice(0, 140) : 'Iran News · Persian & Turkish'}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: '#a1a1aa' }}>{a ? a.sourceName : 'AI summaries · translation · audio'}</div>
      </div>
    ),
    size,
  );
}
