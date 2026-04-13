import { NextRequest, NextResponse } from 'next/server';
import { getCandles as yahooGetCandles } from '@/lib/yahoo';
import { getCandles as cgGetCandles, hasCoinGeckoId } from '@/lib/coingecko';
import { resolveSymbol } from '@/lib/symbolUtils';
import { isCryptoSymbol } from '@/lib/formatters';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const interval = request.nextUrl.searchParams.get('interval') || '1d';
    const range = request.nextUrl.searchParams.get('range') || '3m';

    if (!symbol) {
      return NextResponse.json({ error: 'symbol parameter required' }, { status: 400 });
    }

    const resolved = resolveSymbol(symbol);
    const candles = isCryptoSymbol(resolved) && hasCoinGeckoId(resolved)
      ? await cgGetCandles(resolved, interval, range)
      : await yahooGetCandles(resolved, interval, range);

    return NextResponse.json({ candles, symbol: resolved }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch candles' },
      { status: 500 }
    );
  }
}
