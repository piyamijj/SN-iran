// GEÇİCİ: kurulum sırasında migration çalıştırmak için. Kurulumdan sonra silinecek.
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'no' }, { status: 401 });
  const sql = await req.text();
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  try {
    await c.connect();
    const r = await c.query(sql);
    return NextResponse.json({ ok: true, rows: Array.isArray(r) ? r.map((x) => x.rows) : r.rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.replace(/postgres(ql)?:\/\/\S+/g, '<db>') : 'err' }, { status: 500 });
  } finally {
    await c.end().catch(() => undefined);
  }
}
