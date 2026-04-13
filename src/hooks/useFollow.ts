'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';

export function useFollow(targetUserId: string | null) {
  const { user } = useUser();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        setIsFollowing(!!data);
        setLoading(false);
      });
  }, [user, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;

    const supabase = createClient();
    const wasFollowing = isFollowing;

    // Optimistic update
    setIsFollowing(!wasFollowing);

    if (wasFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) setIsFollowing(true);
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: targetUserId });

      if (error) setIsFollowing(false);
    }
  }, [user, targetUserId, isFollowing]);

  return { isFollowing, loading, toggleFollow };
}
