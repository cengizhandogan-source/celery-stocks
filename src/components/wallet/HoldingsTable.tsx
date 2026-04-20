'use client';

import { useState } from 'react';
import { formatPrice, formatNetWorth } from '@/lib/formatters';
import type { CryptoHolding } from '@/lib/types';
import TickerLogo from '@/components/ui/TickerLogo';

const MAX_VISIBLE = 5;

export default function HoldingsTable({
  holdings,
  totalNetWorth,
}: {
  holdings: CryptoHolding[];
  totalNetWorth: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? holdings : holdings.slice(0, MAX_VISIBLE);
  const hasMore = holdings.length > MAX_VISIBLE;

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1 text-xxs font-mono text-text-muted uppercase tracking-wider">
        <span>Asset</span>
        <span className="text-right w-20">Balance</span>
        <span className="text-right w-20">Value</span>
        <span className="text-right w-14">%</span>
      </div>

      {/* Rows */}
      {visible.map((h) => {
        const total = h.free_balance + h.locked_balance;
        const pct = totalNetWorth > 0 ? (h.usd_value / totalNetWorth) * 100 : 0;
        return (
          <div
            key={h.id}
            className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 text-xxs font-mono hover:bg-hover/50 rounded transition-colors"
          >
            <span className="text-text-primary font-medium truncate flex items-center gap-1.5">
              <TickerLogo symbol={h.asset} size={20} />
              {h.asset}
            </span>
            <span className="text-right text-text-secondary w-20">
              {total < 1 ? total.toFixed(6) : total < 1000 ? total.toFixed(4) : total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </span>
            <span className="text-right text-text-primary w-20">
              ${formatPrice(h.usd_value)}
            </span>
            <span className="text-right text-text-muted w-14">
              {pct.toFixed(1)}%
            </span>
          </div>
        );
      })}

      {/* Show all toggle */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center text-xxs font-mono text-info hover:text-info/80 py-2 transition-colors"
        >
          Show all {holdings.length} assets
        </button>
      )}
    </div>
  );
}
