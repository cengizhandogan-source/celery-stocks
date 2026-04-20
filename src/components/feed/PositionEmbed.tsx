import type { Post } from '@/lib/types';

export default function PositionEmbed({ post }: { post: Post }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-2 py-1.5 rounded border border-border bg-base/50">
      <div>
        <div className="text-xxs font-mono text-text-muted leading-tight">Symbol</div>
        <div className="text-xs font-mono font-medium text-text-primary">${post.position_symbol}</div>
      </div>
      <div>
        <div className="text-xxs font-mono text-text-muted leading-tight">Shares</div>
        <div className="text-xs font-mono text-text-primary">{post.position_shares}</div>
      </div>
      <div>
        <div className="text-xxs font-mono text-text-muted leading-tight">Avg Cost</div>
        <div className="text-xs font-mono text-text-primary">
          ${Number(post.position_avg_cost).toFixed(2)}
        </div>
      </div>
    </div>
  );
}
