import { NextRequest, NextResponse } from 'next/server';
import { getFilings } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  try {
    const data = await getFilings(symbol);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
