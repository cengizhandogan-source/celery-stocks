'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore } from '@/stores/chatStore';
import type { DMConversation, DirectMessage, Profile } from '@/lib/types';

export function useDmConversations() {
  const { user } = useUser();
  const cacheProfiles = useChatStore((s) => s.cacheProfiles);
  const incrementUnread = useChatStore((s) => s.incrementUnread);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    // Get all DMs involving this user
    const { data: dms } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!sender_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth), receiver:profiles!receiver_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!dms || dms.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Group by peer
    const convMap = new Map<string, DMConversation>();
    const profiles: Profile[] = [];

    for (const dm of dms) {
      const sender = Array.isArray(dm.sender) ? dm.sender[0] : dm.sender;
      const receiver = Array.isArray(dm.receiver) ? dm.receiver[0] : dm.receiver;
      const peerId = dm.sender_id === user.id ? dm.receiver_id : dm.sender_id;
      const peer = dm.sender_id === user.id ? receiver : sender;

      if (!peer) continue;
      if (sender) profiles.push(sender);
      if (receiver) profiles.push(receiver);

      if (!convMap.has(peerId)) {
        convMap.set(peerId, {
          peer,
          lastMessage: dm,
          unreadCount: 0,
        });
      }

      if (!dm.read && dm.receiver_id === user.id) {
        const conv = convMap.get(peerId)!;
        conv.unreadCount++;
      }
    }

    if (profiles.length) cacheProfiles(profiles);
    setConversations(Array.from(convMap.values()));
    setLoading(false);
  }, [user, cacheProfiles]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to new incoming DMs
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`dm-inbox:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `receiver_id=eq.${user.id}` },
        () => {
          incrementUnread();
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, incrementUnread, fetchConversations]);

  return { conversations, loading, refresh: fetchConversations };
}
