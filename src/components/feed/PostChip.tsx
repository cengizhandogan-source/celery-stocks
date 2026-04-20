import Link from 'next/link';
import UserAvatar from '@/components/ui/UserAvatar';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import TickerLogo from '@/components/ui/TickerLogo';
import type { Post } from '@/lib/types';

const TYPE_LABEL: Record<Post['post_type'], string> = {
  text: 'post',
  position: 'position',
  trade: 'trade',
};

export default function PostChip({ post }: { post: Post }) {
  const author = post.profile;
  const symbol = post.symbol ?? post.position_symbol ?? post.trade_symbol;
  const preview = (post.content ?? '').trim();

  return (
    <Link
      href={`/social/post/${post.id}`}
      className="mt-1.5 block border border-border rounded-md p-2 max-w-sm bg-base/50 hover:bg-hover transition-colors"
    >
      <div className="flex items-center gap-1.5 mb-1">
        <UserAvatar avatarUrl={author?.avatar_url} size="sm" />
        <span className="text-xxs font-mono font-medium truncate text-text-primary">
          {author?.username ? `@${author.username}` : 'Unknown'}
        </span>
        {author?.is_verified && <VerifiedBadge size={12} />}
        <span className="text-xxs font-mono text-text-muted ml-auto uppercase tracking-wider">
          {TYPE_LABEL[post.post_type]}
        </span>
      </div>

      {symbol && (
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-flex items-center gap-0.5 text-xxs font-mono">
            <TickerLogo symbol={symbol} size={12} />
            <span>${symbol}</span>
          </span>
        </div>
      )}

      {preview && (
        <p className="text-xxs font-mono text-text-secondary line-clamp-2 leading-snug">
          {preview}
        </p>
      )}

      {!preview && !symbol && (
        <p className="text-xxs font-mono text-text-muted italic">
          View {TYPE_LABEL[post.post_type]}
        </p>
      )}
    </Link>
  );
}
