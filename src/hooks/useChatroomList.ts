'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import type { Chatroom } from '@/lib/types';

export function useChatroomList() {
  const { user } = useUser();
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [joinedRoomIds, setJoinedRoomIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();

    const [roomsRes, membersRes] = await Promise.all([
      supabase.from('chatrooms').select('*').order('is_default', { ascending: false }).order('created_at'),
      supabase.from('chatroom_members').select('chatroom_id').eq('user_id', user.id),
    ]);

    if (roomsRes.data) setChatrooms(roomsRes.data);
    if (membersRes.data) setJoinedRoomIds(new Set(membersRes.data.map((m) => m.chatroom_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const joinRoom = useCallback(
    async (chatroomId: string) => {
      if (!user) return;
      const supabase = createClient();
      await supabase.from('chatroom_members').insert({ chatroom_id: chatroomId, user_id: user.id });
      setJoinedRoomIds((prev) => new Set(prev).add(chatroomId));
    },
    [user]
  );

  const leaveRoom = useCallback(
    async (chatroomId: string) => {
      if (!user) return;
      const supabase = createClient();
      await supabase.from('chatroom_members').delete().eq('chatroom_id', chatroomId).eq('user_id', user.id);
      setJoinedRoomIds((prev) => {
        const next = new Set(prev);
        next.delete(chatroomId);
        return next;
      });
    },
    [user]
  );

  return { chatrooms, joinedRoomIds, loading, joinRoom, leaveRoom, refresh: fetchData };
}
