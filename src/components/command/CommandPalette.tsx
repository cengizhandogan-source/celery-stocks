'use client';

import { useEffect, useState } from 'react';
import { SearchResult } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';

interface CommandPaletteProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onSelect: (symbol: string) => void;
}

export default function CommandPalette({ results, loading, query, onSelect }: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        onSelect(results[selectedIndex].symbol);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedIndex, onSelect]);

  const typeLabel = (type: string) => {
    if (type === 'EQUITY') return 'EQ';
    if (type === 'ETF') return 'ETF';
    if (type === 'INDEX') return 'IDX';
    return type.substring(0, 3).toUpperCase();
  };

  return (
    <div className="absolute top-full left-0 right-0 max-h-96 overflow-y-auto bg-terminal-panel border border-terminal-border-strong border-t-0 shadow-2xl z-50">
      {!query.trim() && (
        <div className="px-4 py-6 text-sm text-text-muted text-center font-mono">
          Type to search...
        </div>
      )}
      {query.trim() && loading && (
        <div className="flex items-center justify-center gap-2 px-4 py-6">
          <Spinner size="sm" />
          <span className="text-sm text-text-muted font-mono">Searching...</span>
        </div>
      )}
      {query.trim() && !loading && results.length === 0 && (
        <div className="px-4 py-6 text-sm text-text-muted text-center font-mono">
          No results found
        </div>
      )}
      {results.map((result, i) => (
        <button
          key={result.symbol}
          onClick={() => onSelect(result.symbol)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            i === selectedIndex ? 'bg-terminal-hover' : 'hover:bg-terminal-hover'
          }`}
        >
          <Badge text={typeLabel(result.type)} variant="amber" />
          <span className="font-mono text-sm text-text-primary font-medium">{result.symbol}</span>
          <span className="text-xs text-text-muted truncate">{result.name}</span>
          <span className="ml-auto text-xxs text-text-muted">{result.exchange}</span>
        </button>
      ))}
    </div>
  );
}
