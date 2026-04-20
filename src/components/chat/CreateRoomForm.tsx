'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';

interface CreateRoomFormProps {
  onCreated: () => void;
}

export default function CreateRoomForm({ onCreated }: CreateRoomFormProps) {
  const { user } = useUser();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim() || !user) return;

      setLoading(true);
      const supabase = createClient();
      const { error } = await supabase.from('chatrooms').insert({
        name: name.trim(),
        symbol: symbol.trim().toUpperCase() || null,
        description: null,
        created_by: user.id,
      });

      if (!error) {
        setName('');
        setSymbol('');
        onCreated();
      }
      setLoading(false);
    },
    [name, symbol, user, onCreated]
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t border-border">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Room name"
        className="flex-1 bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
      />
      <input
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="$SYM"
        className="w-16 bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none uppercase"
      />
      <button
        type="submit"
        disabled={!name.trim() || loading}
        className="text-xs font-mono text-profit hover:text-profit/80 disabled:text-text-muted transition-colors px-2"
      >
        {loading ? '...' : '+'}
      </button>
    </form>
  );
}
