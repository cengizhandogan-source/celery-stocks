'use client';

import { useStrategyStore } from '@/stores/strategyStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import type { StrategyChipData } from '@/lib/types';

export default function StrategyChip({ strategy }: { strategy: StrategyChipData }) {
  const importStrategy = useStrategyStore((s) => s.importStrategy);
  const addWindow = useLayoutStore((s) => s.addWindow);

  const bt = strategy.backtest;
  const isPositive = bt && bt.total_return >= 0;

  const handleImport = async () => {
    await importStrategy(strategy.id);
  };

  const handleViewCode = () => {
    addWindow('strategy-editor', undefined, strategy.id);
  };

  return (
    <div className="mt-1.5 border border-terminal-border rounded-md p-2 max-w-sm bg-terminal-bg/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div className="min-w-0">
          <div className="text-xs font-mono font-medium text-text-primary truncate">{strategy.name}</div>
          {strategy.description && (
            <div className="text-xxs font-mono text-text-muted truncate">{strategy.description}</div>
          )}
        </div>
        {strategy.author && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: strategy.author.avatar_color }}
            />
            <span className="text-xxs font-mono text-text-muted">{strategy.author.display_name}</span>
            {strategy.author.is_verified && <VerifiedBadge size={10} />}
          </div>
        )}
      </div>

      {/* Symbols */}
      {strategy.symbols.length > 0 && (
        <div className="flex gap-1 mb-1">
          {strategy.symbols.slice(0, 5).map(sym => (
            <span key={sym} className="text-xxs font-mono px-1 py-0.5 rounded bg-terminal-hover text-text-primary">
              {sym}
            </span>
          ))}
        </div>
      )}

      {/* Metrics */}
      {bt && (
        <>
          <div className="grid grid-cols-4 gap-1.5 mb-1">
            <div>
              <div className="text-xxs font-mono text-text-muted leading-tight">Return</div>
              <div className={`text-xxs font-mono font-medium ${isPositive ? 'text-up' : 'text-down'}`}>
                {isPositive ? '+' : ''}{bt.total_return.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-xxs font-mono text-text-muted leading-tight">Win</div>
              <div className="text-xxs font-mono text-text-primary">{bt.win_rate.toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xxs font-mono text-text-muted leading-tight">Sharpe</div>
              <div className="text-xxs font-mono text-text-primary">{bt.sharpe_ratio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-xxs font-mono text-text-muted leading-tight">DD</div>
              <div className="text-xxs font-mono text-down">{bt.max_drawdown.toFixed(1)}%</div>
            </div>
          </div>

          {bt.equity_curve && bt.equity_curve.length > 0 && (
            <div className="h-8 mb-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bt.equity_curve}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={isPositive ? '#4ade80' : '#f87171'}
                    fill={isPositive ? '#4ade8020' : '#f8717120'}
                    strokeWidth={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xxs font-mono text-text-muted">
          {strategy.import_count || 0} import{(strategy.import_count || 0) !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleViewCode}
            className="text-xxs font-mono px-1.5 py-0.5 rounded border border-terminal-border text-text-muted hover:text-text-primary hover:bg-terminal-hover transition-colors"
          >
            View Code
          </button>
          <button
            onClick={handleImport}
            className="text-xxs font-mono px-1.5 py-0.5 rounded border border-up/30 text-up hover:bg-up/10 transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
