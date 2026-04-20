'use client';

import { useState, useCallback, useMemo } from 'react';
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useCachedTrades } from '@/hooks/useCachedTrades';
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
  onCancel: () => void;
}

const sentiments: Sentiment[] = ['bullish', 'bearish', 'neutral'];
const sentimentStyles: Record<Sentiment, string> = {
  bullish: 'border-profit/50 bg-profit/10 text-profit',
  bearish: 'border-loss/50 bg-loss/10 text-loss',
  neutral: 'border-gold/50 bg-gold/10 text-gold',
};

const typeLabels: { type: PostType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'position', label: 'Position' },
  { type: 'trade', label: 'Trade' },
];

export default function PostComposer({ onPostText, onPostPosition, onPostTrade, onCancel }: PostComposerProps) {
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
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
              executedAt: selected.executedAt,
              sentiment: sentiment ?? undefined,
            });
          }
          break;
        }
      }

      setContent('');
      setSymbol('');
      setSentiment(null);
      setSelectedPositionId('');
      setSelectedTradeId('');
      setLoading(false);
      onCancel();
    },
    [postType, content, symbol, sentiment, selectedPositionId, selectedTradeId, selectablePositions, selectableTrades, loading, onPostText, onPostPosition, onPostTrade, onCancel]
  );

  return (
    <form onSubmit={handleSubmit} className="px-3 py-3 border-b border-border bg-white/[0.02]">
      {/* Post type selector */}
      <div className="flex gap-1 mb-2">
        {typeLabels.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setPostType(type)}
            className={`text-xxs font-mono px-2 py-1 rounded border capitalize transition-colors ${
              postType === type
                ? 'border-profit/50 bg-profit/10 text-profit'
                : 'border-border text-text-muted hover:text-text-secondary'
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
          className="w-full bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none mb-2"
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
              className="flex-1 bg-input text-xs font-mono text-text-primary px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
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
              className="text-xxs font-mono px-2 py-1 rounded border border-border text-text-muted hover:text-text-secondary hover:border-profit/40 transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
          {selectableTrades.length === 0 && !syncing && (
            <p className="text-xxs font-mono text-text-muted mb-2">
              No trades found. Click Sync to fetch from your exchanges.
            </p>
          )}
        </>
      )}

      {/* Symbol + sentiment */}
      <div className="flex gap-2 mb-2">
        {postType === 'text' && (
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="$SYM (optional)"
            className="w-24 bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none uppercase"
          />
        )}
        <div className="flex gap-1">
          {sentiments.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSentiment(sentiment === s ? null : s)}
              className={`text-xxs font-mono px-2 py-1 rounded border capitalize transition-colors ${
                sentiment === s ? sentimentStyles[s] : 'border-border text-text-muted hover:text-text-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={postType === 'text' ? "What's on your mind?" : 'Add a comment (optional)...'}
        rows={3}
        className="w-full bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none resize-none mb-2"
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
          className="text-xxs font-mono text-profit border border-profit/30 hover:bg-profit/10 disabled:text-text-muted disabled:border-border px-3 py-1 rounded transition-colors"
        >
          {loading ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
}
