'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useSearch } from '@/hooks/useSearch';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import CommandPalette from './CommandPalette';

export default function CommandBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const { commandQuery, setCommandQuery, setActiveSymbol } = useAppStore();
  const addWindow = useLayoutStore((s) => s.addWindow);
  const { results, loading } = useSearch(commandQuery);

  useKeyboardShortcut('k', () => {
    if (inputRef.current) {
      inputRef.current.focus();
      setFocused(true);
    }
  }, [], { meta: true });

  function handleSelect(symbol: string) {
    setActiveSymbol(symbol);
    addWindow('chart', symbol);
    setCommandQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setCommandQuery('');
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative flex-1">
      <div className="flex items-center h-10 bg-terminal-input border-b border-terminal-border px-3 gap-2">
        <img src="/celery-logo.png" alt="Celery" width={20} height={20} className="shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={commandQuery}
          onChange={(e) => setCommandQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search tickers... (\u2318K)"
          className="flex-1 bg-transparent text-text-primary font-mono text-sm outline-none placeholder:text-text-muted"
        />
      </div>
      {focused && (commandQuery || results.length > 0) && (
        <CommandPalette
          results={results}
          loading={loading}
          query={commandQuery}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
