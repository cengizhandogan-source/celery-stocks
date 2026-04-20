'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore } from '@/stores/chatStore';
import type { Post, PostType, Profile } from '@/lib/types';
import { rankPosts } from '@/lib/feedRanking';

export interface FeedFilters {
  postType: PostType | null;
  symbol: string;
  userId?: string | null;
}

const FEED_PAGE_SIZE = 50;

export function useFeed() {
  const { user } = useUser();
  const cacheProfiles = useChatStore((s) => s.cacheProfiles);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FeedFilters>({ postType: null, symbol: '' });
  const likedSetRef = useRef<Set<string>>(new Set());

  const fetchPosts = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from('posts')
      .select(`
        *,
        profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)
      `)
      .order('created_at', { ascending: false })
      .limit(FEED_PAGE_SIZE);

    if (filters.postType) {
      query = query.eq('post_type', filters.postType);
    }
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol.toUpperCase());
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data } = await query;

    // Fetch user's likes
    let likedIds = new Set<string>();
    if (user) {
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);
      if (likes) {
        likedIds = new Set(likes.map((l: { post_id: string }) => l.post_id));
      }
    }
    likedSetRef.current = likedIds;

    if (data) {
      const mapped: Post[] = data.map((p) => {
        const profile = Array.isArray(p.profile) ? p.profile[0] : p.profile;
        return {
          ...p,
          profile,
          liked_by_me: likedIds.has(p.id),
        };
      });
      setPosts(rankPosts(mapped));
      const profiles = mapped.map((p) => p.profile).filter(Boolean) as Profile[];
      if (profiles.length) cacheProfiles(profiles);
    }
    setLoading(false);
  }, [user, filters.postType, filters.symbol, filters.userId, cacheProfiles]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime: new posts
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('feed-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          const post = payload.new as Post;
          if (filters.postType && post.post_type !== filters.postType) return;
          if (filters.symbol && post.symbol !== filters.symbol.toUpperCase()) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_color, avatar_url, is_verified')
            .eq('id', post.user_id)
            .single();

          if (profile) {
            cacheProfiles([profile]);
            post.profile = profile;
          }
          post.liked_by_me = false;

          setPosts((prev) => {
            if (prev.some((p) => p.id === post.id)) return prev;
            return rankPosts([post, ...prev]);
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'posts' },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id;
          setPosts((prev) => prev.filter((p) => p.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.postType, filters.symbol, cacheProfiles]);

  // Realtime: likes
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase
      .channel('feed-likes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_likes' },
        (payload) => {
          const { post_id, user_id: liker_id } = payload.new as { post_id: string; user_id: string };
          if (liker_id === user.id) return;
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id
                ? { ...p, like_count: p.like_count + 1 }
                : p
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (payload) => {
          const { post_id, user_id: liker_id } = payload.old as { post_id: string; user_id: string };
          if (liker_id === user.id) return;
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id
                ? { ...p, like_count: Math.max(0, p.like_count - 1) }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Realtime: comment counts
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('feed-comments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments' },
        (payload) => {
          const { post_id } = payload.new as { post_id: string };
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id
                ? { ...p, comment_count: p.comment_count + 1 }
                : p
            )
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_comments' },
        (payload) => {
          const { post_id } = payload.old as { post_id: string };
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id
                ? { ...p, comment_count: Math.max(0, p.comment_count - 1) }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!user) return;
      const supabase = createClient();
      const isLiked = likedSetRef.current.has(postId);

      // Optimistic update
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !isLiked, like_count: p.like_count + (isLiked ? -1 : 1) }
            : p
        )
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
              p.id === postId ? { ...p, liked_by_me: true, like_count: p.like_count + 1 } : p
            )
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
              p.id === postId ? { ...p, liked_by_me: false, like_count: p.like_count - 1 } : p
            )
          );
        }
      }
    },
    [user]
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
        .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)')
        .single();

      if (inserted) {
        const mapped: Post = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
          liked_by_me: false,
        };
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          return rankPosts([mapped, ...prev]);
        });
      }
    },
    [user]
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
        .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)')
        .single();

      if (inserted) {
        const mapped: Post = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
          liked_by_me: false,
        };
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          return rankPosts([mapped, ...prev]);
        });
      }
    },
    [user]
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
        .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified, crypto_net_worth, show_net_worth)')
        .single();

      if (inserted) {
        const mapped: Post = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
          liked_by_me: false,
        };
        setPosts((prev) => {
          if (prev.some((p) => p.id === mapped.id)) return prev;
          return [mapped, ...prev];
        });
      }
    },
    [user]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!user) return;
      const supabase = createClient();

      // Optimistic removal
      setPosts((prev) => prev.filter((p) => p.id !== postId));

      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) {
        // Re-fetch on failure to restore state
        fetchPosts();
      }
    },
    [user, fetchPosts]
  );

  return { posts, loading, filters, setFilters, postText, postPosition, postTrade, toggleLike, deletePost };
}
