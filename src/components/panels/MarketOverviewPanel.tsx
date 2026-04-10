'use client';

import { INDEX_SYMBOLS } from '@/lib/constants';
import { useQuotes } from '@/hooks/useQuotes';
import { formatPrice, formatChange, formatPercent } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';

export default function MarketOverviewPanel() {
  const symbols = INDEX_SYMBOLS.map(s => s.symbol);
  const { quotes, loading } = useQuotes(symbols);

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto p-3">
      <div className="text-xxs text-text-muted uppercase tracking-wider mb-2 font-mono">
        Major Indices
      </div>
      <div className="grid grid-cols-2 gap-2">
        {INDEX_SYMBOLS.map(({ symbol, name }) => {
          const q = quotes[symbol];
          const change = q?.change ?? 0;
          const borderColor = change > 0 ? 'border-l-up' : change < 0 ? 'border-l-down' : 'border-l-text-muted';
          const color = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-text-secondary';

          return (
            <div
              key={symbol}
              className={`bg-terminal-bg rounded px-3 py-2 border-l-2 ${borderColor}`}
            >
              <div className="text-xxs text-text-muted font-mono">{name}</div>
              {loading && !q ? (
                <div className="mt-1">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  <div className="text-lg font-mono text-text-primary mt-0.5">
                    {q ? formatPrice(q.price) : '-'}
                  </div>
                  <div className={`text-data font-mono ${color}`}>
                    {q ? `${formatChange(q.change)} (${formatPercent(q.changePercent)})` : '-'}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
