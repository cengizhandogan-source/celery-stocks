'use client';

import { useState, useCallback } from 'react';
import type { Sentiment } from '@/lib/types';

interface IdeaFormProps {
  onSubmit: (data: { symbol: string; title: string; content: string; sentiment: Sentiment }) => void;
  onCancel: () => void;
  defaultSymbol?: string;
}

const sentiments: Sentiment[] = ['bullish', 'bearish', 'neutral'];

const sentimentStyles: Record<Sentiment, string> = {
  bullish: 'border-up/50 bg-up/10 text-up',
  bearish: 'border-down/50 bg-down/10 text-down',
  neutral: 'border-amber/50 bg-amber/10 text-amber',
};

export default function IdeaForm({ onSubmit, onCancel, defaultSymbol }: IdeaFormProps) {
  const [symbol, setSymbol] = useState(defaultSymbol ?? '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>('bullish');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!symbol.trim() || !title.trim() || !content.trim()) return;
      setLoading(true);
      await onSubmit({ symbol: symbol.trim(), title: title.trim(), content: content.trim(), sentiment });
      setSymbol(defaultSymbol ?? '');
      setTitle('');
      setContent('');
      setSentiment('bullish');
      setLoading(false);
      onCancel();
    },
    [symbol, title, content, sentiment, onSubmit, onCancel, defaultSymbol]
  );

  return (
    <form onSubmit={handleSubmit} className="px-3 py-3 border-b border-terminal-border bg-white/[0.02]">
      <div className="flex gap-2 mb-2">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Symbol"
          className="w-20 bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none uppercase"
        />
        <div className="flex gap-1">
          {sentiments.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSentiment(s)}
              className={`text-xxs font-mono px-2 py-1 rounded border capitalize transition-colors ${
                sentiment === s ? sentimentStyles[s] : 'border-terminal-border text-text-muted hover:text-text-secondary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Idea title"
        className="w-full bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none mb-2"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your analysis..."
        rows={3}
        className="w-full bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none resize-none mb-2"
      />
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
          disabled={!symbol.trim() || !title.trim() || !content.trim() || loading}
          className="text-xxs font-mono text-up border border-up/30 hover:bg-up/10 disabled:text-text-muted disabled:border-terminal-border px-3 py-1 rounded transition-colors"
        >
          {loading ? 'Posting...' : 'Post Idea'}
        </button>
      </div>
    </form>
  );
}
