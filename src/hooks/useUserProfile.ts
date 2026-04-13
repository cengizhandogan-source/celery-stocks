'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore } from '@/stores/chatStore';
import type { Profile } from '@/lib/types';

export function useUserProfile() {
  const { user } = useUser();
  const cacheProfile = useChatStore((s) => s.cacheProfile);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth')
      .eq('id', user.id)
      .single()
      .then(async ({ data, error }) => {
        if (data) {
          setProfile(data);
          cacheProfile(data);
          setLoading(false);
        } else if (error?.code === 'PGRST116') {
          // Profile missing (user signed up before migration) — create it
          const displayName = user.email?.split('@')[0] ?? 'user';
          const username = displayName.toLowerCase() + Math.floor(Math.random() * 9000 + 1000);
          const { data: created } = await supabase
            .from('profiles')
            .insert({ id: user.id, display_name: displayName, username })
            .select('id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth')
            .single();
          if (created) {
            setProfile(created);
            cacheProfile(created);
          }
          setLoading(false);
        } else {
          setLoading(false);
        }
      });
  }, [user, cacheProfile]);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth')
        .single();

      if (data) {
        setProfile(data);
        cacheProfile(data);
      }
    },
    [user, cacheProfile]
  );

  return { profile, loading, updateDisplayName };
}
