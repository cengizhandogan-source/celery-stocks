'use client';

import { useState, useCallback, useMemo } from 'react';
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useCachedTrades } from '@/hooks/useCachedTrades';
import type { PostType } from '@/lib/types';

interface PostComposerProps {
  onPostText: (data: { content: string; symbol?: string }) => Promise<void>;
  onPostPosition: (data: { content?: string; symbol: string; shares: number; avgCost: number }) => Promise<void>;
  onPostTrade: (data: {
    content?: string;
    symbol: string;
    side: 'buy' | 'sell';
    qty: number;
    price: number;
    quoteQty: number;
    pnl?: number;
    executedAt: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const typeLabels: { type: PostType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'position', label: 'Position' },
  { type: 'trade', label: 'Trade' },
];

export default function PostComposer({ onPostText, onPostPosition, onPostTrade, onCancel }: PostComposerProps) {
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [selectedTradeId, setSelectedTradeId] = useState('');
  const [loading, setLoading] = useState(false);

  const { holdings } = useCryptoHoldings();
  const { trades, syncing, syncTrades } = useCachedTrades();

  const selectablePositions = useMemo(() => {
    return holdings
      .filter((h) => h.usd_value > 0)
      .map((h) => ({
        id: `wallet_${h.id}`,
        label: `${h.asset} - ${(h.free_balance + h.locked_balance).toFixed(6)} @ $${h.price_at_sync.toFixed(2)}`,
        symbol: h.asset,
        shares: h.free_balance + h.locked_balance,
        avgCost: h.price_at_sync,
      }));
  }, [holdings]);

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
              executedAt: selected.executedAt,
            });
          }
          break;
        }
      }

      setContent('');
      setSymbol('');
      setSelectedPositionId('');
      setSelectedTradeId('');
      setLoading(false);
      onCancel();
    },
    [postType, content, symbol, selectedPositionId, selectedTradeId, selectablePositions, selectableTrades, loading, onPostText, onPostPosition, onPostTrade, onCancel]
  );

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 border-b border-border bg-surface/40">
      {/* Post type selector */}
      <div className="flex gap-1 mb-3">
        {typeLabels.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setPostType(type)}
            className={`text-xs font-sans px-3 py-1 rounded-full border capitalize transition-all duration-150 ease-[var(--ease-snap)] ${
              postType === type
                ? 'border-gold/50 bg-gold/10 text-gold'
                : 'border-border text-text-muted hover:text-text-primary hover:border-border-strong'
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
          className="w-full bg-input text-xs font-sans text-text-primary px-2.5 py-2 rounded-md border border-border focus:border-gold/40 focus:outline-none mb-2 transition-colors"
        >
          <option value="">Select a position...</option>
          {selectablePositions.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      )}

      {/* Trade selector */}
      {postType === 'trade' && (
        <>
          <div className="flex gap-2 mb-2">
            <select
              value={selectedTradeId}
              onChange={(e) => setSelectedTradeId(e.target.value)}
              className="flex-1 bg-input text-xs font-sans text-text-primary px-2.5 py-2 rounded-md border border-border focus:border-gold/40 focus:outline-none transition-colors"
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
              className="text-xs font-sans px-3 py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:border-gold/40 transition-all duration-150 ease-[var(--ease-snap)] disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          {selectableTrades.length === 0 && !syncing && (
            <p className="text-xs font-sans text-text-muted mb-2">
              No trades found. Click Sync to fetch from your exchanges.
            </p>
          )}
        </>
      )}

      {postType === 'text' && (
        <div className="mb-2">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="$SYM (optional)"
            className="w-28 bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2.5 py-2 rounded-md border border-border focus:border-gold/40 focus:outline-none uppercase transition-colors"
          />
        </div>
      )}

      {/* Content textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={postType === 'text' ? "What's on your mind?" : 'Add a comment (optional)...'}
        rows={3}
        className="w-full bg-input text-sm font-sans text-text-primary placeholder:text-text-muted px-3 py-2 rounded-md border border-border focus:border-gold/40 focus:outline-none resize-none mb-3 transition-colors"
      />

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-sans text-text-muted hover:text-text-primary px-3 py-1.5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit()}
          className="text-xs font-sans font-semibold bg-gold text-base hover:bg-gold-bright hover:glow-gold disabled:bg-border disabled:text-text-muted disabled:hover:shadow-none px-4 py-1.5 rounded-md transition-all duration-150 ease-[var(--ease-snap)]"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
