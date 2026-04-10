'use client';

import { useState, useEffect, useRef } from 'react';
import { Quote } from '@/lib/types';
import { QUOTE_POLL_INTERVAL } from '@/lib/constants';

export function useQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!symbols.length) {
      setQuotes({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchQuotes() {
      try {
        const res = await fetch(`/api/quote?symbols=${encodeURIComponent(symbols.join(','))}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
          } else {
            const map: Record<string, Quote> = {};
            for (const q of data.quotes) {
              map[q.symbol] = q;
            }
            setQuotes(map);
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
    fetchQuotes();

    intervalRef.current = setInterval(fetchQuotes, QUOTE_POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbols.join(',')]);

  return { quotes, loading, error };
}
