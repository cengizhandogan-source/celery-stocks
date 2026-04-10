'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearch } from '@/hooks/useSearch';
import Spinner from './Spinner';

interface SymbolSearchProps {
  onSelect: (symbol: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export default function SymbolSearch({ onSelect, onClose, placeholder = 'Search ticker...' }: SymbolSearchProps) {
  const [query, setQuery] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const { results, loading } = useSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setHighlightIdx(0);
  }, [results]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[highlightIdx]) {
        onSelect(results[highlightIdx].symbol);
      } else if (query.trim()) {
        onSelect(query.trim().toUpperCase());
      }
    }
  }

  return (
    <div ref={containerRef} className="absolute top-full left-0 mt-1 w-64 bg-terminal-panel border border-terminal-border rounded shadow-lg z-50">
      <div className="flex items-center px-2 py-1.5 border-b border-terminal-border">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-data font-mono text-text-primary outline-none placeholder:text-text-muted"
        />
        {loading && <Spinner size="sm" />}
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              onMouseDown={(e) => { e.preventDefault(); onSelect(r.symbol); }}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors ${
                i === highlightIdx ? 'bg-terminal-hover' : ''
              }`}
            >
              <span className="text-data font-mono font-medium text-cyan">{r.symbol}</span>
              <span className="text-xxs font-mono text-text-muted truncate">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
