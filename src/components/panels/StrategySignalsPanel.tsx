'use client';

import { useEffect, useState } from 'react';
import { useStrategyStore } from '@/stores/strategyStore';
import type { StrategySignal } from '@/lib/types';

export default function StrategySignalsPanel() {
  const activeSignals = useStrategyStore((s) => s.activeSignals);
  const strategies = useStrategyStore((s) => s.strategies);
  const initialize = useStrategyStore((s) => s.initialize);
  const clearSignals = useStrategyStore((s) => s.clearSignals);
  const loading = useStrategyStore((s) => s.loading);
  const [filter, setFilter] = useState<'all' | 'buy' | 'sell' | 'hold'>('all');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initialize().then(() => setInitialized(true));
    }
  }, [initialize, initialized]);

  const getStrategyName = (strategyId: string) => {
    return strategies.find(s => s.id === strategyId)?.name || 'Unknown';
  };

  const filtered = filter === 'all'
    ? activeSignals
    : activeSignals.filter(s => s.signal === filter);

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading signals...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border shrink-0">
        <div className="flex items-center gap-1">
          {(['all', 'buy', 'sell', 'hold'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xxs font-mono px-1.5 py-0.5 rounded transition-colors ${
                filter === f
                  ? f === 'buy' ? 'bg-up/20 text-up' :
                    f === 'sell' ? 'bg-down/20 text-down' :
                    f === 'hold' ? 'bg-text-muted/20 text-text-muted' :
                    'bg-terminal-hover text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <span className="text-xxs font-mono text-text-muted">{filtered.length} signals</span>
        {activeSignals.length > 0 && (
          <button
            onClick={clearSignals}
            className="text-xxs font-mono text-text-muted hover:text-down transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            {activeSignals.length === 0 ? 'No signals yet. Activate a strategy to see signals.' : 'No matching signals.'}
          </div>
        ) : (
          filtered.map((sig: StrategySignal) => (
            <div
              key={sig.id}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono hover:bg-terminal-hover transition-colors border-b border-terminal-border/50"
            >
              <span className={`w-10 shrink-0 font-medium ${
                sig.signal === 'buy' ? 'text-up' :
                sig.signal === 'sell' ? 'text-down' :
                'text-text-muted'
              }`}>
                {sig.signal.toUpperCase()}
              </span>
              <span className="w-14 shrink-0 text-text-primary">{sig.symbol}</span>
              <span className="text-text-muted truncate flex-1">{getStrategyName(sig.strategy_id)}</span>
              <span className="text-xxs text-text-muted shrink-0">
                {sig.confidence > 0 && `${(sig.confidence * 100).toFixed(0)}%`}
              </span>
              <span className="text-xxs text-text-muted shrink-0">
                {new Date(sig.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
