'use client';

import { useHolders } from '@/hooks/useHolders';
import { formatPercent, formatVolume, formatMarketCap } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';

export default function HoldersPanel({ symbol }: { symbol: string }) {
  const { data, loading } = useHolders(symbol);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!data || data.holders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        No holder data
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b border-terminal-border">
        {data.insidersPercent != null && (
          <div>
            <div className="text-xxs text-text-muted font-mono">Insiders</div>
            <div className="text-data font-mono text-text-primary">
              {(data.insidersPercent * 100).toFixed(2)}%
            </div>
          </div>
        )}
        {data.institutionsPercent != null && (
          <div>
            <div className="text-xxs text-text-muted font-mono">Institutions</div>
            <div className="text-data font-mono text-text-primary">
              {(data.institutionsPercent * 100).toFixed(2)}%
            </div>
          </div>
        )}
        {data.institutionsCount != null && (
          <div>
            <div className="text-xxs text-text-muted font-mono">Inst. Count</div>
            <div className="text-data font-mono text-text-primary">
              {data.institutionsCount.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" data-scrollable>
        <table className="w-full">
          <thead>
            <tr className="text-xxs text-text-muted font-mono uppercase sticky top-0 bg-terminal-panel">
              <th className="text-left px-3 py-1.5">Holder</th>
              <th className="text-right px-3 py-1.5">Shares</th>
              <th className="text-right px-3 py-1.5">Value</th>
              <th className="text-right px-3 py-1.5">% Held</th>
            </tr>
          </thead>
          <tbody>
            {data.holders.map((h) => (
              <tr
                key={h.organization}
                className="border-b border-terminal-border hover:bg-terminal-hover transition-colors"
              >
                <td className="px-3 py-1.5">
                  <div className="text-data font-mono text-text-primary truncate max-w-[180px]">
                    {h.organization}
                  </div>
                  {h.reportDate && (
                    <div className="text-xxs text-text-muted font-mono">{h.reportDate}</div>
                  )}
                </td>
                <td className="text-right px-3 py-1.5 text-data font-mono text-text-secondary">
                  {formatVolume(h.shares)}
                </td>
                <td className="text-right px-3 py-1.5 text-data font-mono text-text-secondary">
                  {formatMarketCap(h.value)}
                </td>
                <td className="text-right px-3 py-1.5 text-data font-mono text-text-primary">
                  {formatPercent(h.pctHeld * 100)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
