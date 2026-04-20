'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore, MESSAGES_PAGE_SIZE } from '@/stores/chatStore';
import type { DirectMessage, Post } from '@/lib/types';

const DM_SELECT = `
  *,
  sender:profiles!sender_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth),
  receiver:profiles!receiver_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth),
  post:posts!post_id(id, user_id, post_type, content, symbol, position_symbol, position_shares, position_avg_cost, trade_symbol, trade_side, trade_qty, trade_price, trade_pnl, trade_executed_at, like_count, comment_count, created_at, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth))
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(p: any): Post | undefined {
  if (!p) return undefined;
  const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
  return {
    ...p,
    profile,
    liked_by_me: false,
  } as Post;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDm(m: any): DirectMessage {
  return {
    ...m,
    sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
    receiver: Array.isArray(m.receiver) ? m.receiver[0] : m.receiver,
    post: m.post ? mapPost(m.post) : null,
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
      .select(DM_SELECT)
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE)
      .then(({ data }) => {
        if (data) {
          const msgs = data.reverse().map(mapDm);
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
        async (payload) => {
          const raw = payload.new as DirectMessage;
          // Only add if it's part of this conversation
          const isRelevant =
            (raw.sender_id === user.id && raw.receiver_id === peerId) ||
            (raw.sender_id === peerId && raw.receiver_id === user.id);

          if (!isRelevant) return;

          // Refetch with joins so embeds and profiles are populated.
          const { data: full } = await supabase
            .from('direct_messages')
            .select(DM_SELECT)
            .eq('id', raw.id)
            .single();

          const dm = full ? mapDm(full) : raw;

          if (dm.sender) cacheProfiles([dm.sender]);
          if (dm.receiver) cacheProfiles([dm.receiver]);

          setMessages((prev) => {
            if (prev.some((m) => m.id === dm.id)) return prev;
            return [...prev, dm];
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
    async (content: string, postId?: string) => {
      if (!peerId || !user) return;
      const supabase = createClient();
      const trimmed = content.trim();
      const insertData: Record<string, string | boolean | null> = {
        sender_id: user.id,
        receiver_id: peerId,
        content: trimmed.length > 0 ? trimmed : null,
      };
      if (postId) insertData.post_id = postId;
      const { data: inserted } = await supabase
        .from('direct_messages')
        .insert(insertData)
        .select(DM_SELECT)
        .single();

      if (inserted) {
        const dm = mapDm(inserted);
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
