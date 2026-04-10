'use client';

import { useState, useEffect } from 'react';
import { Filing } from '@/lib/types';

export function useFilings(symbol: string) {
  const [filings, setFilings] = useState<Filing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/filings?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setFilings(Array.isArray(d) ? d : []))
      .catch(() => setFilings([]))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { filings, loading };
}
