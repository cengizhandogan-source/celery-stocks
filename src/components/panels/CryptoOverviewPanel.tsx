'use client';

import { useState } from 'react';
import { CRYPTO_SYMBOLS } from '@/lib/constants';
import { useQuotes } from '@/hooks/useQuotes';
import { useAppStore } from '@/stores/appStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { formatCryptoPrice, formatChange, formatPercent, formatMarketCap } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';
import SymbolSearch from '@/components/ui/SymbolSearch';
import TickerLogo from '@/components/ui/TickerLogo';

const DEFAULT_SYMBOLS = CRYPTO_SYMBOLS.map(s => s.symbol);
const NAME_MAP: Record<string, string> = Object.fromEntries(CRYPTO_SYMBOLS.map(s => [s.symbol, s.name]));

interface CryptoOverviewPanelProps {
  symbols?: string[];
  windowId: string;
}

export default function CryptoOverviewPanel({ symbols: customSymbols, windowId }: CryptoOverviewPanelProps) {
  const displaySymbols = customSymbols?.length ? customSymbols : DEFAULT_SYMBOLS;
  const { quotes, loading } = useQuotes(displaySymbols);
  const setActiveSymbol = useAppStore((s) => s.setActiveSymbol);
  const { addWindowSymbol, removeWindowSymbol } = useLayoutStore();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto p-3" data-scrollable>
      <div className="text-xxs text-text-muted uppercase tracking-wider mb-2 font-mono">
        Crypto Markets
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
              onClick={() => setActiveSymbol(symbol)}
              className={`group relative bg-terminal-bg rounded px-3 py-2 border-l-2 ${borderColor} cursor-pointer hover:bg-terminal-hover transition-colors`}
            >
              <button
                onClick={(e) => { e.stopPropagation(); removeWindowSymbol(windowId, symbol); }}
                className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-text-muted hover:text-down text-xxs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                X
              </button>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TickerLogo symbol={symbol} size={20} />
                  <span className="text-xxs text-text-muted font-mono">{NAME_MAP[symbol] || symbol}</span>
                </div>
                <div className="text-xxs text-text-muted font-mono">{symbol.replace('-USD', '')}</div>
              </div>
              {loading && !q ? (
                <div className="mt-1">
                  <Spinner size="sm" />
                </div>
              ) : (
                <>
                  <div className="text-lg font-mono text-text-primary mt-0.5">
                    ${q ? formatCryptoPrice(q.price) : '-'}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-data font-mono ${color}`}>
                      {q ? `${formatChange(q.change)} (${formatPercent(q.changePercent)})` : '-'}
                    </span>
                    {q?.marketCap && (
                      <span className="text-xxs text-text-muted font-mono">
                        {formatMarketCap(q.marketCap)}
                      </span>
                    )}
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
            placeholder="Add crypto..."
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
