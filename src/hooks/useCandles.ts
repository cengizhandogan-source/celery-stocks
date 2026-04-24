'use client';

import { useState, useEffect } from 'react';
import { Candle } from '@/lib/types';

const TTL_MS = 60_000;

interface CandlesResult {
  candles: Candle[];
  error: string | null;
}

const cache = new Map<string, { result: CandlesResult; expiry: number }>();
const inflight = new Map<string, Promise<CandlesResult>>();

function cacheKey(symbol: string, interval: string, range: string): string {
  return `${symbol}|${interval}|${range}`;
}

async function fetchCandles(symbol: string, interval: string, range: string): Promise<CandlesResult> {
  const key = cacheKey(symbol, interval, range);
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = fetch(
    `/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`,
  )
    .then(async (res) => {
      const data = await res.json();
      const result: CandlesResult = data.error
        ? { candles: [], error: data.error as string }
        : { candles: (data.candles ?? []) as Candle[], error: null };
      cache.set(key, { result, expiry: Date.now() + TTL_MS });
      return result;
    })
    .catch((err) => {
      const result: CandlesResult = {
        candles: [],
        error: err instanceof Error ? err.message : 'Failed to fetch',
      };
      return result;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

export function useCandles(symbol: string, interval: string, range: string) {
  const key = symbol ? cacheKey(symbol, interval, range) : '';
  const initial = key ? cache.get(key) : undefined;
  const isFresh = initial && Date.now() < initial.expiry;

  const [candles, setCandles] = useState<Candle[]>(isFresh ? initial!.result.candles : []);
  const [loading, setLoading] = useState(!isFresh);
  const [error, setError] = useState<string | null>(isFresh ? initial!.result.error : null);

  useEffect(() => {
    if (!symbol) return;

    const entry = cache.get(cacheKey(symbol, interval, range));
    if (entry && Date.now() < entry.expiry) {
      setCandles(entry.result.candles);
      setError(entry.result.error);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchCandles(symbol, interval, range).then((result) => {
      if (cancelled) return;
      setCandles(result.candles);
      setError(result.error);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [symbol, interval, range]);

  return { candles, loading, error };
}
