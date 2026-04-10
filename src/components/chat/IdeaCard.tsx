import { useMemo } from 'react';
import { SENTIMENT_COLORS, SENTIMENT_BG } from '@/stores/chatStore';
import type { Idea } from '@/lib/types';

export default function IdeaCard({ idea }: { idea: Idea }) {
  const timeStr = useMemo(() => {
    const d = new Date(idea.created_at);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);

    if (diffH < 1) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [idea.created_at]);

  return (
    <div className="px-3 py-3 border-b border-terminal-border hover:bg-terminal-hover transition-colors">
      {/* Top row: symbol + sentiment */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xxs font-mono text-cyan px-1.5 py-0.5 bg-cyan/10 rounded">
          ${idea.symbol}
        </span>
        <span
          className={`text-xxs font-mono px-1.5 py-0.5 rounded capitalize ${SENTIMENT_COLORS[idea.sentiment]} ${SENTIMENT_BG[idea.sentiment]}`}
        >
          {idea.sentiment}
        </span>
        <span className="text-xxs font-mono text-text-muted ml-auto">{timeStr}</span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-mono text-text-primary font-medium mb-1">
        {idea.title}
      </h4>

      {/* Content */}
      <p className="text-xs font-mono text-text-secondary leading-relaxed whitespace-pre-wrap">
        {idea.content}
      </p>

      {/* Author */}
      <div className="flex items-center gap-1.5 mt-2">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: idea.profile?.avatar_color ?? '#888888' }}
        />
        <span className="text-xxs font-mono text-text-muted">
          {idea.profile?.display_name ?? 'Unknown'}
        </span>
      </div>
    </div>
  );
}
