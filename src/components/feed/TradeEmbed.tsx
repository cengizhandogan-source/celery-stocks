import type { Post } from '@/lib/types';

export default function TradeEmbed({ post, hidePnl = false }: { post: Post; hidePnl?: boolean }) {
  const isBuy = post.trade_side === 'buy';
  const pnl = post.trade_pnl;
  const executedAt = post.trade_executed_at
    ? new Date(post.trade_executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="rounded border border-border bg-base/50">
      <div className="grid grid-cols-3 gap-2 px-2 py-1.5">
        <div>
          <div className="text-xxs font-mono text-text-muted leading-tight">Symbol</div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono font-medium text-text-primary">${post.trade_symbol}</span>
            <span className={`text-xxs font-mono font-medium px-1 rounded ${isBuy ? 'bg-profit/10 text-profit' : 'bg-loss/10 text-loss'}`}>
              {isBuy ? 'BUY' : 'SELL'}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted leading-tight">Qty</div>
          <div className="text-xs font-mono text-text-primary">{Number(post.trade_qty).toLocaleString(undefined, { maximumFractionDigits: 8 })}</div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted leading-tight">Price</div>
          <div className="text-xs font-mono text-text-primary">${Number(post.trade_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 px-2 py-1.5 border-t border-border/50">
        <div>
          <div className="text-xxs font-mono text-text-muted leading-tight">Total</div>
          <div className="text-xs font-mono text-text-primary">${Number(post.trade_quote_qty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        {executedAt && (
          <div>
            <div className="text-xxs font-mono text-text-muted leading-tight">Date</div>
            <div className="text-xs font-mono text-text-primary">{executedAt}</div>
          </div>
        )}
        {!hidePnl && pnl != null && (
          <div>
            <div className="text-xxs font-mono text-text-muted leading-tight">P&L</div>
            <div className={`text-xs font-mono font-medium ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {pnl >= 0 ? '+' : ''}{Number(pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
