'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/lib/types';

export interface SocialProfile extends Profile {
  bio: string;
  avatar_url: string | null;
  link: string;
  created_at: string;
  follower_count: number;
  following_count: number;
  post_count: number;
  show_holdings: boolean;
}

export function useSocialProfile(userId: string | null) {
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_color, is_verified, bio, avatar_url, link, created_at, follower_count, following_count, post_count, crypto_net_worth, show_net_worth, show_holdings')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            ...data,
            bio: data.bio ?? '',
            avatar_url: data.avatar_url ?? null,
            link: data.link ?? '',
            follower_count: data.follower_count ?? 0,
            following_count: data.following_count ?? 0,
            post_count: data.post_count ?? 0,
          });
        }
        setLoading(false);
      });
  }, [userId]);

  // Realtime: update counts when triggers fire
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setProfile((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              follower_count: (updated.follower_count as number) ?? prev.follower_count,
              following_count: (updated.following_count as number) ?? prev.following_count,
              post_count: (updated.post_count as number) ?? prev.post_count,
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: { username?: string; display_name?: string; bio?: string; link?: string; avatar_url?: string | null; show_net_worth?: boolean; show_holdings?: boolean }) => {
      if (!userId) return;
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('id, username, display_name, avatar_color, is_verified, bio, avatar_url, link, created_at, follower_count, following_count, post_count, crypto_net_worth, show_net_worth, show_holdings')
        .single();

      if (data) {
        setProfile({
          ...data,
          bio: data.bio ?? '',
          avatar_url: data.avatar_url ?? null,
          link: data.link ?? '',
          follower_count: data.follower_count ?? 0,
          following_count: data.following_count ?? 0,
          post_count: data.post_count ?? 0,
          crypto_net_worth: data.crypto_net_worth ?? null,
          show_net_worth: data.show_net_worth ?? false,
          show_holdings: data.show_holdings ?? false,
        });
      }
    },
    [userId]
  );

  return { profile, loading, updateProfile };
}
