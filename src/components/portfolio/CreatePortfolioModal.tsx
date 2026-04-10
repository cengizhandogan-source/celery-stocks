'use client';

import { useState } from 'react';

interface CreatePortfolioModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
  existingNames: string[];
}

export default function CreatePortfolioModal({ onClose, onCreate, existingNames }: CreatePortfolioModalProps) {
  const [name, setName] = useState('');
  const trimmed = name.trim();
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());
  const isValid = trimmed.length > 0 && trimmed.length <= 50 && !isDuplicate;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isValid) onCreate(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        className="bg-terminal-panel border border-terminal-border-strong rounded-md p-4 w-72 flex flex-col gap-3"
      >
        <div className="text-sm font-mono text-text-primary">New Portfolio</div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Portfolio name"
          maxLength={50}
          className="bg-terminal-bg border border-terminal-border rounded px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-terminal-border-strong"
          autoFocus
        />
        {isDuplicate && (
          <span className="text-xxs text-down font-mono">Name already exists</span>
        )}
        <div className="flex gap-2 justify-end mt-1">
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-secondary text-sm font-mono px-3 py-1.5 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="bg-up text-black font-mono text-sm px-4 py-1.5 rounded hover:bg-up/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
