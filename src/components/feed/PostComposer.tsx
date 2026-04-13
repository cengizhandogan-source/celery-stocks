'use client';

import { useState, useCallback, useMemo } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useCachedTrades } from '@/hooks/useCachedTrades';
import { useStrategyStore } from '@/stores/strategyStore';
import type { Sentiment, PostType } from '@/lib/types';

interface PostComposerProps {
  onPostText: (data: { content: string; symbol?: string; sentiment?: Sentiment }) => Promise<void>;
  onPostPosition: (data: { content?: string; symbol: string; shares: number; avgCost: number; sentiment?: Sentiment }) => Promise<void>;
  onPostTrade: (data: {
    content?: string;
    symbol: string;
    side: 'buy' | 'sell';
    qty: number;
    price: number;
    quoteQty: number;
    pnl?: number;
    executedAt: string;
    sentiment?: Sentiment;
  }) => Promise<void>;
  onPostStrategy: (data: { content?: string; strategyId: string }) => Promise<void>;
  onCancel: () => void;
}

const sentiments: Sentiment[] = ['bullish', 'bearish', 'neutral'];
const sentimentStyles: Record<Sentiment, string> = {
  bullish: 'border-up/50 bg-up/10 text-up',
  bearish: 'border-down/50 bg-down/10 text-down',
  neutral: 'border-amber/50 bg-amber/10 text-amber',
};

const typeLabels: { type: PostType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'position', label: 'Position' },
  { type: 'trade', label: 'Trade' },
  { type: 'strategy', label: 'Strategy' },
];

export default function PostComposer({ onPostText, onPostPosition, onPostTrade, onPostStrategy, onCancel }: PostComposerProps) {
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [tradePnl, setTradePnl] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [loading, setLoading] = useState(false);

  const positions = usePortfolioStore((s) => s.positions);
  const { holdings } = useCryptoHoldings();
  const { trades, syncing, syncTrades } = useCachedTrades();
  const strategies = useStrategyStore((s) => s.strategies);

  const selectablePositions = useMemo(() => {
    const fromPortfolio = positions.map((p) => ({
      id: `pos_${p.id}`,
      label: `${p.symbol} - ${p.shares} shares @ $${p.avgCost.toFixed(2)}`,
      symbol: p.symbol,
      shares: p.shares,
      avgCost: p.avgCost,
      source: 'portfolio' as const,
    }));

    const fromWallet = holdings
      .filter((h) => h.usd_value > 0)
      .map((h) => ({
        id: `wallet_${h.id}`,
        label: `${h.asset} - ${(h.free_balance + h.locked_balance).toFixed(6)} @ $${h.price_at_sync.toFixed(2)}`,
        symbol: h.asset,
        shares: h.free_balance + h.locked_balance,
        avgCost: h.price_at_sync,
        source: 'wallet' as const,
      }));

    return [...fromWallet, ...fromPortfolio];
  }, [positions, holdings]);

  const selectableTrades = useMemo(() => {
    return trades.map((t) => {
      const date = new Date(t.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        id: t.id,
        label: `${t.side.toUpperCase()} ${t.base_asset} - ${t.quantity} @ $${Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 6 })} - ${date}`,
        symbol: t.base_asset,
        side: t.side as 'buy' | 'sell',
        qty: t.quantity,
        price: t.price,
        quoteQty: t.quote_qty,
        executedAt: t.executed_at,
      };
    });
  }, [trades]);

  const canSubmit = () => {
    if (loading) return false;
    switch (postType) {
      case 'text':
        return content.trim().length > 0;
      case 'position':
        return selectedPositionId !== '';
      case 'trade':
        return selectedTradeId !== '';
      case 'strategy':
        return selectedStrategyId !== '';
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit()) return;
      setLoading(true);

      switch (postType) {
        case 'text':
          await onPostText({
            content: content.trim(),
            symbol: symbol.trim() || undefined,
            sentiment: sentiment ?? undefined,
          });
          break;
        case 'position': {
          const selected = selectablePositions.find((p) => p.id === selectedPositionId);
          if (selected) {
            await onPostPosition({
              content: content.trim() || undefined,
              symbol: selected.symbol,
              shares: selected.shares,
              avgCost: selected.avgCost,
              sentiment: sentiment ?? undefined,
            });
          }
          break;
        }
        case 'trade': {
          const selected = selectableTrades.find((t) => t.id === selectedTradeId);
          if (selected) {
            await onPostTrade({
              content: content.trim() || undefined,
              symbol: selected.symbol,
              side: selected.side,
              qty: selected.qty,
              price: selected.price,
              quoteQty: selected.quoteQty,
              pnl: tradePnl ? parseFloat(tradePnl) : undefined,
              executedAt: selected.executedAt,
              sentiment: sentiment ?? undefined,
            });
          }
          break;
        }
        case 'strategy':
          await onPostStrategy({
            content: content.trim() || undefined,
            strategyId: selectedStrategyId,
          });
          break;
      }

      setContent('');
      setSymbol('');
      setSentiment(null);
      setSelectedPositionId('');
      setSelectedTradeId('');
      setTradePnl('');
      setSelectedStrategyId('');
      setLoading(false);
      onCancel();
    },
    [postType, content, symbol, sentiment, selectedPositionId, selectedTradeId, tradePnl, selectedStrategyId, selectablePositions, selectableTrades, loading, onPostText, onPostPosition, onPostTrade, onPostStrategy, onCancel]
  );

  return (
    <form onSubmit={handleSubmit} className="px-3 py-3 border-b border-terminal-border bg-white/[0.02]">
      {/* Post type selector */}
      <div className="flex gap-1 mb-2">
        {typeLabels.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setPostType(type)}
            className={`text-xxs font-mono px-2 py-1 rounded border capitalize transition-colors ${
              postType === type
                ? 'border-up/50 bg-up/10 text-up'
                : 'border-terminal-border text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Position selector */}
      {postType === 'position' && (
        <select
          value={selectedPositionId}
          onChange={(e) => setSelectedPositionId(e.target.value)}
          className="w-full bg-terminal-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none mb-2"
        >
          <option value="">Select a position...</option>
          {selectablePositions.some((p) => p.source === 'wallet') && (
            <optgroup label="Wallet Holdings">
              {selectablePositions
                .filter((p) => p.source === 'wallet')
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
            </optgroup>
          )}
          {selectablePositions.some((p) => p.source === 'portfolio') && (
            <optgroup label="Manual Positions">
              {selectablePositions
                .filter((p) => p.source === 'portfolio')
                .map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
            </optgroup>
          )}
        </select>
      )}

      {/* Trade selector */}
      {postType === 'trade' && (
        <>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedTradeId}
              onChange={(e) => setSelectedTradeId(e.target.value)}
              className="flex-1 bg-terminal-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none"
            >
              <option value="">Select a trade...</option>
              {selectableTrades.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={syncTrades}
              disabled={syncing}
              className="text-xxs font-mono px-2 py-1 rounded border border-terminal-border text-text-muted hover:text-text-secondary hover:border-up/40 transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          {selectableTrades.length === 0 && !syncing && (
            <p className="text-xxs font-mono text-text-muted mb-2">
              No trades found. Click Sync to fetch from your exchanges.
            </p>
          )}
          <input
            value={tradePnl}
            onChange={(e) => setTradePnl(e.target.value)}
            placeholder="P&L (optional, e.g. 150.00)"
            type="number"
            step="any"
            className="w-full bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none mb-2"
          />
        </>
      )}

      {/* Strategy selector */}
      {postType === 'strategy' && (
        <select
          value={selectedStrategyId}
          onChange={(e) => setSelectedStrategyId(e.target.value)}
          className="w-full bg-terminal-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none mb-2"
        >
          <option value="">Select a strategy...</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.symbols.join(', ') || 'no symbols'})
            </option>
          ))}
        </select>
      )}

      {/* Symbol + sentiment (text, position, trade) */}
      {postType !== 'strategy' && (
        <div className="flex gap-2 mb-2">
          {postType === 'text' && (
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="$SYM (optional)"
              className="w-24 bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none uppercase"
            />
          )}
          <div className="flex gap-1">
            {sentiments.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSentiment(sentiment === s ? null : s)}
                className={`text-xxs font-mono px-2 py-1 rounded border capitalize transition-colors ${
                  sentiment === s ? sentimentStyles[s] : 'border-terminal-border text-text-muted hover:text-text-secondary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={postType === 'text' ? "What's on your mind?" : 'Add a comment (optional)...'}
        rows={3}
        className="w-full bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none resize-none mb-2"
      />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xxs font-mono text-text-muted hover:text-text-secondary px-3 py-1 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit()}
          className="text-xxs font-mono text-up border border-up/30 hover:bg-up/10 disabled:text-text-muted disabled:border-terminal-border px-3 py-1 rounded transition-colors"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
