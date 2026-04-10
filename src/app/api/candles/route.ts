import { NextRequest, NextResponse } from 'next/server';
import { getCandles } from '@/lib/yahoo';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const interval = request.nextUrl.searchParams.get('interval') || '1d';
    const range = request.nextUrl.searchParams.get('range') || '3m';

    if (!symbol) {
      return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
    }

    const candles = await getCandles(symbol.toUpperCase(), interval, range);
    return NextResponse.json({ candles, symbol: symbol.toUpperCase() }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch candles' },
      { status: 500 }
    );
  }
}
