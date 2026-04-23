'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFeed } from '@/hooks/useFeed';
import { useUser } from '@/hooks/useUser';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';

function FeedPageBody() {
  const { user } = useUser();
  const { posts, loading, postText, postPosition, postTrade, toggleLike } = useFeed();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showComposer = searchParams.get('compose') === '1' && !!user;

  const closeComposer = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('compose');
    const qs = params.toString();
    router.replace(`/social${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border">
        <div className="px-4 pt-3.5 pb-2.5">
          <h1 className="text-xl font-sans font-semibold text-text-primary tracking-tight">Feed</h1>
        </div>
        <div className="flex items-center gap-1.5 px-4 pb-2.5">
          <button
            type="button"
            className="rounded-full h-7 px-3 text-xs font-sans font-medium text-text-primary bg-surface hover:bg-hover transition-colors"
          >
            Latest
          </button>
          <button
            type="button"
            disabled
            className="rounded-full h-7 px-3 text-xs font-sans text-text-muted hover:text-text-secondary hover:bg-hover transition-colors cursor-not-allowed"
          >
            Top
          </button>
          <button
            type="button"
            disabled
            className="rounded-full h-7 px-3 text-xs font-sans text-text-muted hover:text-text-secondary hover:bg-hover transition-colors cursor-not-allowed"
          >
            Hot
          </button>
        </div>
      </div>

      {/* Composer */}
      {showComposer && user && (
        <PostComposer
          onPostText={postText}
          onPostPosition={postPosition}
          onPostTrade={postTrade}
          onCancel={closeComposer}
        />
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
            <PostCard key={post.id} post={post} onToggleLike={toggleLike} currentUserId={user?.id} />
          ))}
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
