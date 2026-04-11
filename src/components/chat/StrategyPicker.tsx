'use client';

import { useState, useEffect, useRef } from 'react';
import { useStrategyStore } from '@/stores/strategyStore';
import type { Strategy } from '@/lib/types';

interface StrategyPickerProps {
  onSelect: (strategy: Strategy) => void;
  onClose: () => void;
}

export default function StrategyPicker({ onSelect, onClose }: StrategyPickerProps) {
  const strategies = useStrategyStore((s) => s.strategies);
  const initialize = useStrategyStore((s) => s.initialize);
  const [search, setSearch] = useState('');
  const [initialized, setInitialized] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialized) {
      initialize().then(() => setInitialized(true));
    }
  }, [initialize, initialized]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = search
    ? strategies.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.symbols.some(sym => sym.toLowerCase().includes(search.toLowerCase()))
      )
    : strategies;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-1 w-64 max-h-48 bg-terminal-bg border border-terminal-border rounded-md shadow-lg overflow-hidden z-50"
    >
      <div className="px-2 py-1.5 border-b border-terminal-border">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search strategies..."
          className="w-full bg-terminal-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-1 rounded border border-terminal-border focus:border-up/40 focus:outline-none"
          autoFocus
        />
      </div>
      <div className="overflow-y-auto max-h-32" data-scrollable>
        {filtered.length === 0 ? (
          <div className="px-2 py-3 text-xxs font-mono text-text-muted text-center">
            {strategies.length === 0 ? 'No strategies. Create one first.' : 'No matches.'}
          </div>
        ) : (
          filtered.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full text-left px-2 py-1.5 hover:bg-terminal-hover transition-colors"
            >
              <div className="text-xs font-mono text-text-primary truncate">{s.name}</div>
              {s.symbols.length > 0 && (
                <div className="text-xxs font-mono text-text-muted truncate">{s.symbols.join(', ')}</div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
