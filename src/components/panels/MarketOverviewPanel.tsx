'use client';

import { useState } from 'react';
import { INDEX_SYMBOLS } from '@/lib/constants';
import { useQuotes } from '@/hooks/useQuotes';
import { useLayoutStore } from '@/stores/layoutStore';
import { formatPrice, formatChange, formatPercent } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';
import SymbolSearch from '@/components/ui/SymbolSearch';

const DEFAULT_SYMBOLS = INDEX_SYMBOLS.map(s => s.symbol);
const NAME_MAP: Record<string, string> = Object.fromEntries(INDEX_SYMBOLS.map(s => [s.symbol, s.name]));

interface MarketOverviewPanelProps {
  symbols?: string[];
  windowId: string;
}

export default function MarketOverviewPanel({ symbols: customSymbols, windowId }: MarketOverviewPanelProps) {
  const displaySymbols = customSymbols?.length ? customSymbols : DEFAULT_SYMBOLS;
  const { quotes, loading } = useQuotes(displaySymbols);
  const { addWindowSymbol, removeWindowSymbol } = useLayoutStore();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto p-3" data-scrollable>
      <div className="text-xxs text-text-muted uppercase tracking-wider mb-2 font-mono">
        Major Indices
      </div>
      <div className="grid grid-cols-2 gap-2">
        {displaySymbols.map((symbol) => {
          const q = quotes[symbol];
          const change = q?.change ?? 0;
          const borderColor = change > 0 ? 'border-l-up' : change < 0 ? 'border-l-down' : 'border-l-text-muted';
          const color = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-text-secondary';

          return (
            <div
              key={symbol}
              className={`group relative bg-terminal-bg rounded px-3 py-2 border-l-2 ${borderColor}`}
            >
              <button
                onClick={() => removeWindowSymbol(windowId, symbol)}
                className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-text-muted hover:text-down text-xxs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
              <div className="text-xxs text-text-muted font-mono">{NAME_MAP[symbol] || symbol}</div>
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

      {/* Add symbol */}
      <div className="relative mt-2">
        {adding ? (
          <SymbolSearch
            onSelect={(sym) => {
              addWindowSymbol(windowId, sym, DEFAULT_SYMBOLS);
              setAdding(false);
            }}
            onClose={() => setAdding(false)}
            placeholder="Add ticker..."
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-1.5 text-xxs font-mono text-text-muted hover:text-text-primary border border-dashed border-terminal-border rounded hover:border-text-muted transition-colors cursor-pointer"
          >
            + Add Symbol
          </button>
        )}
      </div>
    </div>
  );
}
