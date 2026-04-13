import { NextRequest, NextResponse } from 'next/server';
import { getQuote as yahooGetQuote, getQuotes as yahooGetQuotes } from '@/lib/yahoo';
import { getQuote as cgGetQuote, getQuotes as cgGetQuotes, hasCoinGeckoId } from '@/lib/coingecko';
import { resolveSymbol } from '@/lib/symbolUtils';
import { isCryptoSymbol } from '@/lib/formatters';

function useCoinGecko(symbol: string): boolean {
  return isCryptoSymbol(symbol) && hasCoinGeckoId(symbol);
}

export async function GET(request: NextRequest) {
  try {
    const symbol = request.nextUrl.searchParams.get('symbol');
    const symbols = request.nextUrl.searchParams.get('symbols');

    if (symbols) {
      const list = symbols.split(',').map(s => resolveSymbol(s)).filter(Boolean);
      const cryptoSymbols = list.filter(useCoinGecko);
      const stockSymbols = list.filter(s => !useCoinGecko(s));

      const [cryptoQuotes, stockQuotes] = await Promise.all([
        cryptoSymbols.length > 0 ? cgGetQuotes(cryptoSymbols) : [],
        stockSymbols.length > 0 ? yahooGetQuotes(stockSymbols) : [],
      ]);

      return NextResponse.json({ quotes: [...cryptoQuotes, ...stockQuotes] }, {
        headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
      });
    }

    if (symbol) {
      const resolved = resolveSymbol(symbol);
      const quote = useCoinGecko(resolved)
        ? await cgGetQuote(resolved)
        : await yahooGetQuote(resolved);
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
