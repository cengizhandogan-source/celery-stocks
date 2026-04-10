'use client';

import { useEffect, useState } from 'react';
import { SearchResult, WindowType } from '@/lib/types';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { getShortcutForType, getShortcutLabel } from '@/lib/shortcuts';

interface CommandEntry {
  cmd: string;
  type: WindowType;
  label: string;
  needsSymbol: boolean;
}

interface CommandPaletteProps {
  results: SearchResult[];
  loading: boolean;
  query: string;
  onSelect: (symbol: string) => void;
  commands?: CommandEntry[];
  onCommandSelect?: (type: WindowType) => void;
}

export default function CommandPalette({
  results, loading, query, onSelect, commands, onCommandSelect,
}: CommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isCommandMode = commands && commands.length > 0;
  const itemCount = isCommandMode ? commands.length : results.length;

  useEffect(() => {
    setSelectedIndex(0);
  }, [results, commands]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, itemCount - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && itemCount > 0) {
        e.preventDefault();
        if (isCommandMode && onCommandSelect) {
          onCommandSelect(commands[selectedIndex].type);
        } else if (results.length > 0) {
          onSelect(results[selectedIndex].symbol);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, commands, selectedIndex, onSelect, onCommandSelect, isCommandMode, itemCount]);

  const typeLabel = (type: string) => {
    if (type === 'EQUITY') return 'EQ';
    if (type === 'ETF') return 'ETF';
    if (type === 'INDEX') return 'IDX';
    if (type === 'CRYPTOCURRENCY') return 'CRYPTO';
    return type.substring(0, 3).toUpperCase();
  };

  return (
    <div className="absolute top-full left-0 right-0 max-h-96 overflow-y-auto bg-terminal-panel border border-terminal-border-strong border-t-0 shadow-2xl z-50">
      {isCommandMode ? (
        <>
          {commands.map((c, i) => (
            <button
              key={c.cmd}
              onClick={() => onCommandSelect?.(c.type)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                i === selectedIndex ? 'bg-terminal-hover' : 'hover:bg-terminal-hover'
              }`}
            >
              <Badge text="CMD" variant="cyan" />
              <span className="font-mono text-sm text-cyan font-medium">{c.cmd}</span>
              <span className="text-xs text-text-muted flex-1">{c.label}</span>
              {c.needsSymbol && (
                <span className="text-xxs text-text-muted font-mono">+ SYMBOL</span>
              )}
              {getShortcutForType(c.type) && (
                <span className="ml-auto text-xxs text-text-muted font-mono opacity-60">
                  {getShortcutLabel(getShortcutForType(c.type)!)}
                </span>
              )}
            </button>
          ))}
        </>
      ) : (
        <>
          {!query.trim() && (
            <div className="px-4 py-6 text-sm text-text-muted text-center font-mono">
              Type to search or / for commands...
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
              <Badge text={typeLabel(result.type)} variant={result.type === 'CRYPTOCURRENCY' ? 'cyan' : 'amber'} />
              <span className="font-mono text-sm text-text-primary font-medium">{result.symbol}</span>
              <span className="text-xs text-text-muted truncate">{result.name}</span>
              <span className="ml-auto text-xxs text-text-muted">{result.exchange}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
