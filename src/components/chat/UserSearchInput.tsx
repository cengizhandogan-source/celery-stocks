'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUser } from '@/hooks/useUser';
import OnlineDot from '@/components/chat/OnlineDot';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { useChatStore } from '@/stores/chatStore';
import type { Profile } from '@/lib/types';

interface UserSearchInputProps {
  onSelect: (profile: Profile) => void;
}

export default function UserSearchInput({ onSelect }: UserSearchInputProps) {
  const { user } = useUser();
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2 || !user) {
        setResults([]);
        return;
      }
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_color, avatar_url, is_verified')
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(10);

      if (data) setResults(data);
    },
    [user]
  );

  const handleChange = useCallback(
    (val: string) => {
      setQuery(val);
      setOpen(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => search(val), 300);
    },
    [search]
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative px-3 py-2 border-b border-border">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search users..."
        className="w-full bg-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-1.5 rounded border border-border focus:border-profit/40 focus:outline-none"
      />
      {open && results.length > 0 && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-surface border border-border-strong rounded shadow-2xl z-50 max-h-48 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p);
                setQuery('');
                setResults([]);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-hover transition-colors"
            >
              <UserAvatar avatarUrl={p.avatar_url} size="sm" />
              <OnlineDot isOnline={onlineUserIds.has(p.id)} />
              <span className="text-xs font-mono text-text-primary">
                @{p.username}
              </span>
              {p.is_verified && <VerifiedBadge size={10} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
