'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/feed/PostCard';
import { useUser } from '@/hooks/useUser';
import { useAuthGate } from '@/hooks/useAuthGate';
import { createClient } from '@/utils/supabase/client';
import type { Post } from '@/lib/types';

export default function PostDetailClient({ initialPost }: { initialPost: Post }) {
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const router = useRouter();
  const [post, setPost] = useState<Post>(initialPost);

  // Compute liked_by_me once user is known.
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', initialPost.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPost((p) => ({ ...p, liked_by_me: true }));
      });
  }, [user, initialPost.id]);

  const toggleLike = useCallback(async (postId: string) => {
    if (!requireAuth('like this post')) return;
    if (!user) return;
    const supabase = createClient();
    const wasLiked = post.liked_by_me;

    // Optimistic
    setPost((p) => ({
      ...p,
      liked_by_me: !wasLiked,
      like_count: p.like_count + (wasLiked ? -1 : 1),
    }));

    const { error } = wasLiked
      ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      : await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });

    if (error) {
      // Rollback
      setPost((p) => ({
        ...p,
        liked_by_me: wasLiked,
        like_count: p.like_count + (wasLiked ? 1 : -1),
      }));
    }
  }, [post.liked_by_me, user, requireAuth]);

  const deletePost = useCallback(async (postId: string) => {
    if (!user || user.id !== post.user_id) return;
    const supabase = createClient();
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) router.push('/');
  }, [post.user_id, user, router]);

  return (
    <PostCard
      post={post}
      onToggleLike={toggleLike}
      onDelete={user?.id === post.user_id ? deletePost : undefined}
      currentUserId={user?.id}
      defaultCommentsOpen
    />
  );
}
