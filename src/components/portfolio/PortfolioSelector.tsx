'use client';

import { useState, useRef, useEffect } from 'react';
import type { Portfolio } from '@/lib/types';

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export default function PortfolioSelector({ portfolios, activeId, onSelect, onCreateNew }: PortfolioSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = portfolios.find((p) => p.id === activeId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-sm font-mono text-text-primary hover:bg-terminal-hover transition-colors"
      >
        <span className="truncate max-w-[140px]">{active?.name ?? 'Portfolio'}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" className="text-text-muted shrink-0">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] bg-terminal-panel border border-terminal-border-strong rounded-md shadow-lg py-1">
          {portfolios.map((p) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors ${
                p.id === activeId
                  ? 'text-up bg-terminal-hover'
                  : 'text-text-secondary hover:text-text-primary hover:bg-terminal-hover'
              }`}
            >
              {p.name}
            </button>
          ))}
          <div className="border-t border-terminal-border my-1" />
          <button
            onClick={() => { onCreateNew(); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-sm font-mono text-text-muted hover:text-up hover:bg-terminal-hover transition-colors"
          >
            + New Portfolio...
          </button>
        </div>
      )}
    </div>
  );
}
