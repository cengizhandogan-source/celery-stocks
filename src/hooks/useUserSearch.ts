'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/lib/types';

export function useUserSearch() {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth')
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .limit(20);

    setResults(data ?? []);
    setLoading(false);
  }, []);

  const clear = useCallback(() => {
    setResults([]);
  }, []);

  return { results, loading, search, clear };
}
