'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getMarketStatus, getMarketStatusColor, getNextMarketEvent, type Exchange, type MarketStatus } from '@/lib/formatters';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/utils/supabase/client';
import { useChatStore } from '@/stores/chatStore';
import { useLayoutStore } from '@/stores/layoutStore';

export default function StatusBar() {
  const [time, setTime] = useState('');
  const [markets, setMarkets] = useState<Record<Exchange, { status: MarketStatus; event: string }>>({
    NYSE: { status: 'closed', event: '' },
    NASDAQ: { status: 'closed', event: '' },
    EURO: { status: 'closed', event: '' },
    JPX: { status: 'closed', event: '' },
    CRYPTO: { status: 'closed', event: '' },
  });
  const { user } = useUser();
  const router = useRouter();
  const unreadDmCount = useChatStore((s) => s.unreadDmCount);

  const pages = useLayoutStore((s) => s.pages);
  const activePage = useLayoutStore((s) => s.activePage);
  const switchPage = useLayoutStore((s) => s.switchPage);
  const addPage = useLayoutStore((s) => s.addPage);
  const removePage = useLayoutStore((s) => s.removePage);
  const renamePage = useLayoutStore((s) => s.renamePage);

  const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' ET'
      );
      setMarkets({
        NYSE: { status: getMarketStatus('NYSE'), event: getNextMarketEvent('NYSE') },
        NASDAQ: { status: getMarketStatus('NASDAQ'), event: getNextMarketEvent('NASDAQ') },
        EURO: { status: getMarketStatus('EURO'), event: getNextMarketEvent('EURO') },
        JPX: { status: getMarketStatus('JPX'), event: getNextMarketEvent('JPX') },
        CRYPTO: { status: getMarketStatus('CRYPTO'), event: getNextMarketEvent('CRYPTO') },
      });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [contextMenu]);

  // Focus rename input when renaming starts
  useEffect(() => {
    if (renaming !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  function handleContextMenu(e: React.MouseEvent, index: number) {
    e.preventDefault();
    setContextMenu({ index, x: e.clientX, y: e.clientY });
  }

  function startRename(index: number) {
    setRenameValue(pages[index].name);
    setRenaming(index);
    setContextMenu(null);
  }

  function commitRename() {
    if (renaming !== null && renameValue.trim()) {
      renamePage(renaming, renameValue.trim());
    }
    setRenaming(null);
  }

  function handleDelete(index: number) {
    setContextMenu(null);
    if (pages.length <= 1) return;
    removePage(index);
  }

  return (
    <div className="relative flex items-center justify-between h-7 px-4 bg-terminal-panel border-t border-terminal-border shrink-0">
      <div className="flex items-center gap-3 text-xxs font-mono">
        {([['NYSE', 'NYSE'], ['NASDAQ', 'NDQ'], ['EURO', 'EU'], ['JPX', 'JPX']] as [Exchange, string][]).map(([ex, label]) => {
          const { dot, text } = getMarketStatusColor(markets[ex].status);
          return (
            <span key={ex} className="relative group flex items-center gap-1 cursor-default">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className={text}>{label}</span>
              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-terminal-panel border border-terminal-border-strong px-2 py-0.5 text-xxs text-text-primary whitespace-nowrap rounded-sm z-50">
                {markets[ex].event}
              </span>
            </span>
          );
        })}

        <span className="mx-1 text-terminal-border">|</span>

        {/* Page tabs */}
        <div className="flex items-center gap-0.5">
          {pages.map((page, i) => (
            <button
              key={i}
              onClick={() => switchPage(i)}
              onContextMenu={(e) => handleContextMenu(e, i)}
              onDoubleClick={() => startRename(i)}
              className={`px-2 py-0.5 rounded-sm transition-colors ${
                i === activePage
                  ? 'text-up bg-terminal-bg'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {renaming === i ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  className="bg-terminal-bg border border-terminal-border text-text-primary text-xxs font-mono w-16 px-1 outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                page.name
              )}
            </button>
          ))}
          {pages.length < 3 && (
            <button
              onClick={addPage}
              className="px-1.5 py-0.5 text-text-muted hover:text-up transition-colors rounded-sm"
              title="Add page"
            >
              +
            </button>
          )}
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-xxs font-mono text-text-secondary">{time}</span>
      </div>

      <div className="flex items-center gap-3 text-xxs font-mono">
        {user && (
          <>
            <span className="text-text-secondary">{user.email}</span>
            {unreadDmCount > 0 && (
              <span className="text-xxs font-mono bg-up text-terminal-bg rounded-full px-1.5 py-0.5 leading-none">
                {unreadDmCount} DM
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-text-muted hover:text-down transition-colors uppercase tracking-wider"
            >
              Sign Out
            </button>
          </>
        )}
        <span className="flex items-center gap-1.5 text-text-muted tracking-widest">
          <img src="/celery-logo.png" alt="" width={16} height={16} className="opacity-60" />
          CELERY STOCKS
        </span>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-terminal-panel border border-terminal-border-strong rounded-sm shadow-lg z-[9999] py-1"
          style={{ left: contextMenu.x, top: contextMenu.y - 60 }}
        >
          <button
            onClick={() => startRename(contextMenu.index)}
            className="block w-full text-left px-3 py-1 text-xxs font-mono text-text-primary hover:bg-terminal-bg transition-colors"
          >
            Rename
          </button>
          <button
            onClick={() => handleDelete(contextMenu.index)}
            disabled={pages.length <= 1}
            className="block w-full text-left px-3 py-1 text-xxs font-mono text-down hover:bg-terminal-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
