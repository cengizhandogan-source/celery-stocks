'use client';

import { useState } from 'react';
import { useFeed } from '@/hooks/useFeed';
import { useUser } from '@/hooks/useUser';
import PostCard from '@/components/feed/PostCard';
import PostComposer from '@/components/feed/PostComposer';
import type { PostType } from '@/lib/types';

const FILTER_TABS: { value: PostType | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'text', label: 'Text' },
  { value: 'position', label: 'Positions' },
  { value: 'strategy', label: 'Strategies' },
];

export default function FeedPanel() {
  const { posts, loading, filters, setFilters, postText, postPosition, postStrategy, toggleLike, deletePost } = useFeed();
  const { user } = useUser();
  const [showComposer, setShowComposer] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading feed...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border shrink-0">
        {/* Type filter tabs */}
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

        {/* Symbol filter */}
        <input
          value={filters.symbol}
          onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
          placeholder="$SYM"
          className="w-20 bg-terminal-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-1 rounded border border-terminal-border focus:border-up/40 focus:outline-none uppercase"
        />

        {/* New post button */}
        <button
          onClick={() => setShowComposer((v) => !v)}
          className={`text-xxs font-mono px-2 py-1 rounded border transition-colors ${
            showComposer
              ? 'text-down border-down/30'
              : 'text-up border-up/30 hover:bg-up/10'
          }`}
        >
          {showComposer ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {/* Composer */}
      {showComposer && (
        <PostComposer
          onPostText={postText}
          onPostPosition={postPosition}
          onPostStrategy={postStrategy}
          onCancel={() => setShowComposer(false)}
        />
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {posts.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            No posts yet. Be the first to share!
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} onToggleLike={toggleLike} onDelete={deletePost} currentUserId={user?.id} />
          ))
        )}
      </div>
    </div>
  );
}
