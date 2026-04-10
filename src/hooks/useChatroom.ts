'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore, MESSAGES_PAGE_SIZE } from '@/stores/chatStore';
import type { ChatMessage } from '@/lib/types';

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
      .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
      .eq('chatroom_id', chatroomId)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE)
      .then(({ data }) => {
        if (data) {
          const msgs = data.reverse().map((m) => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
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
            .select('id, display_name, avatar_color')
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
    async (content: string) => {
      if (!chatroomId || !user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('messages')
        .insert({
          chatroom_id: chatroomId,
          user_id: user.id,
          content,
        })
        .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
        .single();

      if (inserted) {
        const msg = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
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
      .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
      .eq('chatroom_id', chatroomId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(MESSAGES_PAGE_SIZE);

    if (data) {
      const older = data.reverse().map((m) => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
      }));
      setMessages((prev) => [...older, ...prev]);
      setHasMore(data.length === MESSAGES_PAGE_SIZE);
    }
  }, [chatroomId, hasMore, messages]);

  return { messages, loading, hasMore, sendMessage, loadOlderMessages };
}
