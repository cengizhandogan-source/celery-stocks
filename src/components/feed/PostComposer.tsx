'use client';

import { useState, useCallback } from 'react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { useStrategyStore } from '@/stores/strategyStore';
import type { Sentiment, PostType } from '@/lib/types';

interface PostComposerProps {
  onPostText: (data: { content: string; symbol?: string; sentiment?: Sentiment }) => Promise<void>;
  onPostPosition: (data: { content?: string; symbol: string; shares: number; avgCost: number; sentiment?: Sentiment }) => Promise<void>;
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
  { type: 'strategy', label: 'Strategy' },
];

export default function PostComposer({ onPostText, onPostPosition, onPostStrategy, onCancel }: PostComposerProps) {
  const [postType, setPostType] = useState<PostType>('text');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [selectedPositionId, setSelectedPositionId] = useState('');
  const [selectedStrategyId, setSelectedStrategyId] = useState('');
  const [loading, setLoading] = useState(false);

  const positions = usePortfolioStore((s) => s.positions);
  const strategies = useStrategyStore((s) => s.strategies);

  const canSubmit = () => {
    if (loading) return false;
    switch (postType) {
      case 'text':
        return content.trim().length > 0;
      case 'position':
        return selectedPositionId !== '';
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
          const pos = positions.find((p) => p.id === selectedPositionId);
          if (pos) {
            await onPostPosition({
              content: content.trim() || undefined,
              symbol: pos.symbol,
              shares: pos.shares,
              avgCost: pos.avgCost,
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
      setSelectedStrategyId('');
      setLoading(false);
      onCancel();
    },
    [postType, content, symbol, sentiment, selectedPositionId, selectedStrategyId, positions, loading, onPostText, onPostPosition, onPostStrategy, onCancel]
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
          {positions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.symbol} - {p.shares} shares @ ${p.avgCost.toFixed(2)}
            </option>
          ))}
        </select>
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

      {/* Symbol + sentiment (text & position only) */}
      {postType !== 'strategy' && (
        <div className="flex gap-2 mb-2">
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="$SYM (optional)"
            className="w-24 bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none uppercase"
          />
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
