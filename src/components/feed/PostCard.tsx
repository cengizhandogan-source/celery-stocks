import { useMemo } from 'react';
import { SENTIMENT_COLORS, SENTIMENT_BG } from '@/stores/chatStore';
import StrategyChip from '@/components/chat/StrategyChip';
import PositionEmbed from './PositionEmbed';
import type { Post } from '@/lib/types';

const TYPE_STYLES: Record<string, string> = {
  text: 'text-text-muted border-terminal-border',
  position: 'text-cyan border-cyan/30',
  strategy: 'text-violet-400 border-violet-400/30',
};

export default function PostCard({
  post,
  onToggleLike,
}: {
  post: Post;
  onToggleLike: (postId: string) => void;
}) {
  const timeStr = useMemo(() => {
    const d = new Date(post.created_at);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);

    if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60000))}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [post.created_at]);

  return (
    <div className="px-3 py-3 border-b border-terminal-border hover:bg-terminal-hover transition-colors">
      {/* Header: author + time */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: post.profile?.avatar_color ?? '#888888' }}
        />
        <span
          className="text-xs font-mono font-medium truncate"
          style={{ color: post.profile?.avatar_color ?? '#888888' }}
        >
          {post.profile?.display_name ?? 'Unknown'}
        </span>
        <span className="text-xxs font-mono text-text-muted ml-auto shrink-0">{timeStr}</span>
      </div>

      {/* Badges: type + symbol + sentiment */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={`text-xxs font-mono px-1.5 py-0.5 rounded border capitalize ${TYPE_STYLES[post.post_type]}`}
        >
          {post.post_type}
        </span>
        {post.symbol && (
          <span className="text-xxs font-mono text-cyan px-1.5 py-0.5 bg-cyan/10 rounded">
            ${post.symbol}
          </span>
        )}
        {post.sentiment && (
          <span
            className={`text-xxs font-mono px-1.5 py-0.5 rounded capitalize ${SENTIMENT_COLORS[post.sentiment]} ${SENTIMENT_BG[post.sentiment]}`}
          >
            {post.sentiment}
          </span>
        )}
      </div>

      {/* Type-specific content */}
      {post.post_type === 'position' && <PositionEmbed post={post} />}
      {post.post_type === 'strategy' && post.strategy && (
        <StrategyChip strategy={post.strategy} />
      )}
      {post.post_type === 'strategy' && !post.strategy && (
        <div className="text-xxs font-mono text-text-muted italic px-2 py-1.5 border border-terminal-border rounded bg-terminal-bg/50">
          Strategy removed
        </div>
      )}

      {/* Text content */}
      {post.content && (
        <p className={`text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap ${post.post_type !== 'text' ? 'mt-2' : ''}`}>
          {post.content}
        </p>
      )}

      {/* Footer: like button */}
      <div className="flex items-center mt-2">
        <button
          onClick={() => onToggleLike(post.id)}
          className={`flex items-center gap-1 text-xxs font-mono px-1.5 py-0.5 rounded transition-colors ${
            post.liked_by_me
              ? 'text-up bg-up/10'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <span>{post.liked_by_me ? '\u25B2' : '\u25B3'}</span>
          <span>{post.like_count}</span>
        </button>
      </div>
    </div>
  );
}
