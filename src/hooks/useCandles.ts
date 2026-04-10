'use client';

import { useState, useEffect } from 'react';
import { Candle } from '@/lib/types';

export function useCandles(symbol: string, interval: string, range: string) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchCandles() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&range=${range}`
        );
        const data = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
            setCandles([]);
          } else {
            setCandles(data.candles);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch');
          setLoading(false);
        }
      }
    }

    fetchCandles();

    return () => { cancelled = true; };
  }, [symbol, interval, range]);

  return { candles, loading, error };
}
