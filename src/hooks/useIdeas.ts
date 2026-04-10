'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore } from '@/stores/chatStore';
import type { Idea, Sentiment } from '@/lib/types';

export function useIdeas(symbolFilter?: string) {
  const { user } = useUser();
  const cacheProfiles = useChatStore((s) => s.cacheProfiles);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from('ideas')
      .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (symbolFilter) {
      query = query.eq('symbol', symbolFilter.toUpperCase());
    }

    const { data } = await query;
    if (data) {
      const mapped = data.map((i) => ({
        ...i,
        profile: Array.isArray(i.profile) ? i.profile[0] : i.profile,
      }));
      setIdeas(mapped);
      const profiles = mapped.map((i) => i.profile).filter(Boolean);
      if (profiles.length) cacheProfiles(profiles);
    }
    setLoading(false);
  }, [symbolFilter, cacheProfiles]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  // Realtime subscription for new ideas
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('ideas-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ideas' },
        async (payload) => {
          const idea = payload.new as Idea;
          if (symbolFilter && idea.symbol !== symbolFilter.toUpperCase()) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_color')
            .eq('id', idea.user_id)
            .single();

          if (profile) {
            cacheProfiles([profile]);
            idea.profile = profile;
          }

          setIdeas((prev) => {
            if (prev.some((i) => i.id === idea.id)) return prev;
            return [idea, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [symbolFilter, cacheProfiles]);

  const postIdea = useCallback(
    async (data: { symbol: string; title: string; content: string; sentiment: Sentiment }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('ideas')
        .insert({
          user_id: user.id,
          symbol: data.symbol.toUpperCase(),
          title: data.title,
          content: data.content,
          sentiment: data.sentiment,
        })
        .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
        .single();

      if (inserted) {
        const mapped = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
        };
        setIdeas((prev) => {
          if (prev.some((i) => i.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });
      }
    },
    [user]
  );

  return { ideas, loading, postIdea };
}
