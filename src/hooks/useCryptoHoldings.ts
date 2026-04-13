'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import type { CryptoHolding } from '@/lib/types';

export function useCryptoHoldings(userId?: string | null) {
  const { user } = useUser();
  const targetId = userId ?? user?.id;
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [totalNetWorth, setTotalNetWorth] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchHoldings = useCallback(() => {
    if (!targetId) return;
    const params = targetId !== user?.id ? `?userId=${targetId}` : '';
    fetch(`/api/wallet/holdings${params}`)
      .then((res) => res.json())
      .then((data) => {
        setHoldings(data.holdings ?? []);
        setTotalNetWorth(data.totalNetWorth ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [targetId, user?.id]);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    fetchHoldings();
  }, [targetId, fetchHoldings]);

  return { holdings, totalNetWorth, loading, refetch: fetchHoldings };
}
