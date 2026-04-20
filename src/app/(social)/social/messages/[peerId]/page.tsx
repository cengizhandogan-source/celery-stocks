'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useChatStore } from '@/stores/chatStore';
import MessageBubble from '@/components/chat/MessageBubble';
import MessageInput from '@/components/chat/MessageInput';
import OnlineDot from '@/components/chat/OnlineDot';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import UserAvatar from '@/components/ui/UserAvatar';
import { createClient } from '@/utils/supabase/client';
import type { Profile } from '@/lib/types';

export default function ConversationPage() {
  const { peerId } = useParams<{ peerId: string }>();
  const router = useRouter();
  const { user } = useUser();
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const resetUnread = useChatStore((s) => s.resetUnread);
  const { messages, loading, sendDm } = useDirectMessages(peerId);
  const [peer, setPeer] = useState<Profile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Fetch peer profile
  useEffect(() => {
    if (!peerId) return;
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_color, avatar_url, is_verified')
      .eq('id', peerId)
      .single()
      .then(({ data }) => {
        if (data) setPeer(data);
      });
  }, [peerId]);

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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 sticky top-0 bg-base/80 backdrop-blur-sm z-10">
        <button
          onClick={() => router.push('/social/messages')}
          className="text-text-muted hover:text-text-primary transition-colors text-sm font-mono"
        >
          &larr;
        </button>
        {peer && (
          <>
            <UserAvatar avatarUrl={peer.avatar_url} size="md" />
            <OnlineDot isOnline={onlineUserIds.has(peer.id)} />
            <span className="text-lg font-mono font-medium text-text-primary">
              {peer.display_name}
            </span>
            {peer.is_verified && <VerifiedBadge size={14} />}
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm font-mono">
            Start a conversation
          </div>
        ) : (
          messages.map((dm) => {
            const isOwn = dm.sender_id === user?.id;
            return (
              <MessageBubble
                key={dm.id}
                displayName={dm.sender?.display_name ?? 'Unknown'}
                avatarColor={dm.sender?.avatar_color ?? '#A1A1AA'}
                avatarUrl={dm.sender?.avatar_url}
                content={dm.content}
                timestamp={dm.created_at}
                isOwn={isOwn}
                isVerified={dm.sender?.is_verified ?? false}
                netWorth={dm.sender?.crypto_net_worth}
                showNetWorth={dm.sender?.show_net_worth}
                post={dm.post}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border shrink-0">
        <MessageInput onSend={sendDm} placeholder={peer ? `Message ${peer.display_name}...` : 'Message...'} />
      </div>
    </div>
  );
}
