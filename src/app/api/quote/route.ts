import { NextRequest, NextResponse } from 'next/server';
import { getQuote, getQuotes } from '@/lib/yahoo';

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const symbols = request.nextUrl.searchParams.get('symbols');

    if (symbols) {
      const list = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const quotes = await getQuotes(list);
      return NextResponse.json({ quotes }, {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
      });
    }

    if (symbol) {
      const quote = await getQuote(symbol.toUpperCase());
      return NextResponse.json({ quote }, {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
      });
    }

    return NextResponse.json({ error: 'symbol or symbols parameter required' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}
