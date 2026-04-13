'use client';

import { useState, useCallback, useRef } from 'react';

const COOLDOWN_MS = 60_000; // 1 minute cooldown

export function useWalletSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const cooldownRef = useRef(0);

  const triggerSync = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (Date.now() < cooldownRef.current) {
      return { success: false, error: 'Please wait before syncing again' };
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/wallet/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setSyncing(false);
        return { success: false, error: data.error };
      }

      setLastSyncedAt(new Date());
      cooldownRef.current = Date.now() + COOLDOWN_MS;
      setSyncing(false);
      return { success: true };
    } catch (error) {
      setSyncing(false);
      return { success: false, error: error instanceof Error ? error.message : 'Sync failed' };
    }
  }, []);

  return { syncing, lastSyncedAt, triggerSync };
}
