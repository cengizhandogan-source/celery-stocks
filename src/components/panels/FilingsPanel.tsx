'use client';

import { useFilings } from '@/hooks/useFilings';
import { timeAgo } from '@/lib/formatters';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

function filingBadgeVariant(type: string): 'cyan' | 'amber' | 'default' {
  if (type.includes('10-K')) return 'cyan';
  if (type.includes('10-Q')) return 'amber';
  return 'default';
}

export default function FilingsPanel({ symbol }: { symbol: string }) {
  const { filings, loading } = useFilings(symbol);

  if (loading && filings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
      </div>
    );
  }

  if (filings.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        No filings available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto" data-scrollable>
      {filings.map((f, i) => (
        <button
          key={`${f.type}-${f.date}-${i}`}
          onClick={() => window.open(f.edgarUrl, '_blank')}
          className="block text-left px-3 py-2.5 border-b border-terminal-border hover:bg-terminal-hover cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <Badge text={f.type} variant={filingBadgeVariant(f.type)} />
            <span className="text-xxs text-text-muted font-mono">{f.date}</span>
          </div>
          <div className="text-sm text-text-primary font-medium leading-tight line-clamp-2">
            {f.title || f.type}
          </div>
          <div className="mt-1 text-xxs text-text-muted font-mono">
            {timeAgo(f.date)}
          </div>
        </button>
      ))}
    </div>
  );
}
