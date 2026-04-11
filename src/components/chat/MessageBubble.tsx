import { useMemo } from 'react';
import type { StrategyChipData } from '@/lib/types';
import StrategyChip from './StrategyChip';

interface MessageBubbleProps {
  displayName: string;
  avatarColor: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
  strategy?: StrategyChipData | null;
}

export default function MessageBubble({ displayName, avatarColor, content, timestamp, isOwn, strategy }: MessageBubbleProps) {
  const timeStr = useMemo(() => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [timestamp]);

  return (
    <div className={`group flex gap-2 px-3 py-1.5 hover:bg-terminal-hover transition-colors ${isOwn ? 'bg-white/[0.02]' : ''}`}>
      <span
        className="w-2 h-2 rounded-full shrink-0 mt-1.5"
        style={{ backgroundColor: avatarColor }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-mono font-medium" style={{ color: avatarColor }}>
            {displayName}
          </span>
          <span className="text-xxs font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            {timeStr}
          </span>
        </div>
        <p className="text-sm font-mono text-text-primary break-words whitespace-pre-wrap">
          {content}
        </p>
        {strategy && <StrategyChip strategy={strategy} />}
      </div>
    </div>
  );
}
