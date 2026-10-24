import { NextRequest, NextResponse } from 'next/server';
import { runIngest } from '@/lib/news/ingest';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** GET /api/cron/rss-ingest — Authorization: Bearer <CRON_SECRET> ister. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET tanımlı değil.' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runIngest());
  } catch (e) {
    return NextResponse.json({ status: 'error', message: e instanceof Error ? e.message : 'bilinmeyen hata' }, { status: 500 });
  }
}
