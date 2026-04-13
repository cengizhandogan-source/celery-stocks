'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import type { Comment } from '@/lib/types';

const PROFILE_SELECT = 'id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth';
const COMMENT_SELECT = `*, profile:profiles!user_id(${PROFILE_SELECT}), parent:post_comments!parent_id(user_id, profile:profiles!user_id(username, display_name, avatar_color))`;

export function useComments(postId: string | null) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch comments
  useEffect(() => {
    if (!postId) {
      setComments([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('post_comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (data) {
        setComments(
          data.map((c) => ({
            ...c,
            profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
            parent: Array.isArray(c.parent) ? c.parent[0] ?? undefined : c.parent ?? undefined,
          }))
        );
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [postId]);

  // Realtime subscription
  useEffect(() => {
    if (!postId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          const row = payload.new as Comment;

          // Fetch profile for the new comment
          const { data: profile } = await supabase
            .from('profiles')
            .select(PROFILE_SELECT)
            .eq('id', row.user_id)
            .single();

          // Fetch parent profile if this is a reply
          let parent: Comment['parent'] = undefined;
          if (row.parent_id) {
            const { data: parentData } = await supabase
              .from('post_comments')
              .select('user_id, profile:profiles!user_id(username, display_name, avatar_color)')
              .eq('id', row.parent_id)
              .single();
            if (parentData) {
              parent = {
                user_id: parentData.user_id,
                profile: Array.isArray(parentData.profile) ? parentData.profile[0] : parentData.profile ?? undefined,
              };
            }
          }

          const comment: Comment = { ...row, profile: profile ?? undefined, parent };

          setComments((prev) => {
            if (prev.some((c) => c.id === comment.id)) return prev;
            return [...prev, comment];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setComments((prev) => prev.filter((c) => c.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      if (!user || !postId || !content.trim()) return;
      const supabase = createClient();

      // Optimistic insert
      const tempId = crypto.randomUUID();
      const optimistic: Comment = {
        id: tempId,
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        parent_id: parentId ?? null,
        profile: undefined,
      };

      // Try to get cached profile
      const { data: profile } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', user.id)
        .single();
      if (profile) optimistic.profile = profile;

      // Resolve parent profile for display
      if (parentId) {
        const parentComment = comments.find((c) => c.id === parentId);
        if (parentComment) {
          optimistic.parent = {
            user_id: parentComment.user_id,
            profile: parentComment.profile
              ? { username: parentComment.profile.username, display_name: parentComment.profile.display_name, avatar_color: parentComment.profile.avatar_color }
              : undefined,
          };
        }
      }

      setComments((prev) => [...prev, optimistic]);

      const insertPayload: Record<string, unknown> = {
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
      };
      if (parentId) insertPayload.parent_id = parentId;

      const { data: inserted, error } = await supabase
        .from('post_comments')
        .insert(insertPayload)
        .select(COMMENT_SELECT)
        .single();

      if (error) {
        // Rollback
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        return;
      }

      if (inserted) {
        // Replace optimistic with real
        setComments((prev) =>
          prev.map((c) =>
            c.id === tempId
              ? {
                  ...inserted,
                  profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
                  parent: Array.isArray(inserted.parent) ? inserted.parent[0] ?? undefined : inserted.parent ?? undefined,
                }
              : c
          )
        );
      }
    },
    [user, postId, comments]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      const supabase = createClient();

      // Optimistic removal
      const prev = comments;
      setComments((c) => c.filter((x) => x.id !== commentId));

      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) {
        setComments(prev);
      }
    },
    [user, comments]
  );

  return { comments, loading, addComment, deleteComment };
}
