'use client';

import { useState, useEffect } from 'react';
import { CompanyProfile } from '@/lib/types';

export function useProfile(symbol: string) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;

    let cancelled = false;

    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`/api/profile?symbol=${encodeURIComponent(symbol)}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.error);
          } else {
            setProfile(data);
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

    fetchProfile();

    return () => { cancelled = true; };
  }, [symbol]);

  return { profile, loading, error };
}
