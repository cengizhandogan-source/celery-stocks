'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import type { CachedTrade } from '@/lib/types';

export function useCachedTrades() {
  const { user } = useUser();
  const [trades, setTrades] = useState<CachedTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchTrades = useCallback(() => {
    if (!user) return;
    fetch('/api/wallet/trades')
      .then((res) => res.json())
      .then((data) => {
        setTrades(data.trades ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchTrades();
  }, [user, fetchTrades]);

  const syncTrades = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try {
      await fetch('/api/wallet/trades/sync', { method: 'POST' });
      fetchTrades();
    } finally {
      setSyncing(false);
    }
  }, [user, syncing, fetchTrades]);

  return { trades, loading, syncing, syncTrades, refetch: fetchTrades };
}
