'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '@/hooks/useUser';
import { useDmConversations } from '@/hooks/useDmConversations';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import UserSearchInput from '@/components/chat/UserSearchInput';
import OnlineDot from '@/components/chat/OnlineDot';
import type { Profile } from '@/lib/types';

function ConversationList({
  onSelect,
}: {
  onSelect: (peer: Profile) => void;
}) {
  const { conversations, loading } = useDmConversations();
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <UserSearchInput onSelect={onSelect} />
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono px-4 text-center">
            No conversations yet. Search for a user above to start chatting.
          </div>
        ) : (
          conversations.map((conv) => {
            const timeStr = new Date(conv.lastMessage.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <button
                key={conv.peer.id}
                onClick={() => onSelect(conv.peer)}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-terminal-border hover:bg-terminal-hover transition-colors text-left"
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
                    <span className="text-xxs font-mono text-text-muted shrink-0">{timeStr}</span>
                  </div>
                  <p className="text-xxs font-mono text-text-muted truncate mt-0.5">
                    {conv.lastMessage.content}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="text-xxs font-mono bg-up text-terminal-bg rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function ActiveConversation({
  peer,
  onBack,
}: {
  peer: Profile;
  onBack: () => void;
}) {
  const { user } = useUser();
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const resetUnread = useChatStore((s) => s.resetUnread);
  const { messages, loading, sendDm } = useDirectMessages(peer.id);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    resetUnread();
  }, [resetUnread]);

  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border shrink-0">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors text-sm font-mono"
        >
          &larr;
        </button>
        <OnlineDot isOnline={onlineUserIds.has(peer.id)} />
        <span className="text-sm font-mono font-medium" style={{ color: peer.avatar_color }}>
          {peer.display_name}
        </span>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            Start a conversation
          </div>
        ) : (
          messages.map((dm) => {
            const isOwn = dm.sender_id === user?.id;
            const profile = isOwn ? dm.sender : dm.sender;
            return (
              <MessageBubble
                key={dm.id}
                displayName={profile?.display_name ?? 'Unknown'}
                avatarColor={profile?.avatar_color ?? '#888888'}
                content={dm.content}
                timestamp={dm.created_at}
                isOwn={isOwn}
                strategy={dm.strategy}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput onSend={sendDm} placeholder={`Message ${peer.display_name}...`} />
    </div>
  );
}

export default function DirectMessagesPanel() {
  const [activePeer, setActivePeer] = useState<Profile | null>(null);

  if (activePeer) {
    return <ActiveConversation peer={activePeer} onBack={() => setActivePeer(null)} />;
  }

  return <ConversationList onSelect={setActivePeer} />;
}
