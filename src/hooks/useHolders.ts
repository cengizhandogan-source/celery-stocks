'use client';

import { useState, useEffect } from 'react';
import { HoldersData } from '@/lib/types';

export function useHolders(symbol: string) {
  const [data, setData] = useState<HoldersData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/holders?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { data, loading };
}
