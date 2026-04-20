import { useMemo } from 'react';
import type { Post } from '@/lib/types';
import PostChip from '@/components/feed/PostChip';
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import NetWorthBadge from '@/components/ui/NetWorthBadge';
import UserAvatar from '@/components/ui/UserAvatar';

interface MessageBubbleProps {
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
  content: string | null;
  timestamp: string;
  isOwn: boolean;
  isVerified?: boolean;
  netWorth?: number | null;
  showNetWorth?: boolean;
  post?: Post | null;
}

export default function MessageBubble({ displayName, avatarColor, avatarUrl, content, timestamp, isOwn, isVerified, netWorth, showNetWorth, post }: MessageBubbleProps) {
  const timeStr = useMemo(() => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [timestamp]);

  return (
    <div className={`group flex gap-2 px-3 py-1.5 hover:bg-hover transition-colors ${isOwn ? 'bg-white/[0.02]' : ''}`}>
      <UserAvatar avatarUrl={avatarUrl} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-mono font-medium" style={{ color: avatarColor }}>
            {displayName}
          </span>
          {isVerified && <VerifiedBadge size={10} />}
          <NetWorthBadge netWorth={netWorth} showNetWorth={showNetWorth} />
          <span className="text-xxs font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {timeStr}
          </span>
        </div>
        {content && (
          <p className="text-sm font-mono text-text-primary break-words whitespace-pre-wrap">
            {content}
          </p>
        )}
        {post && <PostChip post={post} />}
      </div>
    </div>
  );
}
