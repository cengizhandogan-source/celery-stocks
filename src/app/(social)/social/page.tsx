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
  { value: 'strategy', label: 'Strategies' },
];

export default function FeedPage() {
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const { posts, loading, filters, setFilters, postText, postPosition, postTrade, postStrategy, toggleLike } = useFeed();
  const [showComposer, setShowComposer] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-terminal-bg/80 backdrop-blur-sm border-b border-terminal-border">
        <div className="px-4 py-3">
          <h1 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">Feed</h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-terminal-border">
          <div className="flex gap-1 flex-1">
            {FILTER_TABS.map(({ value, label }) => (
              <button
                key={label}
                onClick={() => setFilters({ ...filters, postType: value })}
                className={`text-xxs font-mono px-2 py-1 rounded border transition-colors ${
                  filters.postType === value
                    ? 'border-up/50 bg-up/10 text-up'
                    : 'border-terminal-border text-text-muted hover:text-text-secondary'
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
            className="w-20 bg-terminal-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-1 rounded border border-terminal-border focus:border-up/40 focus:outline-none uppercase"
          />

          <button
            onClick={() => {
              if (!user) { requireAuth('create a post'); return; }
              setShowComposer((v) => !v);
            }}
            className={`text-xxs font-mono px-2 py-1 rounded border transition-colors ${
              showComposer
                ? 'text-down border-down/30'
                : 'text-up border-up/30 hover:bg-up/10'
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
          onPostStrategy={postStrategy}
          onCancel={() => setShowComposer(false)}
        />
      )}

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
          Loading feed...
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
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
