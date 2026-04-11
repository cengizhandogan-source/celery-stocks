'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useChatStore } from '@/stores/chatStore';
import type { Post, PostType, Sentiment, StrategyChipData, Profile } from '@/lib/types';

export interface FeedFilters {
  postType: PostType | null;
  symbol: string;
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
        profile:profiles!user_id(id, display_name, avatar_color),
        strategy:strategies!strategy_id(
          id, name, description, symbols, code, created_at,
          author:profiles!user_id(id, display_name, avatar_color),
          backtest:strategy_backtest_results(
            id, strategy_id, total_return, win_rate, sharpe_ratio,
            max_drawdown, total_trades, backtest_range, equity_curve, computed_at
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(FEED_PAGE_SIZE);

    if (filters.postType) {
      query = query.eq('post_type', filters.postType);
    }
    if (filters.symbol) {
      query = query.eq('symbol', filters.symbol.toUpperCase());
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
        let strategy: StrategyChipData | undefined;
        if (p.strategy && !Array.isArray(p.strategy)) {
          const s = p.strategy as Record<string, unknown>;
          const author = Array.isArray(s.author) ? s.author[0] : s.author;
          const backtests = Array.isArray(s.backtest) ? s.backtest : [];
          const backtest = backtests.length > 0 ? backtests[0] : undefined;
          strategy = {
            id: s.id as string,
            name: s.name as string,
            description: (s.description as string) ?? '',
            symbols: (s.symbols as string[]) ?? [],
            code: (s.code as string) ?? '',
            author: author as Profile,
            backtest,
            import_count: 0,
            created_at: s.created_at as string,
          };
        }
        return {
          ...p,
          profile,
          strategy,
          liked_by_me: likedIds.has(p.id),
        };
      });
      setPosts(mapped);
      const profiles = mapped.map((p) => p.profile).filter(Boolean) as Profile[];
      if (profiles.length) cacheProfiles(profiles);
    }
    setLoading(false);
  }, [user, filters.postType, filters.symbol, cacheProfiles]);

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
            .select('id, display_name, avatar_color')
            .eq('id', post.user_id)
            .single();

          if (profile) {
            cacheProfiles([profile]);
            post.profile = profile;
          }
          post.liked_by_me = false;

          setPosts((prev) => {
            if (prev.some((p) => p.id === post.id)) return prev;
            return [post, ...prev];
          });
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
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id
                ? { ...p, like_count: p.like_count + 1, liked_by_me: liker_id === user.id ? true : p.liked_by_me }
                : p
            )
          );
          if (liker_id === user.id) likedSetRef.current.add(post_id);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'post_likes' },
        (payload) => {
          const { post_id, user_id: liker_id } = payload.old as { post_id: string; user_id: string };
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post_id
                ? { ...p, like_count: Math.max(0, p.like_count - 1), liked_by_me: liker_id === user.id ? false : p.liked_by_me }
                : p
            )
          );
          if (liker_id === user.id) likedSetRef.current.delete(post_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
    async (data: { content: string; symbol?: string; sentiment?: Sentiment }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: 'text',
          content: data.content,
          symbol: data.symbol?.toUpperCase() || null,
          sentiment: data.sentiment || null,
        })
        .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
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

  const postPosition = useCallback(
    async (data: { content?: string; symbol: string; shares: number; avgCost: number; sentiment?: Sentiment }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: 'position',
          content: data.content || null,
          symbol: data.symbol.toUpperCase(),
          sentiment: data.sentiment || null,
          position_symbol: data.symbol.toUpperCase(),
          position_shares: data.shares,
          position_avg_cost: data.avgCost,
        })
        .select('*, profile:profiles!user_id(id, display_name, avatar_color)')
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

  const postStrategy = useCallback(
    async (data: { content?: string; strategyId: string }) => {
      if (!user) return;
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          post_type: 'strategy',
          content: data.content || null,
          strategy_id: data.strategyId,
        })
        .select(`
          *,
          profile:profiles!user_id(id, display_name, avatar_color),
          strategy:strategies!strategy_id(
            id, name, description, symbols, code, created_at,
            author:profiles!user_id(id, display_name, avatar_color),
            backtest:strategy_backtest_results(
              id, strategy_id, total_return, win_rate, sharpe_ratio,
              max_drawdown, total_trades, backtest_range, equity_curve, computed_at
            )
          )
        `)
        .single();

      if (inserted) {
        let strategy: StrategyChipData | undefined;
        if (inserted.strategy && !Array.isArray(inserted.strategy)) {
          const s = inserted.strategy as Record<string, unknown>;
          const author = Array.isArray(s.author) ? s.author[0] : s.author;
          const backtests = Array.isArray(s.backtest) ? s.backtest : [];
          const backtest = backtests.length > 0 ? backtests[0] : undefined;
          strategy = {
            id: s.id as string,
            name: s.name as string,
            description: (s.description as string) ?? '',
            symbols: (s.symbols as string[]) ?? [],
            code: (s.code as string) ?? '',
            author: author as Profile,
            backtest,
            import_count: 0,
            created_at: s.created_at as string,
          };
        }
        const mapped: Post = {
          ...inserted,
          profile: Array.isArray(inserted.profile) ? inserted.profile[0] : inserted.profile,
          strategy,
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

  return { posts, loading, filters, setFilters, postText, postPosition, postStrategy, toggleLike };
}
