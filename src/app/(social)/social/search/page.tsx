'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { useUserSearch } from '@/hooks/useUserSearch';
import PostCard from '@/components/feed/PostCard';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { useUser } from '@/hooks/useUser';
import { useAuthGate } from '@/hooks/useAuthGate';
import type { Post } from '@/lib/types';

type SearchTab = 'users' | 'posts';

export default function SearchPage() {
  const [tab, setTab] = useState<SearchTab>('users');
  const [query, setQuery] = useState('');
  const { user } = useUser();
  const { requireAuth } = useAuthGate();

  // User search
  const { results: userResults, loading: usersLoading, search: searchUsers } = useUserSearch();

  // Post search
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  const searchPosts = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPostResults([]);
      return;
    }

    setPostsLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from('posts')
      .select('*, profile:profiles!user_id(id, username, display_name, avatar_color, avatar_url, is_verified)')
      .ilike('content', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      const mapped: Post[] = data.map((p) => ({
        ...p,
        profile: Array.isArray(p.profile) ? p.profile[0] : p.profile,
        liked_by_me: likedSet.has(p.id),
      }));
      setPostResults(mapped);
    }
    setPostsLoading(false);
  }, [likedSet]);

  // Fetch user's liked posts for toggling
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setLikedSet(new Set(data.map((l) => l.post_id)));
      });
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'users') searchUsers(query);
      else searchPosts(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, tab, searchUsers, searchPosts]);

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!requireAuth('like this post') || !user) return;
      const supabase = createClient();
      const isLiked = likedSet.has(postId);

      // Optimistic
      setPostResults((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !isLiked, like_count: p.like_count + (isLiked ? -1 : 1) }
            : p
        )
      );

      if (isLiked) {
        setLikedSet((prev) => { const s = new Set(prev); s.delete(postId); return s; });
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      } else {
        setLikedSet((prev) => new Set(prev).add(postId));
        await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      }
    },
    [user, likedSet, requireAuth]
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <h1 className="text-lg font-mono font-bold text-text-primary uppercase tracking-wider">Search</h1>
        </div>

        {/* Search input */}
        <div className="px-4 py-2 border-t border-border">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === 'users' ? 'Search users...' : 'Search posts...'}
            className="w-full bg-input text-sm font-mono text-text-primary placeholder:text-text-muted px-3 py-2 rounded border border-border focus:border-profit/40 focus:outline-none"
          />
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-1 py-2 border-t border-border">
          {(['users', 'posts'] as SearchTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xxs font-mono px-3 py-1 rounded border capitalize transition-colors ${
                tab === t
                  ? 'border-profit/50 bg-profit/10 text-profit'
                  : 'border-border text-text-muted hover:text-text-secondary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {tab === 'users' ? (
        usersLoading ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
            Searching...
          </div>
        ) : userResults.length === 0 && query ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
            No users found
          </div>
        ) : (
          userResults.map((u) => (
            <Link
              key={u.id}
              href={`/social/profile/${u.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-hover transition-colors"
            >
              <UserAvatar avatarUrl={u.avatar_url} size="lg" />
              <span className="text-sm font-mono font-medium truncate text-text-primary">
                @{u.username}
              </span>
              {u.is_verified && <VerifiedBadge size={14} />}
            </Link>
          ))
        )
      ) : postsLoading ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
          Searching...
        </div>
      ) : postResults.length === 0 && query ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
          No posts found
        </div>
      ) : (
        postResults.map((post) => (
          <PostCard key={post.id} post={post} onToggleLike={toggleLike} currentUserId={user?.id} />
        ))
      )}
    </div>
  );
}
