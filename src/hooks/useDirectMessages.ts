'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore, MESSAGES_PAGE_SIZE } from '@/stores/chatStore';
import type { DirectMessage, StrategyChipData } from '@/lib/types';

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
    author: author || { id: '', display_name: 'Unknown', avatar_color: '#888' },
    import_count: 0,
    created_at: s.created_at,
  };
}

export function useDirectMessages(peerId: string | null) {
  const { user } = useUser();
  const cacheProfiles = useChatStore((s) => s.cacheProfiles);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Fetch messages
  useEffect(() => {
    if (!peerId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    supabase
      .from('direct_messages')
      .select('*, sender:profiles!sender_id(id, display_name, avatar_color), receiver:profiles!receiver_id(id, display_name, avatar_color), strategy:strategies!strategy_id(id, name, description, symbols, code, is_public, created_at, user_id, author:profiles!user_id(id, display_name, avatar_color))')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE)
      .then(({ data }) => {
        if (data) {
          const msgs = data.reverse().map((m) => ({
            ...m,
            sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
            receiver: Array.isArray(m.receiver) ? m.receiver[0] : m.receiver,
            strategy: m.strategy ? mapStrategy(m.strategy) : undefined,
          }));
          setMessages(msgs);
          setHasMore(data.length === MESSAGES_PAGE_SIZE);
        }
        setLoading(false);
      });

    // Mark unread messages as read
    supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('sender_id', peerId)
      .eq('receiver_id', user.id)
      .eq('read', false)
      .then(() => {});

    // Subscribe to new messages in this conversation
    const channel = supabase
      .channel(`dm:${user.id}:${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const dm = payload.new as DirectMessage;
          // Only add if it's part of this conversation
          const isRelevant =
            (dm.sender_id === user.id && dm.receiver_id === peerId) ||
            (dm.sender_id === peerId && dm.receiver_id === user.id);

          if (!isRelevant) return;

          // Fetch profiles for the DM
          supabase
            .from('profiles')
            .select('id, display_name, avatar_color')
            .in('id', [dm.sender_id, dm.receiver_id])
            .then(({ data: profiles }) => {
              if (profiles) {
                cacheProfiles(profiles);
                dm.sender = profiles.find((p) => p.id === dm.sender_id);
                dm.receiver = profiles.find((p) => p.id === dm.receiver_id);
              }

              setMessages((prev) => {
                if (prev.some((m) => m.id === dm.id)) return prev;
                return [...prev, dm];
              });
            });

          // Mark as read if we received it
          if (dm.receiver_id === user.id) {
            supabase.from('direct_messages').update({ read: true }).eq('id', dm.id).then(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [peerId, user, cacheProfiles]);

  const sendDm = useCallback(
    async (content: string, strategyId?: string) => {
      if (!peerId || !user) return;
      const supabase = createClient();
      const insertData: Record<string, string | boolean> = {
        sender_id: user.id,
        receiver_id: peerId,
        content,
      };
      if (strategyId) insertData.strategy_id = strategyId;
      const { data: inserted } = await supabase
        .from('direct_messages')
        .insert(insertData)
        .select('*, sender:profiles!sender_id(id, display_name, avatar_color), receiver:profiles!receiver_id(id, display_name, avatar_color), strategy:strategies!strategy_id(id, name, description, symbols, code, is_public, created_at, user_id, author:profiles!user_id(id, display_name, avatar_color))')
        .single();

      if (inserted) {
        const dm = {
          ...inserted,
          sender: Array.isArray(inserted.sender) ? inserted.sender[0] : inserted.sender,
          receiver: Array.isArray(inserted.receiver) ? inserted.receiver[0] : inserted.receiver,
          strategy: inserted.strategy ? mapStrategy(inserted.strategy) : undefined,
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === dm.id)) return prev;
          return [...prev, dm];
        });
      }
    },
    [peerId, user]
  );

  return { messages, loading, hasMore, sendDm };
}
