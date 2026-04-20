'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import type { Comment } from '@/lib/types';

const PROFILE_SELECT = 'id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth';
const COMMENT_SELECT = `*, profile:profiles!user_id(${PROFILE_SELECT}), parent:post_comments!parent_id(user_id, profile:profiles!user_id(username, display_name, avatar_color))`;

const PAGE_SIZE = 10;

type RawComment = Omit<Comment, 'profile' | 'parent' | 'liked_by_me'> & {
  profile?: Comment['profile'] | Comment['profile'][];
  parent?: Comment['parent'] | Comment['parent'][] | null;
};

function normalize(row: RawComment, likedIds: Set<string>): Comment {
  return {
    ...row,
    profile: Array.isArray(row.profile) ? row.profile[0] : row.profile,
    parent: Array.isArray(row.parent) ? row.parent[0] ?? undefined : row.parent ?? undefined,
    liked_by_me: likedIds.has(row.id),
  };
}

async function fetchLikedSet(
  supabase: ReturnType<typeof createClient>,
  userId: string | undefined,
  commentIds: string[],
): Promise<Set<string>> {
  if (!userId || commentIds.length === 0) return new Set();
  const { data } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('user_id', userId)
    .in('comment_id', commentIds);
  return new Set((data ?? []).map((r) => r.comment_id));
}

export function useComments(postId: string | null) {
  const { user } = useUser();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const topLevelOffsetRef = useRef(0);
  const likedSetRef = useRef<Set<string>>(new Set());

  // Initial fetch: top-level comments ranked by likes, then their replies.
  useEffect(() => {
    if (!postId) {
      setComments([]);
      setHasMore(false);
      topLevelOffsetRef.current = 0;
      likedSetRef.current = new Set();
      return;
    }

    let cancelled = false;
    setLoading(true);
    topLevelOffsetRef.current = 0;

    (async () => {
      const supabase = createClient();

      const { data: topLevel } = await supabase
        .from('post_comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (cancelled) return;
      if (!topLevel) {
        setComments([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      const topIds = topLevel.map((c) => c.id);

      let replies: RawComment[] = [];
      if (topIds.length > 0) {
        const { data: repliesData } = await supabase
          .from('post_comments')
          .select(COMMENT_SELECT)
          .eq('post_id', postId)
          .in('parent_id', topIds)
          .order('created_at', { ascending: true });
        replies = (repliesData ?? []) as RawComment[];
      }
      if (cancelled) return;

      const allIds = [...topIds, ...replies.map((r) => r.id)];
      const liked = await fetchLikedSet(supabase, user?.id, allIds);
      if (cancelled) return;
      likedSetRef.current = liked;

      const merged = [
        ...(topLevel as RawComment[]).map((c) => normalize(c, liked)),
        ...replies.map((c) => normalize(c, liked)),
      ];

      setComments(merged);
      topLevelOffsetRef.current = topLevel.length;
      setHasMore(topLevel.length === PAGE_SIZE);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, user?.id]);

  // Realtime: INSERT / DELETE / UPDATE on post_comments.
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

          const { data: profile } = await supabase
            .from('profiles')
            .select(PROFILE_SELECT)
            .eq('id', row.user_id)
            .single();

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

          const comment: Comment = {
            ...row,
            profile: profile ?? undefined,
            parent,
            like_count: row.like_count ?? 0,
            liked_by_me: likedSetRef.current.has(row.id),
          };

          setComments((prev) => {
            if (prev.some((c) => c.id === comment.id)) return prev;
            return [...prev, comment];
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setComments((prev) => prev.filter((c) => c.id !== deletedId));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const updated = payload.new as Partial<Comment> & { id: string };
          setComments((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? { ...c, like_count: updated.like_count ?? c.like_count, content: updated.content ?? c.content }
                : c,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const loadMore = useCallback(async () => {
    if (!postId || loadingMore || !hasMore) return;
    setLoadingMore(true);

    const supabase = createClient();
    const from = topLevelOffsetRef.current;
    const to = from + PAGE_SIZE - 1;

    const { data: topLevel } = await supabase
      .from('post_comments')
      .select(COMMENT_SELECT)
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('like_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!topLevel) {
      setLoadingMore(false);
      return;
    }

    const topIds = topLevel.map((c) => c.id);

    let replies: RawComment[] = [];
    if (topIds.length > 0) {
      const { data: repliesData } = await supabase
        .from('post_comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .in('parent_id', topIds)
        .order('created_at', { ascending: true });
      replies = (repliesData ?? []) as RawComment[];
    }

    const newIds = [...topIds, ...replies.map((r) => r.id)];
    const liked = await fetchLikedSet(supabase, user?.id, newIds);
    liked.forEach((id) => likedSetRef.current.add(id));

    const incoming = [
      ...(topLevel as RawComment[]).map((c) => normalize(c, likedSetRef.current)),
      ...replies.map((c) => normalize(c, likedSetRef.current)),
    ];

    setComments((prev) => {
      const seen = new Set(prev.map((c) => c.id));
      return [...prev, ...incoming.filter((c) => !seen.has(c.id))];
    });

    topLevelOffsetRef.current = from + topLevel.length;
    setHasMore(topLevel.length === PAGE_SIZE);
    setLoadingMore(false);
  }, [postId, loadingMore, hasMore, user?.id]);

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      if (!user || !postId || !content.trim()) return;
      const supabase = createClient();

      const tempId = crypto.randomUUID();
      const optimistic: Comment = {
        id: tempId,
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        parent_id: parentId ?? null,
        profile: undefined,
        like_count: 0,
        liked_by_me: false,
      };

      const { data: profile } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', user.id)
        .single();
      if (profile) optimistic.profile = profile;

      if (parentId) {
        const parentComment = comments.find((c) => c.id === parentId);
        if (parentComment) {
          optimistic.parent = {
            user_id: parentComment.user_id,
            profile: parentComment.profile
              ? {
                  username: parentComment.profile.username,
                  display_name: parentComment.profile.display_name,
                  avatar_color: parentComment.profile.avatar_color,
                }
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
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        return;
      }

      if (inserted) {
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? normalize(inserted as RawComment, likedSetRef.current) : c)),
        );
      }
    },
    [user, postId, comments],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;
      const supabase = createClient();

      const prev = comments;
      setComments((c) => c.filter((x) => x.id !== commentId && x.parent_id !== commentId));

      const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
      if (error) {
        setComments(prev);
      }
    },
    [user, comments],
  );

  const toggleCommentLike = useCallback(
    async (commentId: string) => {
      if (!user) return;
      const supabase = createClient();
      const isLiked = likedSetRef.current.has(commentId);

      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, liked_by_me: !isLiked, like_count: Math.max(0, c.like_count + (isLiked ? -1 : 1)) }
            : c,
        ),
      );

      if (isLiked) {
        likedSetRef.current.delete(commentId);
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) {
          likedSetRef.current.add(commentId);
          setComments((prev) =>
            prev.map((c) =>
              c.id === commentId ? { ...c, liked_by_me: true, like_count: c.like_count + 1 } : c,
            ),
          );
        }
      } else {
        likedSetRef.current.add(commentId);
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) {
          likedSetRef.current.delete(commentId);
          setComments((prev) =>
            prev.map((c) =>
              c.id === commentId ? { ...c, liked_by_me: false, like_count: Math.max(0, c.like_count - 1) } : c,
            ),
          );
        }
      }
    },
    [user],
  );

  return {
    comments,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    addComment,
    deleteComment,
    toggleCommentLike,
  };
}
