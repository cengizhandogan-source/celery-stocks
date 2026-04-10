'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScreenerResult } from '@/lib/types';

export function useScreener(scrId: string = 'most_actives') {
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/screener?scrId=${encodeURIComponent(scrId)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [scrId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { results, loading };
}
