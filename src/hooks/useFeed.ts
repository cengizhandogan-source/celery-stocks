'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore } from '@/stores/chatStore';
import type { Comment, Post, PostType, Profile } from '@/lib/types';
import { rankPosts } from '@/lib/feedRanking';

export interface FeedFilters {
  postType: PostType | null;
  symbol: string;
  userId?: string | null;
}

const FEED_PAGE_SIZE = 50;
const POST_SELECT = `
  *,
  profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)
`;
const TOP_COMMENT_SELECT = `
  *,
  profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth),
  parent:post_comments!parent_id(user_id, profile:profiles!user_id(username, display_name, avatar_color))
`;

type RawPost = Omit<Post, 'profile' | 'liked_by_me' | 'top_comment'> & {
  profile?: Profile | Profile[] | null;
};

function applyFilters<T extends { eq: (col: string, val: string) => T }>(query: T, filters: FeedFilters): T {
  let q = query;
  if (filters.postType) q = q.eq('post_type', filters.postType);
  if (filters.symbol) q = q.eq('symbol', filters.symbol.toUpperCase());
  if (filters.userId) q = q.eq('user_id', filters.userId);
  return q;
}

async function fetchTopCommentsFor(
  supabase: ReturnType<typeof createClient>,
  postIds: string[],
  userId?: string | null,
): Promise<Map<string, Comment>> {
  const out = new Map<string, Comment>();
  if (postIds.length === 0) return out;
  const { data } = await supabase
    .from('post_comments')
    .select(TOP_COMMENT_SELECT)
    .in('post_id', postIds)
    .order('like_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  const topCommentIds: string[] = [];
  const seenPostIds = new Set<string>();
  const firstPass: Array<Record<string, unknown>> = [];
  for (const c of (data ?? []) as Array<Record<string, unknown>>) {
    const postId = c.post_id as string;
    if (seenPostIds.has(postId)) continue;
    seenPostIds.add(postId);
    firstPass.push(c);
    topCommentIds.push(c.id as string);
  }

  let likedCommentIds = new Set<string>();
  if (userId && topCommentIds.length > 0) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', topCommentIds);
    likedCommentIds = new Set(
      ((likes ?? []) as { comment_id: string }[]).map((l) => l.comment_id),
    );
  }

  for (const c of firstPass) {
    const postId = c.post_id as string;
    const rawProfile = c.profile as Profile | Profile[] | null | undefined;
    const profile = (Array.isArray(rawProfile) ? rawProfile[0] : rawProfile) as Profile | undefined;
    const rawParent = c.parent as
      | { user_id: string; profile: Profile | Profile[] | null }
      | Array<{ user_id: string; profile: Profile | Profile[] | null }>
      | null
      | undefined;
    const parentRow = Array.isArray(rawParent) ? rawParent[0] : rawParent;
    const parentProfile = parentRow
      ? ((Array.isArray(parentRow.profile) ? parentRow.profile[0] : parentRow.profile) as Profile | undefined)
      : undefined;
    out.set(postId, {
      id: c.id as string,
      post_id: postId,
      user_id: c.user_id as string,
      content: c.content as string,
      created_at: c.created_at as string,
      parent_id: (c.parent_id as string | null | undefined) ?? null,
      parent: parentRow
        ? {
            user_id: parentRow.user_id,
            profile: parentProfile
              ? {
                  username: parentProfile.username,
                  display_name: parentProfile.display_name,
                  avatar_color: parentProfile.avatar_color,
                }
              : undefined,
          }
        : undefined,
      profile,
      like_count: (c.like_count as number) ?? 0,
      liked_by_me: likedCommentIds.has(c.id as string),
    });
  }
  return out;
}

function normalizePost(raw: RawPost, likedIds: Set<string>, topComment: Comment | null): Post {
  const profile = Array.isArray(raw.profile) ? raw.profile[0] : raw.profile ?? undefined;
  return {
    ...raw,
    profile,
    liked_by_me: likedIds.has(raw.id),
    top_comment: topComment,
  } as Post;
}

export function useFeed() {
  const { user } = useUser();
  const cacheProfiles = useChatStore((s) => s.cacheProfiles);
  const fetchProfile = useChatStore((s) => s.fetchProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFilters] = useState<FeedFilters>({ postType: null, symbol: '' });
  const likedSetRef = useRef<Set<string>>(new Set());
  const likedCommentSetRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef<string | null>(null);
  const filtersRef = useRef(filters);
  const userIdRef = useRef(user?.id);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const baseQuery = supabase
      .from('posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(FEED_PAGE_SIZE);

    const postsQuery = applyFilters(baseQuery, filters);
    const likesPromise = user
      ? supabase.from('post_likes').select('post_id').eq('user_id', user.id)
      : Promise.resolve({ data: null });

    const [postsResult, likesResult] = await Promise.all([postsQuery, likesPromise]);

    const rows = (postsResult.data ?? []) as RawPost[];
    const likedIds = new Set<string>(
      ((likesResult.data ?? []) as { post_id: string }[]).map((l) => l.post_id),
    );
    likedSetRef.current = likedIds;

    const topComments = await fetchTopCommentsFor(supabase, rows.map((p) => p.id), user?.id);

    const likedCommentIds = new Set<string>();
    for (const tc of topComments.values()) {
      if (tc.liked_by_me) likedCommentIds.add(tc.id);
    }
    likedCommentSetRef.current = likedCommentIds;

    const mapped = rows.map((p) => normalizePost(p, likedIds, topComments.get(p.id) ?? null));
    setPosts(rankPosts(mapped));
    cursorRef.current = rows.length > 0 ? rows[rows.length - 1].created_at : null;
    setHasMore(rows.length === FEED_PAGE_SIZE);

    const profiles = mapped.map((p) => p.profile).filter(Boolean) as Profile[];
    if (profiles.length) cacheProfiles(profiles);

    setLoading(false);
  }, [user, filters, cacheProfiles]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    const supabase = createClient();

    const baseQuery = supabase
      .from('posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .lt('created_at', cursorRef.current)
      .limit(FEED_PAGE_SIZE);

    const { data } = await applyFilters(baseQuery, filtersRef.current);
    const rows = (data ?? []) as RawPost[];

    if (rows.length > 0) {
      const postIds = rows.map((r) => r.id);
      const likesPromise = user
        ? supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)
        : Promise.resolve({ data: null });
      const topCommentsPromise = fetchTopCommentsFor(supabase, postIds, user?.id);

      const [likesResult, topComments] = await Promise.all([likesPromise, topCommentsPromise]);
      const likedForPage = new Set<string>(
        ((likesResult.data ?? []) as { post_id: string }[]).map((l) => l.post_id),
      );
      likedForPage.forEach((id) => likedSetRef.current.add(id));
      for (const tc of topComments.values()) {
        if (tc.liked_by_me) likedCommentSetRef.current.add(tc.id);
      }

      const mapped = rows.map((p) =>
        normalizePost(p, likedSetRef.current, topComments.get(p.id) ?? null),
      );
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...mapped.filter((p) => !seen.has(p.id))];
      });
      cursorRef.current = rows[rows.length - 1].created_at;

      const profiles = mapped.map((p) => p.profile).filter(Boolean) as Profile[];
      if (profiles.length) cacheProfiles(profiles);
    }
    setHasMore(rows.length === FEED_PAGE_SIZE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, user, cacheProfiles]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Single realtime channel with bindings for posts, likes, and comments.
  // Handlers read filters via refs so subscription does not churn on filter change.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const post = payload.new as Post;
          const f = filtersRef.current;
          if (f.postType && post.post_type !== f.postType) return;
          if (f.symbol && post.symbol !== f.symbol.toUpperCase()) return;
          if (f.userId && post.user_id !== f.userId) return;

          const profile = await fetchProfile(post.user_id);
          post.profile = profile ?? undefined;
          post.liked_by_me = false;

          setPosts((prev) => {
            if (prev.some((p) => p.id === post.id)) return prev;
            return rankPosts([post, ...prev]);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        (payload) => {
          const { post_id, user_id: liker_id } = payload.new as { post_id: string; user_id: string };
          if (liker_id === userIdRef.current) return;
          setPosts((prev) =>
            prev.map((p) => (p.id === post_id ? { ...p, like_count: p.like_count + 1 } : p)),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (payload) => {
          const { post_id, user_id: liker_id } = payload.old as { post_id: string; user_id: string };
          if (liker_id === userIdRef.current) return;
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id ? { ...p, like_count: Math.max(0, p.like_count - 1) } : p,
            ),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        (payload) => {
          const { post_id } = payload.new as { post_id: string };
          setPosts((prev) =>
            prev.map((p) => (p.id === post_id ? { ...p, comment_count: p.comment_count + 1 } : p)),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_comments' },
        (payload) => {
          const { post_id } = payload.old as { post_id: string };
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const supabase = createClient();
      const isLiked = likedSetRef.current.has(postId);

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !isLiked, like_count: p.like_count + (isLiked ? -1 : 1) }
            : p,
        ),
      );

      if (isLiked) {
        likedSetRef.current.delete(postId);
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) {
          likedSetRef.current.add(postId);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p,
            ),
          );
        }
      } else {
        likedSetRef.current.add(postId);
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) {
          likedSetRef.current.delete(postId);
          setPosts((prev) =>
            prev.map((p) =>
              p.id === postId ? { ...p, liked_by_me: false, like_count: p.like_count - 1 } : p,
            ),
          );
        }
      }
    },
    [user],
  );

  const toggleTopCommentLike = useCallback(
    async (postId: string, commentId: string) => {
      if (!user) return;
      const supabase = createClient();
      const isLiked = likedCommentSetRef.current.has(commentId);

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.top_comment || p.top_comment.id !== commentId) return p;
          return {
            ...p,
            top_comment: {
              ...p.top_comment,
              liked_by_me: !isLiked,
              like_count: p.top_comment.like_count + (isLiked ? -1 : 1),
            },
          };
        }),
      );

      if (isLiked) {
        likedCommentSetRef.current.delete(commentId);
        const { error } = await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
        if (error) {
          likedCommentSetRef.current.add(commentId);
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== postId || !p.top_comment || p.top_comment.id !== commentId) return p;
              return {
                ...p,
                top_comment: {
                  ...p.top_comment,
                  liked_by_me: true,
                  like_count: p.top_comment.like_count + 1,
                },
              };
            }),
          );
        }
      } else {
        likedCommentSetRef.current.add(commentId);
        const { error } = await supabase
          .from('comment_likes')
          .insert({ comment_id: commentId, user_id: user.id });
        if (error) {
          likedCommentSetRef.current.delete(commentId);
          setPosts((prev) =>
            prev.map((p) => {
              if (p.id !== postId || !p.top_comment || p.top_comment.id !== commentId) return p;
              return {
                ...p,
                top_comment: {
                  ...p.top_comment,
                  liked_by_me: false,
                  like_count: Math.max(0, p.top_comment.like_count - 1),
                },
              };
            }),
          );
        }
      }
    },
    [user],
  );

  const postText = useCallback(
    async (data: { content: string; symbol?: string }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: 'text',
          content: data.content,
          symbol: data.symbol?.toUpperCase() || null,
        })
        .select(POST_SELECT)
        .single();

      if (inserted) {
        const mapped = normalizePost(inserted as RawPost, new Set(), null);
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          return rankPosts([mapped, ...prev]);
        });
      }
    },
    [user],
  );

  const postPosition = useCallback(
    async (data: { content?: string; symbol: string; shares: number; avgCost: number }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: 'position',
          content: data.content || null,
          symbol: data.symbol.toUpperCase(),
          position_symbol: data.symbol.toUpperCase(),
          position_shares: data.shares,
          position_avg_cost: data.avgCost,
        })
        .select(POST_SELECT)
        .single();

      if (inserted) {
        const mapped = normalizePost(inserted as RawPost, new Set(), null);
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          return rankPosts([mapped, ...prev]);
        });
      }
    },
    [user],
  );

  const postTrade = useCallback(
    async (data: {
      content?: string;
      symbol: string;
      side: 'buy' | 'sell';
      qty: number;
      price: number;
      quoteQty: number;
      pnl?: number;
      executedAt: string;
    }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: 'trade',
          content: data.content || null,
          symbol: data.symbol.toUpperCase(),
          trade_symbol: data.symbol.toUpperCase(),
          trade_side: data.side,
          trade_qty: data.qty,
          trade_price: data.price,
          trade_quote_qty: data.quoteQty,
          trade_pnl: data.pnl ?? null,
          trade_executed_at: data.executedAt,
        })
        .select(POST_SELECT)
        .single();

      if (inserted) {
        const mapped = normalizePost(inserted as RawPost, new Set(), null);
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });
      }
    },
    [user],
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      const supabase = createClient();

      setPosts((prev) => prev.filter((p) => p.id !== postId));

      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) {
        fetchPosts();
      }
    },
    [user, fetchPosts],
  );

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    filters,
    setFilters,
    postText,
    postPosition,
    postTrade,
    toggleLike,
    toggleTopCommentLike,
    deletePost,
  };
}
