'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/hooks/useUser';
import { useChatroomList } from '@/hooks/useChatroomList';
import { useChatroom } from '@/hooks/useChatroom';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import CreateRoomForm from '@/components/chat/CreateRoomForm';
import OnlineDot from '@/components/chat/OnlineDot';
import TickerLogo from '@/components/ui/TickerLogo';
import type { Chatroom } from '@/lib/types';

function RoomList({
  chatrooms,
  joinedRoomIds,
  onSelect,
  onJoin,
  onLeave,
  onRefresh,
}: {
  chatrooms: Chatroom[];
  joinedRoomIds: Set<string>;
  onSelect: (room: Chatroom) => void;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto" data-scrollable>
        {chatrooms.map((room) => {
          const joined = joinedRoomIds.has(room.id);
          return (
            <div
              key={room.id}
              className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border hover:bg-terminal-hover transition-colors"
            >
              <button
                onClick={() => onSelect(room)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-text-primary truncate">{room.name}</span>
                  {room.symbol && (
                    <TickerLogo symbol={room.symbol} size={16} />
                  )}
                  {room.is_default && (
                    <span className="text-xxs font-mono text-text-muted">default</span>
                  )}
                </div>
                {room.description && (
                  <p className="text-xxs font-mono text-text-muted truncate mt-0.5">{room.description}</p>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  joined ? onLeave(room.id) : onJoin(room.id);
                }}
                className={`text-xxs font-mono px-2 py-1 rounded border transition-colors shrink-0 ${
                  joined
                    ? 'text-text-muted border-terminal-border hover:text-down hover:border-down/30'
                    : 'text-up border-up/30 hover:bg-up/10'
                }`}
              >
                {joined ? 'Leave' : 'Join'}
              </button>
            </div>
          );
        })}
      </div>
      <CreateRoomForm onCreated={onRefresh} />
    </div>
  );
}

function ActiveRoom({
  room,
  onBack,
}: {
  room: Chatroom;
  onBack: () => void;
}) {
  const { user } = useUser();
  const { messages, loading, hasMore, sendMessage, loadOlderMessages } = useChatroom(room.id);
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Detect scroll position
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-terminal-border shrink-0">
        <button
          onClick={onBack}
          className="text-text-muted hover:text-text-primary transition-colors text-sm font-mono"
        >
          &larr;
        </button>
        <span className="text-sm font-mono text-text-primary font-medium">{room.name}</span>
        {room.symbol && (
          <TickerLogo symbol={room.symbol} size={16} />
        )}
        <span className="text-xxs font-mono text-text-muted ml-auto">
          {onlineUserIds.size} online
        </span>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {hasMore && (
          <button
            onClick={loadOlderMessages}
            className="w-full text-xxs font-mono text-text-muted hover:text-text-secondary py-2 transition-colors"
          >
            Load older messages
          </button>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
            No messages yet. Say something!
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              displayName={msg.profile?.display_name ?? 'Unknown'}
              avatarColor={msg.profile?.avatar_color ?? '#888888'}
              avatarUrl={msg.profile?.avatar_url}
              content={msg.content}
              timestamp={msg.created_at}
              isOwn={msg.user_id === user?.id}
              isVerified={msg.profile?.is_verified ?? false}
              netWorth={msg.profile?.crypto_net_worth}
              showNetWorth={msg.profile?.show_net_worth}
              strategy={msg.strategy}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={sendMessage} placeholder={`Message #${room.name}...`} />
    </div>
  );
}

export default function ChatroomPanel({ chatroomId }: { chatroomId?: string }) {
  const { chatrooms, joinedRoomIds, loading, joinRoom, leaveRoom, refresh } = useChatroomList();
  const [selectedRoom, setSelectedRoom] = useState<Chatroom | null>(null);

  // If opened with a specific chatroomId, auto-select it
  useEffect(() => {
    if (chatroomId && chatrooms.length > 0 && !selectedRoom) {
      const room = chatrooms.find((r) => r.id === chatroomId);
      if (room) setSelectedRoom(room);
    }
  }, [chatroomId, chatrooms, selectedRoom]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading rooms...
      </div>
    );
  }

  if (selectedRoom) {
    return <ActiveRoom room={selectedRoom} onBack={() => setSelectedRoom(null)} />;
  }

  return (
    <RoomList
      chatrooms={chatrooms}
      joinedRoomIds={joinedRoomIds}
      onSelect={setSelectedRoom}
      onJoin={joinRoom}
      onLeave={leaveRoom}
      onRefresh={refresh}
    />
  );
}
