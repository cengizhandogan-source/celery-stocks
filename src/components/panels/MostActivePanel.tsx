'use client';

import { useState } from 'react';
import { useScreener } from '@/hooks/useScreener';
import { useAppStore } from '@/stores/appStore';
import { useLayoutStore, getViewportCenterPosition } from '@/stores/layoutStore';
import { formatPrice, formatChange, formatPercent, formatVolume } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';
import TickerLogo from '@/components/ui/TickerLogo';

const TABS = [
  { label: 'Most Active', scrId: 'most_actives' },
  { label: 'Gainers', scrId: 'day_gainers' },
  { label: 'Losers', scrId: 'day_losers' },
] as const;

export default function MostActivePanel() {
  const [tabIdx, setTabIdx] = useState(0);
  const { results, loading } = useScreener(TABS[tabIdx].scrId);
  const setActiveSymbol = useAppStore((s) => s.setActiveSymbol);
  const addWindow = useLayoutStore((s) => s.addWindow);

  function handleClick(symbol: string) {
    setActiveSymbol(symbol);
    addWindow('chart', symbol, undefined, getViewportCenterPosition());
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex border-b border-terminal-border">
        {TABS.map((tab, i) => (
          <button
            key={tab.scrId}
            onClick={() => setTabIdx(i)}
            className={`flex-1 px-2 py-1.5 text-xxs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
              i === tabIdx
                ? 'text-text-primary border-b border-cyan'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && results.length === 0 ? (
        <div className="flex items-center justify-center flex-1">
          <Spinner size="sm" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-text-muted text-sm font-mono">
          No data
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" data-scrollable>
          <table className="w-full">
            <thead>
              <tr className="text-xxs text-text-muted font-mono uppercase sticky top-0 bg-terminal-panel">
                <th className="text-left px-3 py-1.5">Symbol</th>
                <th className="text-right px-3 py-1.5">Price</th>
                <th className="text-right px-3 py-1.5">Chg%</th>
                <th className="text-right px-3 py-1.5">Volume</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const color = r.change > 0 ? 'text-up' : r.change < 0 ? 'text-down' : 'text-text-secondary';
                return (
                  <tr
                    key={r.symbol}
                    onClick={() => handleClick(r.symbol)}
                    className="border-b border-terminal-border hover:bg-terminal-hover cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-1.5">
                      <div className="text-data font-mono text-text-primary font-medium flex items-center gap-1.5">
                        <TickerLogo symbol={r.symbol} size={18} />
                        {r.symbol}
                      </div>
                      <div className="text-xxs text-text-muted truncate max-w-[120px]">{r.name}</div>
                    </td>
                    <td className="text-right px-3 py-1.5 text-data font-mono text-text-primary">
                      ${formatPrice(r.price)}
                    </td>
                    <td className={`text-right px-3 py-1.5 text-data font-mono ${color}`}>
                      {formatPercent(r.changePercent)}
                    </td>
                    <td className="text-right px-3 py-1.5 text-data font-mono text-text-secondary">
                      {formatVolume(r.volume)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
