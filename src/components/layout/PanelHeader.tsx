'use client';

import { ReactNode } from 'react';
import Badge from '@/components/ui/Badge';

interface PanelHeaderProps {
  title: string;
  windowId: string;
  onClose: () => void;
  actions?: ReactNode;
  symbol?: string;
}

export default function PanelHeader({ title, onClose, actions, symbol }: PanelHeaderProps) {
  return (
    <div className="drag-handle flex items-center justify-between h-8 px-3 bg-terminal-panel-header border-b border-terminal-border cursor-grab active:cursor-grabbing shrink-0 select-none">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xxs font-mono uppercase tracking-wider text-text-muted truncate">
          {title}
        </span>
        {symbol && <Badge text={symbol} variant="cyan" />}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-down transition-colors rounded text-xs"
        >
          X
        </button>
      </div>
    </div>
  );
}
