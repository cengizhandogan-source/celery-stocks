import { useMemo, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { MessageCircle, Share2, Heart } from 'lucide-react';
import TradeEmbed from './TradeEmbed';
import MiniStockChart from './MiniStockChart';
import PnLDisplay from './PnLDisplay';
import TickerLogo from '@/components/ui/TickerLogo';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import NetWorthBadge from '@/components/ui/NetWorthBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import CommentSection from './CommentSection';
import SharePostModal from './SharePostModal';
import { useAuthGate } from '@/hooks/useAuthGate';
import type { Post, Quote } from '@/lib/types';

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
      <span key={start} className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-gold/10 text-gold font-mono align-middle">
        <TickerLogo symbol={symbol} size={14} />
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

export default function PostCard({
  post,
  onToggleLike,
  onDelete,
  currentUserId,
  defaultCommentsOpen = false,
}: {
  post: Post;
  onToggleLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  currentUserId?: string;
  defaultCommentsOpen?: boolean;
}) {
  const { requireAuth } = useAuthGate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const [shareOpen, setShareOpen] = useState(false);
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isOwner = currentUserId != null && post.user_id === currentUserId;
  const handleQuoteReady = useCallback((quote: Quote) => setCurrentQuote(quote), []);

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
    <div className="px-4 py-3.5 border-b border-border transition-colors duration-150 ease-[var(--ease-snap)] hover:bg-surface/60">
      {/* Header: author + time */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <Link href={`/social/profile/${post.user_id}`} className="flex items-center gap-1.5 min-w-0">
          <UserAvatar avatarUrl={post.profile?.avatar_url} size="sm" />
          <span className="text-sm font-sans font-semibold truncate hover:underline text-text-primary">
            {post.profile?.display_name ?? 'Unknown'}
          </span>
        </Link>
        {post.profile?.is_verified && <VerifiedBadge size={14} />}
        <NetWorthBadge netWorth={post.profile?.crypto_net_worth} showNetWorth={post.profile?.show_net_worth} />
        <span className="text-xxs font-mono text-text-muted ml-auto shrink-0">{timeStr}</span>
        {isOwner && onDelete && (
          <div className="relative ml-1.5 shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-xs font-sans text-text-muted hover:text-text-secondary transition-colors px-1 leading-none"
              title="More options"
            >
              &hellip;
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] py-1 rounded-lg border border-border bg-card shadow-lg">
                <button
                  onClick={() => { onDelete(post.id); setMenuOpen(false); }}
                  className="w-full text-left text-xs font-sans px-3 py-1.5 text-loss hover:bg-loss/10 transition-colors"
                >
                  Delete post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PnL display for position/trade posts */}
      {post.post_type === 'position' && post.position_avg_cost != null && post.position_shares != null && (
        <PnLDisplay
          symbol={post.position_symbol!}
          pnlDollars={currentQuote ? (currentQuote.price - post.position_avg_cost) * post.position_shares : null}
          pnlPercent={currentQuote ? ((currentQuote.price - post.position_avg_cost) / post.position_avg_cost) * 100 : null}
          currentPrice={currentQuote?.price}
          shares={post.position_shares}
          avgCost={post.position_avg_cost}
          chart={<MiniStockChart symbol={post.position_symbol!} compact onQuoteReady={handleQuoteReady} />}
        />
      )}
      {post.post_type === 'trade' && post.trade_pnl != null && (
        <PnLDisplay
          symbol={post.trade_symbol!}
          pnlDollars={post.trade_pnl}
          pnlPercent={post.trade_price && post.trade_qty ? (post.trade_pnl / (post.trade_price * post.trade_qty)) * 100 : null}
          currentPrice={currentQuote?.price}
          chart={post.trade_symbol ? <MiniStockChart symbol={post.trade_symbol} compact /> : undefined}
        />
      )}

      {/* Chart: full size for text posts with a symbol */}
      {post.post_type === 'text' && (post.symbol || post.position_symbol) && (
        <MiniStockChart symbol={(post.symbol || post.position_symbol)!} />
      )}

      {/* Type-specific embeds */}
      {post.post_type === 'trade' && <TradeEmbed post={post} hidePnl />}

      {post.content && (
        <p className={`text-sm font-sans text-text-primary leading-relaxed whitespace-pre-wrap ${post.post_type !== 'text' ? 'mt-2' : ''}`}>
          {renderContentWithTickers(post.content)}
        </p>
      )}

      {/* Footer: like + comment buttons */}
      <div className="flex items-center gap-1 mt-2.5">
        <button
          onClick={() => { if (requireAuth('like this post')) onToggleLike(post.id); }}
          className={`flex items-center gap-1.5 text-xs font-sans px-2 py-1 rounded-md transition-all duration-150 ease-[var(--ease-snap)] ${
            post.liked_by_me
              ? 'text-profit bg-profit/10'
              : 'text-text-muted hover:text-text-primary hover:bg-hover'
          }`}
          aria-label={post.liked_by_me ? 'Unlike' : 'Like'}
        >
          <Heart size={14} strokeWidth={post.liked_by_me ? 2.2 : 1.75} fill={post.liked_by_me ? 'currentColor' : 'none'} />
          <span className="font-mono tabular-nums">{post.like_count}</span>
        </button>
        <button
          onClick={() => setCommentsOpen(!commentsOpen)}
          className={`flex items-center gap-1.5 text-xs font-sans px-2 py-1 rounded-md transition-all duration-150 ease-[var(--ease-snap)] ${
            commentsOpen
              ? 'text-info bg-info/10'
              : 'text-text-muted hover:text-text-primary hover:bg-hover'
          }`}
          aria-label="Comments"
        >
          <MessageCircle size={14} strokeWidth={1.75} />
          <span className="font-mono tabular-nums">{post.comment_count || ''}</span>
        </button>
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-1.5 text-xs font-sans px-2 py-1 rounded-md text-text-muted hover:text-text-primary hover:bg-hover transition-all duration-150 ease-[var(--ease-snap)]"
          title="Share"
          aria-label="Share post"
        >
          <Share2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Inline comments */}
      {commentsOpen && (
        <div className="mt-2">
          <CommentSection postId={post.id} currentUserId={currentUserId} />
        </div>
      )}

      {shareOpen && <SharePostModal post={post} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
