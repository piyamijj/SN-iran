// GEÇİCİ: kurulum sırasında migration çalıştırmak için. Kurulumdan sonra silinecek.
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REGIONS = ['eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1', 'sa-east-1', 'ca-central-1', 'me-central-1'];

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'no' }, { status: 401 });
  const sql = await req.text();
  const u = new URL(process.env.SUPABASE_DB_URL ?? '');
  const ref = u.hostname.replace(/^db\.|\.supabase\.co$/g, '');
  const hosts = [`db.${ref}.supabase.co`, ...['aws-0', 'aws-1'].flatMap((p) => REGIONS.map((r) => `${p}-${r}.pooler.supabase.com`))];
  const tried: string[] = [];
  for (const host of hosts) {
    const direct = host.startsWith('db.');
    const c = new Client({ host, port: 5432, user: direct ? decodeURIComponent(u.username) : `postgres.${ref}`, password: decodeURIComponent(u.password), database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3000 });
    try {
      await c.connect();
    } catch (e) {
      tried.push(`${host}: ${e instanceof Error ? e.message.slice(0, 60) : 'err'}`);
      await c.end().catch(() => undefined);
      continue;
    }
    try {
      const r = await c.query(sql);
      return NextResponse.json({ ok: true, host: host.replace(ref, '<ref>'), rows: Array.isArray(r) ? r.map((x) => x.rows) : r.rows });
    } catch (e) {
      return NextResponse.json({ ok: false, host: host.replace(ref, '<ref>'), error: e instanceof Error ? e.message : 'err' }, { status: 500 });
    } finally {
      await c.end().catch(() => undefined);
    }
  }
  return NextResponse.json({ ok: false, tried: tried.slice(0, 40) }, { status: 502 });
}
