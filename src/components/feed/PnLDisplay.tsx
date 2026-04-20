import type { ReactNode } from 'react';
import TickerLogo from '@/components/ui/TickerLogo';
import { formatPercent } from '@/lib/formatters';

interface PnLDisplayProps {
  symbol: string;
  pnlDollars: number | null;
  pnlPercent: number | null;
  currentPrice?: number;
  shares?: number | null;
  avgCost?: number | null;
  chart?: ReactNode;
}

export default function PnLDisplay({ symbol, pnlDollars, pnlPercent, currentPrice, shares, avgCost, chart }: PnLDisplayProps) {
  if (pnlDollars == null) {
    return (
      <div className="border border-border rounded-lg bg-base/80 overflow-hidden px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <TickerLogo symbol={symbol} size={22} />
          <span className="text-xs font-mono font-medium text-text-secondary tracking-wide">{symbol}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-32 rounded bg-hover/50 animate-pulse" />
          {chart && <div className="w-[50%] shrink-0 ml-auto">{chart}</div>}
        </div>
      </div>
    );
  }

  const isPositive = pnlDollars >= 0;
  const color = isPositive ? 'text-profit' : 'text-loss';
  const sign = isPositive ? '+' : '-';
  const formattedPnl = `${sign}$${Math.abs(pnlDollars).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="border border-border rounded-lg bg-base/80 overflow-hidden px-3.5 py-3">
      <div className="flex items-center gap-2 mb-2">
        <TickerLogo symbol={symbol} size={22} />
        <span className="text-xs font-mono font-medium text-text-secondary tracking-wide">{symbol}</span>
        {currentPrice != null && (
          <span className="text-xs font-mono text-text-muted">
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className={`text-lg font-mono font-bold leading-none mb-1 ${color}`}>
            {formattedPnl}
          </div>
          {pnlPercent != null && (
            <span className={`text-xs font-mono font-medium ${color}`}>
              {formatPercent(pnlPercent)}
            </span>
          )}
        </div>
        {chart && <div className="w-[50%] shrink-0 ml-auto">{chart}</div>}
      </div>
      {(shares != null || avgCost != null) && (
        <div className="flex gap-4 mt-2 pt-2 border-t border-border/50">
          {shares != null && (
            <div>
              <div className="text-xxs font-mono text-text-muted leading-tight">Shares</div>
              <div className="text-xs font-mono text-text-primary">{shares}</div>
            </div>
          )}
          {avgCost != null && (
            <div>
              <div className="text-xxs font-mono text-text-muted leading-tight">Avg Cost</div>
              <div className="text-xs font-mono text-text-primary">${Number(avgCost).toFixed(2)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
