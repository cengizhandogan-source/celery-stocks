'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore, MESSAGES_PAGE_SIZE } from '@/stores/chatStore';
import type { ChatMessage, StrategyChipData } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStrategy(s: any): StrategyChipData | undefined {
  if (!s) return undefined;
  const author = Array.isArray(s.author) ? s.author[0] : s.author;
  return {
    id: s.id,
    name: s.name,
    description: s.description || '',
    symbols: s.symbols || [],
    code: s.code || '',
    author: author || { id: '', username: 'unknown', display_name: 'Unknown', avatar_color: '#888', is_verified: false },
    import_count: 0,
    created_at: s.created_at,
  };
}

export function useChatroom(chatroomId: string | null) {
  const { user } = useUser();
  const cacheProfiles = useChatStore((s) => s.cacheProfiles);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!chatroomId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    supabase
      .from('messages')
      .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth), strategy:strategies!strategy_id(id, name, description, symbols, code, is_public, created_at, user_id, author:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth))')
      .eq('chatroom_id', chatroomId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE)
      .then(({ data }) => {
        if (data) {
          const msgs = data.reverse().map((m) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
            strategy: m.strategy ? mapStrategy(m.strategy) : undefined,
          }));
          setMessages(msgs);
          setHasMore(data.length === MESSAGES_PAGE_SIZE);
          const profiles = msgs.map((m) => m.profile).filter(Boolean);
          if (profiles.length) cacheProfiles(profiles);
        }
        setLoading(false);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`room:${chatroomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chatroom_id=eq.${chatroomId}` },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          // Fetch profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_color, avatar_url, is_verified')
            .eq('id', msg.user_id)
            .single();

          if (profile) {
            cacheProfiles([profile]);
            msg.profile = profile;
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatroomId, user, cacheProfiles]);

  const sendMessage = useCallback(
    async (content: string, strategyId?: string) => {
      if (!chatroomId || !user) return;
      const supabase = createClient();
      const insertData: Record<string, string> = {
        chatroom_id: chatroomId,
        user_id: user.id,
        content,
      };
      if (strategyId) insertData.strategy_id = strategyId;
      const { data: inserted } = await supabase
        .from('messages')
        .insert(insertData)
        .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth), strategy:strategies!strategy_id(id, name, description, symbols, code, is_public, created_at, user_id, author:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth))')
        .single();

      if (inserted) {
        const msg = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
          strategy: inserted.strategy ? mapStrategy(inserted.strategy) : undefined,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    },
    [chatroomId, user]
  );

  const loadOlderMessages = useCallback(async () => {
    if (!chatroomId || !hasMore || messages.length === 0) return;
    const supabase = createClient();
    const oldest = messages[0];

    const { data } = await supabase
      .from('messages')
      .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth), strategy:strategies!strategy_id(id, name, description, symbols, code, is_public, created_at, user_id, author:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth))')
      .eq('chatroom_id', chatroomId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (data) {
      const older = data.reverse().map((m) => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
        strategy: m.strategy ? mapStrategy(m.strategy) : undefined,
      }));
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.length === MESSAGES_PAGE_SIZE);
    }
  }, [chatroomId, hasMore, messages]);

  return { messages, loading, hasMore, sendMessage, loadOlderMessages };
}
