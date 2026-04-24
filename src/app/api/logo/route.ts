import { NextRequest, NextResponse } from 'next/server';
import { getLogoUrl } from '@/lib/logoUrl';
import { isCryptoSymbol } from '@/lib/formatters';
import { resolveSymbol } from '@/lib/symbolUtils';
import { LruCache } from '@/lib/lruCache';

/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const cache = new LruCache<string, { url: string | null; expiry: number }>(2000);

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ url: null }, { status: 400 });
  }

  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json({ url: cached.url });
  }

  // Crypto: resolve immediately from static map (handles both "BTC-USD" and bare "BTC")
  const resolved = resolveSymbol(symbol);
  if (isCryptoSymbol(resolved)) {
    const url = getLogoUrl(resolved);
    cache.set(symbol, { url, expiry: Date.now() + 86_400_000 }); // 24h
    return NextResponse.json({ url });
  }

  // Try well-known domains first (no API call needed)
  const knownUrl = getLogoUrl(symbol);
  if (knownUrl) {
    cache.set(symbol, { url: knownUrl, expiry: Date.now() + 86_400_000 }); // 24h
    return NextResponse.json({ url: knownUrl });
  }

  // Stocks/ETFs: fetch website from Yahoo Finance as fallback
  try {
    const summary: any = await yahooFinance.quoteSummary(symbol, {
      modules: ['assetProfile'],
    });
    const website = summary.assetProfile?.website || '';
    const url = getLogoUrl(symbol, website);
    cache.set(symbol, { url, expiry: Date.now() + 3_600_000 }); // 1h
    return NextResponse.json({ url });
  } catch {
    cache.set(symbol, { url: null, expiry: Date.now() + 600_000 }); // 10min on error
    return NextResponse.json({ url: null });
  }
}
