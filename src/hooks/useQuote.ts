'use client';

import { useState, useEffect, useRef } from 'react';
import { Quote } from '@/lib/types';
import { QUOTE_POLL_INTERVAL } from '@/lib/constants';

export function useQuote(symbol: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchQuote() {
      try {
        const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
          } else {
            setQuote(data.quote);
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

    setLoading(true);
    fetchQuote();

    intervalRef.current = setInterval(fetchQuote, QUOTE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbol]);

  return { quote, loading, error };
}
