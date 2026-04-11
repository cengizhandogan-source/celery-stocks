'use client';

import { ReactNode, useRef, useState } from 'react';
import Badge from '@/components/ui/Badge';
import TickerLogo from '@/components/ui/TickerLogo';
import SymbolSearch from '@/components/ui/SymbolSearch';
import { useLayoutStore } from '@/stores/layoutStore';

interface PanelHeaderProps {
  title: string;
  windowId: string;
  onClose: () => void;
  actions?: ReactNode;
  symbol?: string;
  symbolEditable?: boolean;
  isMinimized?: boolean;
  isPinned?: boolean;
  onToggleMinimize?: () => void;
  onTogglePin?: () => void;
}

export default function PanelHeader({ title, windowId, onClose, actions, symbol, symbolEditable, isMinimized, isPinned, onToggleMinimize, onTogglePin }: PanelHeaderProps) {
  const [editing, setEditing] = useState(false);
  const closeTimeRef = useRef(0);
  const updateWindowSymbol = useLayoutStore((s) => s.updateWindowSymbol);

  return (
    <div className="drag-handle flex items-center justify-between h-8 px-3 bg-terminal-panel-header border-b border-terminal-border cursor-grab active:cursor-grabbing shrink-0 select-none">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xxs font-mono uppercase tracking-wider text-text-muted truncate">
          {title}
        </span>
        {symbol && symbolEditable ? (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (Date.now() - closeTimeRef.current < 200) return;
                setEditing(!editing);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="cursor-pointer"
            >
              <TickerLogo symbol={symbol} size={14} />
            </button>
            {editing && (
              <SymbolSearch
                onSelect={(sym) => {
                  updateWindowSymbol(windowId, sym);
                  setEditing(false);
                }}
                onClose={() => {
                  setEditing(false);
                  closeTimeRef.current = Date.now();
                }}
                placeholder="Change ticker..."
              />
            )}
          </div>
        ) : symbol ? (
          <TickerLogo symbol={symbol} size={14} />
        ) : null}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {actions}
        {onTogglePin && (
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`w-5 h-5 flex items-center justify-center transition-colors rounded text-xxs font-mono ${isPinned ? 'text-up' : 'text-text-muted hover:text-text-primary'}`}
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            {isPinned ? '◆' : '◇'}
          </button>
        )}
        {onToggleMinimize && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded text-xxs font-mono"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            {isMinimized ? '△' : '▽'}
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-5 h-5 flex items-center justify-center text-text-muted hover:text-down transition-colors rounded text-xs"
        >
          X
        </button>
      </div>
    </div>
  );
}
