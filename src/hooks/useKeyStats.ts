'use client';

import { useState, useEffect } from 'react';
import { KeyStats } from '@/lib/types';

export function useKeyStats(symbol: string) {
  const [stats, setStats] = useState<KeyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchStats() {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
          } else {
            setStats(data);
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

    fetchStats();

    return () => { cancelled = true; };
  }, [symbol]);

  return { stats, loading, error };
}
