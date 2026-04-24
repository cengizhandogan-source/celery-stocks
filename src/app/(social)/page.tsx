'use client';

import { Suspense, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFeed } from '@/hooks/useFeed';
import { useUser } from '@/hooks/useUser';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import SocialTopBar from '@/components/social/SocialTopBar';

function FeedPageBody() {
  const { user } = useUser();
  const { posts, loading, loadingMore, hasMore, loadMore, postText, postPosition, postTrade, toggleLike, toggleTopCommentLike } = useFeed();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showComposer = searchParams.get('compose') === '1' && !!user;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore();
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const closeComposer = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('compose');
    const qs = params.toString();
    router.replace(`/${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    if (!showComposer) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeComposer();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComposer]);

  return (
    <div className="flex flex-col">
      <SocialTopBar title="Feed" />

      {/* Composer modal */}
      {showComposer && user && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create post"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-20"
          onClick={closeComposer}
        >
          <div
            className="w-full max-w-[560px] max-h-[85vh] overflow-y-auto bg-surface border border-border rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <PostComposer
              onPostText={postText}
              onPostPosition={postPosition}
              onPostTrade={postTrade}
              onCancel={closeComposer}
            />
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-sans">
          Loading feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-sans">
          No posts yet. Be the first to share!
        </div>
      ) : (
        <div className="flex flex-col gap-2 mt-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onToggleLike={toggleLike} onToggleTopCommentLike={toggleTopCommentLike} currentUserId={user?.id} />
          ))}
          {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden />}
          {loadingMore && (
            <div className="flex items-center justify-center py-4 text-text-muted text-xs font-mono">
              Loading more…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedPageBody />
    </Suspense>
  );
}
