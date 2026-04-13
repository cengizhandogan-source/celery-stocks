import { useMemo, useEffect, useRef, useState, type ReactNode } from 'react';
import { MessageCircle } from 'lucide-react';
import { SENTIMENT_COLORS, SENTIMENT_BG } from '@/stores/chatStore';
import StrategyChip from '@/components/chat/StrategyChip';
import PositionEmbed from './PositionEmbed';
import MiniStockChart from './MiniStockChart';
import TickerLogo from '@/components/ui/TickerLogo';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import NetWorthBadge from '@/components/ui/NetWorthBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import CommentSection from './CommentSection';
import type { Post } from '@/lib/types';

const TICKER_RE = /\$([A-Z]{1,5})\b/g;

function renderContentWithTickers(content: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(TICKER_RE)) {
    const symbol = match[1];
    const start = match.index!;
    if (start > lastIndex) {
      parts.push(content.slice(lastIndex, start));
    }
    parts.push(
      <span key={start} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-cyan/10 text-cyan align-middle">
        <TickerLogo symbol={symbol} size={12} />
        <span>${symbol}</span>
      </span>
    );
    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

const TYPE_STYLES: Record<string, string> = {
  text: 'text-text-muted border-terminal-border',
  position: 'text-cyan border-cyan/30',
  strategy: 'text-violet-400 border-violet-400/30',
};

export default function PostCard({
  post,
  onToggleLike,
  onDelete,
  currentUserId,
}: {
  post: Post;
  onToggleLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = currentUserId != null && post.user_id === currentUserId;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);
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
    <div className="px-3 py-3 border-b border-terminal-border transition-colors">
      {/* Header: author + time */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <UserAvatar avatarUrl={post.profile?.avatar_url} size="sm" />
        <span
          className="text-xs font-mono font-medium truncate"
          style={{ color: post.profile?.avatar_color ?? '#888888' }}
        >
          {post.profile?.display_name ?? 'Unknown'}
        </span>
        {post.profile?.is_verified && <VerifiedBadge size={12} />}
        <NetWorthBadge netWorth={post.profile?.crypto_net_worth} showNetWorth={post.profile?.show_net_worth} />
        <span className="text-xxs font-mono text-text-muted ml-auto shrink-0">{timeStr}</span>
        {isOwner && onDelete && (
          <div className="relative ml-1.5 shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors px-1 leading-none"
              title="More options"
            >
              &hellip;
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] py-1 rounded border border-terminal-border bg-terminal-bg shadow-lg">
                <button
                  onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                  className="w-full text-left text-xxs font-mono px-3 py-1.5 text-down hover:bg-down/10 transition-colors"
                >
                  Delete post
                </button>
              </div>
            )}
          </div>
        )}
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

      {/* Mini stock chart */}
      {(post.symbol || post.position_symbol) && (
        <MiniStockChart symbol={(post.symbol || post.position_symbol)!} />
      )}

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
          {renderContentWithTickers(post.content)}
        </p>
      )}

      {/* Footer: like + comment buttons */}
      <div className="flex items-center gap-2 mt-2">
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
        <button
          onClick={() => setCommentsOpen(!commentsOpen)}
          className={`flex items-center gap-1 text-xxs font-mono px-1.5 py-0.5 rounded transition-colors ${
            commentsOpen
              ? 'text-cyan bg-cyan/10'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <MessageCircle size={12} />
          <span>{post.comment_count || ''}</span>
        </button>
      </div>

      {/* Inline comments */}
      {commentsOpen && (
        <div className="mt-2">
          <CommentSection postId={post.id} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}
