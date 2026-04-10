'use client';

import { useState } from 'react';
import { useWatchlistStore } from '@/stores/watchlistStore';
import { useAppStore } from '@/stores/appStore';
import { useQuotes } from '@/hooks/useQuotes';
import { formatAssetPrice, formatVolume, formatPercent, formatChange } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';
import TickerLogo from '@/components/ui/TickerLogo';

export default function WatchlistPanel() {
  const { symbols, addSymbol, removeSymbol } = useWatchlistStore();
  const { activeSymbol, setActiveSymbol } = useAppStore();
  const { quotes, loading } = useQuotes(symbols);
  const [input, setInput] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      addSymbol(input.trim());
      setInput('');
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header row */}
      <div className="flex items-center px-3 py-1.5 text-xxs text-text-muted uppercase tracking-wider font-mono border-b border-terminal-border shrink-0">
        <span className="flex-1 min-w-0">Symbol</span>
        <span className="w-20 text-right">Last</span>
        <span className="w-18 text-right">Chg</span>
        <span className="w-20 text-right">Chg%</span>
        <span className="w-16 text-right">Vol</span>
        <span className="w-5" />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {loading && symbols.length > 0 && Object.keys(quotes).length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : (
          symbols.map((sym) => {
            const q = quotes[sym];
            const isActive = sym === activeSymbol;
            const change = q?.change ?? 0;
            const color = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-text-secondary';

            return (
              <div
                key={sym}
                onClick={() => setActiveSymbol(sym)}
                className={`group flex items-center px-3 py-1.5 cursor-pointer transition-colors border-l-2 ${
                  isActive
                    ? 'border-l-cyan bg-terminal-hover'
                    : 'border-transparent hover:bg-terminal-hover'
                }`}
              >
                <span className="flex-1 min-w-0 text-data font-mono font-medium text-text-primary truncate flex items-center gap-1.5">
                  <TickerLogo symbol={sym} size={18} />
                  {sym}
                </span>
                <span className="w-20 text-right text-data font-mono text-text-primary">
                  {q ? formatAssetPrice(q.price, sym) : '-'}
                </span>
                <span className={`w-18 text-right text-data font-mono ${color}`}>
                  {q ? formatChange(q.change) : '-'}
                </span>
                <span className={`w-20 text-right text-data font-mono ${color}`}>
                  {q ? formatPercent(q.changePercent) : '-'}
                </span>
                <span className="w-16 text-right text-data font-mono text-text-muted">
                  {q ? formatVolume(q.volume) : '-'}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSymbol(sym); }}
                  className="w-5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-down text-xs transition-opacity ml-1"
                >
                  X
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add symbol input */}
      <form onSubmit={handleAdd} className="flex items-center px-3 py-1.5 border-t border-terminal-border shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          placeholder="Add ticker..."
          className="flex-1 bg-transparent text-data font-mono text-text-primary outline-none placeholder:text-text-muted"
        />
      </form>
    </div>
  );
}
