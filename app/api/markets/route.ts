import { NextResponse } from 'next/server';
import { getMarketQuotes } from '@/lib/markets/provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ quotes: await getMarketQuotes() });
}
