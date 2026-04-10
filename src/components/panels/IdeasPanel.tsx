'use client';

import { useState } from 'react';
import { useIdeas } from '@/hooks/useIdeas';
import IdeaCard from '@/components/chat/IdeaCard';
import IdeaForm from '@/components/chat/IdeaForm';

export default function IdeasPanel({ symbol }: { symbol?: string }) {
  const { ideas, loading, postIdea } = useIdeas(symbol);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState(symbol ?? '');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading ideas...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border shrink-0">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by $SYM..."
          className="flex-1 bg-terminal-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-1 rounded border border-terminal-border focus:border-up/40 focus:outline-none uppercase"
        />
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`text-xxs font-mono px-2 py-1 rounded border transition-colors ${
            showForm
              ? 'text-down border-down/30'
              : 'text-up border-up/30 hover:bg-up/10'
          }`}
        >
          {showForm ? 'Cancel' : '+ Post Idea'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <IdeaForm
          onSubmit={postIdea}
          onCancel={() => setShowForm(false)}
          defaultSymbol={filter || symbol}
        />
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {ideas.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            No ideas yet. Be the first to share!
          </div>
        ) : (
          ideas
            .filter((idea) => !filter || idea.symbol === filter.toUpperCase())
            .map((idea) => <IdeaCard key={idea.id} idea={idea} />)
        )}
      </div>
    </div>
  );
}
