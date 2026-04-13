'use client';

import Link from 'next/link';
import { useDmConversations } from '@/hooks/useDmConversations';
import { useChatStore } from '@/stores/chatStore';
import UserSearchInput from '@/components/chat/UserSearchInput';
import OnlineDot from '@/components/chat/OnlineDot';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import type { Profile } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function MessagesPage() {
  const { conversations, loading } = useDmConversations();
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const router = useRouter();

  const handleSelectUser = (peer: Profile) => {
    router.push(`/social/messages/${peer.id}`);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-terminal-bg/80 backdrop-blur-sm border-b border-terminal-border">
        <div className="px-4 py-3">
          <h1 className="text-sm font-mono font-bold text-text-primary uppercase tracking-wider">Messages</h1>
        </div>
        <div className="px-4 py-2 border-t border-terminal-border">
          <UserSearchInput onSelect={handleSelectUser} />
        </div>
      </div>

      {/* Conversations */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
          Loading...
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono px-4 text-center">
          No conversations yet. Search for a user above to start chatting.
        </div>
      ) : (
        conversations.map((conv) => {
          const timeStr = new Date(conv.lastMessage.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <Link
              key={conv.peer.id}
              href={`/social/messages/${conv.peer.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-terminal-border hover:bg-terminal-hover transition-colors"
            >
              <OnlineDot isOnline={onlineUserIds.has(conv.peer.id)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-sm font-mono font-medium truncate"
                    style={{ color: conv.peer.avatar_color }}
                  >
                    {conv.peer.display_name}
                  </span>
                  {conv.peer.is_verified && <VerifiedBadge size={12} />}
                  <span className="text-xxs font-mono text-text-muted shrink-0">{timeStr}</span>
                </div>
                <p className="text-xxs font-mono text-text-muted truncate mt-0.5">
                  {conv.lastMessage.content}
                </p>
              </div>
              {conv.unreadCount > 0 && (
                <span className="text-xxs font-mono bg-up text-terminal-bg rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                  {conv.unreadCount}
                </span>
              )}
            </Link>
          );
        })
      )}
    </div>
  );
}
