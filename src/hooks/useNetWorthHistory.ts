'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import type { NetWorthSnapshot } from '@/lib/types';

export function useNetWorthHistory(userId?: string | null) {
  const { user } = useUser();
  const targetId = userId ?? user?.id;
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSnapshots = useCallback(() => {
    if (!targetId) return;
    const params = targetId !== user?.id ? `?userId=${targetId}` : '';
    fetch(`/api/wallet/net-worth${params}`)
      .then((res) => res.json())
      .then((data) => {
        setSnapshots(data.snapshots ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [targetId, user?.id]);

  useEffect(() => {
    if (!targetId) {
      setLoading(false);
      return;
    }
    fetchSnapshots();
    const interval = setInterval(fetchSnapshots, 60_000);
    return () => clearInterval(interval);
  }, [targetId, fetchSnapshots]);

  return { snapshots, loading };
}
