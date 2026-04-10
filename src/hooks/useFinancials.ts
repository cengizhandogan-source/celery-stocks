'use client';

import { useState, useEffect } from 'react';
import { FinancialStatements } from '@/lib/types';

export function useFinancials(symbol: string) {
  const [data, setData] = useState<FinancialStatements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/financials?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [symbol]);

  return { data, loading };
}
