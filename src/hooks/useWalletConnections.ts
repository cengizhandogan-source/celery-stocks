'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/hooks/useUser';
import type { ExchangeConnection, ExchangeName } from '@/lib/types';

export function useWalletConnections() {
  const { user } = useUser();
  const [connections, setConnections] = useState<ExchangeConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchConnections = () =>
      fetch('/api/wallet/connections')
        .then((res) => res.json())
        .then((data) => {
          setConnections(data.connections ?? []);
          setLoading(false);
        })
        .catch(() => setLoading(false));

    fetchConnections();
    const interval = setInterval(fetchConnections, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  const addConnection = useCallback(
    async (params: {
      exchange: ExchangeName;
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
      label?: string;
    }): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/wallet/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error };

        setConnections((prev) => [...prev, data.connection]);
        return { success: true };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Failed to add' };
      }
    },
    []
  );

  const removeConnection = useCallback(async (id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));

    const res = await fetch(`/api/wallet/connections/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      // Rollback
      const refetch = await fetch('/api/wallet/connections');
      const data = await refetch.json();
      setConnections(data.connections ?? []);
    }
  }, []);

  return { connections, loading, addConnection, removeConnection };
}
