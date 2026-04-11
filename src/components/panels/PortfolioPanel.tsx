'use client';

import { useState, useEffect, useRef } from 'react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { useQuotes } from '@/hooks/useQuotes';
import { formatPrice, formatChange, formatPercent } from '@/lib/formatters';
import PortfolioSelector from '@/components/portfolio/PortfolioSelector';
import CreatePortfolioModal from '@/components/portfolio/CreatePortfolioModal';
import PortfolioMenu from '@/components/portfolio/PortfolioMenu';
import PerformanceChart from '@/components/portfolio/PerformanceChart';
import TickerLogo from '@/components/ui/TickerLogo';

export default function PortfolioPanel() {
  const {
    portfolios,
    activePortfolioId,
    positions,
    snapshots,
    loading,
    setActivePortfolio,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    addPosition,
    removePosition,
    recordSnapshot,
  } = usePortfolio();

  const symbols = positions.map((p) => p.symbol);
  const { quotes } = useQuotes(symbols);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddPosition, setShowAddPosition] = useState(false);
  const snapshotRecorded = useRef(false);

  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId);

  // Summary calculations
  let totalValue = 0;
  let totalCost = 0;
  let dayChange = 0;
  for (const p of positions) {
    const q = quotes[p.symbol];
    const price = q?.price ?? p.avgCost;
    totalValue += price * p.shares;
    totalCost += p.avgCost * p.shares;
    if (q?.change) dayChange += q.change * p.shares;
  }
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const dayChangePct = totalValue - dayChange > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;
  const pnlColor = totalPnl > 0 ? 'text-up' : totalPnl < 0 ? 'text-down' : 'text-text-secondary';
  const dayColor = dayChange > 0 ? 'text-up' : dayChange < 0 ? 'text-down' : 'text-text-secondary';

  // Record daily snapshot when we have live data
  useEffect(() => {
    if (positions.length > 0 && Object.keys(quotes).length > 0 && !snapshotRecorded.current && activePortfolioId) {
      snapshotRecorded.current = true;
      recordSnapshot(totalValue, totalCost, dayChange);
    }
  }, [positions, quotes, activePortfolioId]);

  // Reset snapshot flag when portfolio changes
  useEffect(() => {
    snapshotRecorded.current = false;
  }, [activePortfolioId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Portfolio toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-terminal-border shrink-0">
        <PortfolioSelector
          portfolios={portfolios}
          activeId={activePortfolioId}
          onSelect={setActivePortfolio}
          onCreateNew={() => setShowCreateModal(true)}
        />
        <div className="flex-1" />
        <PortfolioMenu
          portfolioName={activePortfolio?.name ?? ''}
          canDelete={portfolios.length > 1}
          onRename={(name) => activePortfolioId && renamePortfolio(activePortfolioId, name)}
          onDelete={() => activePortfolioId && deletePortfolio(activePortfolioId)}
        />
      </div>

      {/* Performance chart */}
      <PerformanceChart
        snapshots={snapshots}
        currentValue={totalValue}
        totalCost={totalCost}
      />

      {/* Summary */}
      {positions.length > 0 && (
        <div className="flex items-center gap-4 px-3 py-2 bg-terminal-bg text-data font-mono border-b border-terminal-border shrink-0">
          <div>
            <span className="text-xxs text-text-muted">MKT VAL </span>
            <span className="text-text-primary">${formatPrice(totalValue)}</span>
          </div>
          <div>
            <span className="text-xxs text-text-muted">P&L </span>
            <span className={pnlColor}>{formatChange(totalPnl)} ({formatPercent(totalPnlPct)})</span>
          </div>
          <div>
            <span className="text-xxs text-text-muted">DAY </span>
            <span className={dayColor}>{formatChange(dayChange)} ({formatPercent(dayChangePct)})</span>
          </div>
        </div>
      )}

      {/* Table header */}
      {positions.length > 0 && (
        <div className="flex items-center px-3 py-1 text-xxs text-text-muted uppercase tracking-wider font-mono border-b border-terminal-border shrink-0">
          <span className="w-20">Symbol</span>
          <span className="w-16 text-right">Shares</span>
          <span className="w-20 text-right">Avg Cost</span>
          <span className="w-20 text-right">Current</span>
          <span className="flex-1 text-right">P&L</span>
          <span className="w-5" />
        </div>
      )}

      {/* Rows */}
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {positions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            No positions. Click + to add.
          </div>
        ) : (
          positions.map((pos) => {
            const q = quotes[pos.symbol];
            const price = q?.price ?? 0;
            const pnl = (price - pos.avgCost) * pos.shares;
            const pnlPct = pos.avgCost > 0 ? ((price - pos.avgCost) / pos.avgCost) * 100 : 0;
            const rowColor = pnl > 0 ? 'text-up' : pnl < 0 ? 'text-down' : 'text-text-secondary';

            return (
              <div key={pos.id} className="group flex items-center px-3 py-1.5 hover:bg-terminal-hover transition-colors">
                <span className="w-20 text-data font-mono font-medium text-text-primary flex items-center gap-1.5">
                  <TickerLogo symbol={pos.symbol} size={18} />
                  {pos.symbol}
                </span>
                <span className="w-16 text-right text-data font-mono text-text-secondary">{pos.shares}</span>
                <span className="w-20 text-right text-data font-mono text-text-secondary">${formatPrice(pos.avgCost)}</span>
                <span className="w-20 text-right text-data font-mono text-text-primary">{price > 0 ? `$${formatPrice(price)}` : '-'}</span>
                <span className={`flex-1 text-right text-data font-mono ${rowColor}`}>
                  {price > 0 ? `${formatChange(pnl)} (${formatPercent(pnlPct)})` : '-'}
                </span>
                <button
                  onClick={() => removePosition(pos.id)}
                  className="w-5 opacity-0 group-hover:opacity-100 text-text-muted hover:text-down text-xs transition-opacity ml-1"
                >
                  X
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add position */}
      {showAddPosition ? (
        <AddPositionForm
          onClose={() => setShowAddPosition(false)}
          onAdd={(data) => { addPosition(data); setShowAddPosition(false); }}
        />
      ) : (
        <div className="flex items-center px-3 py-1.5 border-t border-terminal-border shrink-0">
          <button
            onClick={() => setShowAddPosition(true)}
            className="text-text-muted hover:text-up text-sm font-mono transition-colors"
          >
            + Add Position
          </button>
        </div>
      )}

      {/* Create portfolio modal */}
      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(name) => { createPortfolio(name); setShowCreateModal(false); }}
          existingNames={portfolios.map((p) => p.name)}
        />
      )}
    </div>
  );
}

function AddPositionForm({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: { symbol: string; shares: number; avgCost: number }) => void;
}) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (symbol && shares && cost) {
      onAdd({ symbol: symbol.toUpperCase(), shares: Number(shares), avgCost: Number(cost) });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      className="border-t border-terminal-border shrink-0 px-3 py-2 flex flex-col gap-2 bg-terminal-panel"
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol"
          className="w-20 bg-terminal-input border border-terminal-border rounded px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-up/40"
          autoFocus
        />
        <input
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder="Shares"
          className="w-20 bg-terminal-input border border-terminal-border rounded px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-up/40"
        />
        <input
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="Avg Cost"
          className="w-24 bg-terminal-input border border-terminal-border rounded px-2 py-1.5 font-mono text-xs text-text-primary outline-none focus:border-up/40"
        />
        <div className="flex-1" />
        <button type="button" onClick={onClose} className="text-text-muted hover:text-text-secondary text-xs font-mono px-2 py-1.5 transition-colors">
          Cancel
        </button>
        <button type="submit" className="bg-up text-black font-mono text-xs px-3 py-1.5 rounded hover:bg-up/80 transition-colors">
          Add
        </button>
      </div>
    </form>
  );
}
