'use client';

import { useState, useRef, useEffect } from 'react';

interface PortfolioMenuProps {
  portfolioName: string;
  canDelete: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
}

export default function PortfolioMenu({ portfolioName, canDelete, onRename, onDelete }: PortfolioMenuProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'rename' | 'confirmDelete'>('menu');
  const [renameValue, setRenameValue] = useState(portfolioName);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode('menu');
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen(!open);
    setMode('menu');
    setRenameValue(portfolioName);
  }

  function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== portfolioName) {
      onRename(trimmed);
    }
    setOpen(false);
    setMode('menu');
  }

  function handleDelete() {
    onDelete();
    setOpen(false);
    setMode('menu');
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-terminal-hover transition-colors"
        title="Portfolio settings"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[160px] bg-terminal-panel border border-terminal-border-strong rounded-md shadow-lg py-1">
          {mode === 'menu' && (
            <>
              <button
                onClick={() => setMode('rename')}
                className="w-full text-left px-3 py-1.5 text-sm font-mono text-text-secondary hover:text-text-primary hover:bg-terminal-hover transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => setMode('confirmDelete')}
                disabled={!canDelete}
                className="w-full text-left px-3 py-1.5 text-sm font-mono text-text-secondary hover:text-down hover:bg-terminal-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </>
          )}

          {mode === 'rename' && (
            <form onSubmit={handleRenameSubmit} className="px-2 py-1.5">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                maxLength={50}
                className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 font-mono text-sm text-text-primary outline-none focus:border-terminal-border-strong"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setMode('menu'); } }}
              />
              <div className="flex gap-1 justify-end mt-1.5">
                <button type="button" onClick={() => setMode('menu')} className="text-xxs text-text-muted font-mono px-2 py-0.5">
                  Cancel
                </button>
                <button type="submit" className="text-xxs text-up font-mono px-2 py-0.5">
                  Save
                </button>
              </div>
            </form>
          )}

          {mode === 'confirmDelete' && (
            <div className="px-3 py-2">
              <p className="text-xxs text-text-muted font-mono mb-2">Delete this portfolio and all its positions?</p>
              <div className="flex gap-1 justify-end">
                <button onClick={() => setMode('menu')} className="text-xxs text-text-muted font-mono px-2 py-0.5">
                  Cancel
                </button>
                <button onClick={handleDelete} className="text-xxs text-down font-mono px-2 py-0.5">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
