'use client';

import { useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useUser } from '@/hooks/useUser';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import { useAuthGate } from '@/hooks/useAuthGate';
import type { PostType } from '@/lib/types';

const FILTER_TABS: { value: PostType | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'text', label: 'Text' },
  { value: 'position', label: 'Positions' },
  { value: 'trade', label: 'Trades' },
];

export default function FeedPage() {
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const { posts, loading, filters, setFilters, postText, postPosition, postTrade, toggleLike } = useFeed();
  const [showComposer, setShowComposer] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-base/80 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3.5">
          <h1 className="text-base font-sans font-semibold text-text-primary tracking-tight">Feed</h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border">
          <div className="flex gap-1 flex-1">
            {FILTER_TABS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setFilters({ ...filters, postType: value })}
                className={`text-xs font-sans px-2.5 py-1 rounded-full border transition-all duration-150 ease-[var(--ease-snap)] ${
                  filters.postType === value
                    ? 'border-gold/50 bg-gold/10 text-gold'
                    : 'border-border text-text-muted hover:text-text-primary hover:border-border-strong'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={filters.symbol}
            onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
            placeholder="$SYM"
            className="w-20 bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1 rounded-md border border-border focus:border-gold/40 focus:outline-none uppercase transition-colors"
          />

          <button
            onClick={() => {
              if (!user) { requireAuth('create a post'); return; }
              setShowComposer((v) => !v);
            }}
            className={`text-xs font-sans font-semibold px-3 py-1 rounded-md transition-all duration-150 ease-[var(--ease-snap)] ${
              showComposer
                ? 'text-text-muted border border-border hover:text-text-primary'
                : 'bg-gold text-base hover:bg-gold-bright hover:glow-gold'
            }`}
          >
            {showComposer ? 'Cancel' : '+ Post'}
          </button>
        </div>
      </div>

      {/* Composer */}
      {showComposer && user && (
        <PostComposer
          onPostText={postText}
          onPostPosition={postPosition}
          onPostTrade={postTrade}
          onCancel={() => setShowComposer(false)}
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
        posts.map((post) => (
          <PostCard key={post.id} post={post} onToggleLike={toggleLike} currentUserId={user?.id} />
        ))
      )}
    </div>
  );
}
