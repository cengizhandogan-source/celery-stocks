'use client';

import { useRef, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useLayoutStore, getViewportCenterPosition } from '@/stores/layoutStore';
import { useSearch } from '@/hooks/useSearch';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';
import { WindowType } from '@/lib/types';
import CommandPalette from './CommandPalette';

const COMMANDS: { cmd: string; shortcut: string; type: WindowType; label: string; needsSymbol: boolean }[] = [
  { cmd: '/chart', shortcut: 'cht', type: 'chart', label: 'Open Chart', needsSymbol: true },
  { cmd: '/focus', shortcut: 'fcs', type: 'focus', label: 'Focus View', needsSymbol: true },
  { cmd: '/news', shortcut: 'nws', type: 'news', label: 'News Feed', needsSymbol: false },
  { cmd: '/watchlist', shortcut: 'wtl', type: 'watchlist', label: 'Watchlist', needsSymbol: false },
  { cmd: '/market', shortcut: 'mkt', type: 'market-overview', label: 'Market Overview', needsSymbol: false },
  { cmd: '/detail', shortcut: 'dtl', type: 'stock-detail', label: 'Stock Detail', needsSymbol: true },
  { cmd: '/monitor', shortcut: 'qm', type: 'quote-monitor', label: 'Quote Monitor', needsSymbol: false },
  { cmd: '/most', shortcut: 'mst', type: 'most-active', label: 'Most Active', needsSymbol: false },
  { cmd: '/financials', shortcut: 'fin', type: 'financials', label: 'Financials', needsSymbol: true },
  { cmd: '/holders', shortcut: 'hld', type: 'holders', label: 'Holders', needsSymbol: true },
  { cmd: '/filings', shortcut: 'flg', type: 'filings', label: 'SEC Filings', needsSymbol: true },
  { cmd: '/chatroom', shortcut: 'cr', type: 'chatroom', label: 'Chatroom', needsSymbol: false },
  { cmd: '/dm', shortcut: 'dm', type: 'direct-messages', label: 'Direct Messages', needsSymbol: false },
  { cmd: '/feed', shortcut: 'fd', type: 'feed', label: 'Feed', needsSymbol: false },
  { cmd: '/crypto', shortcut: 'cry', type: 'crypto-overview', label: 'Crypto Overview', needsSymbol: false },
  { cmd: '/settings', shortcut: 'set', type: 'settings', label: 'Settings', needsSymbol: false },
];

const SHORTCUT_MAP = new Map(COMMANDS.map((c) => [`/${c.shortcut}`, c]));

function parseCommand(query: string) {
  const parts = query.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase() || '';
  const symbol = parts[1]?.toUpperCase() || '';
  return { cmd, symbol };
}

export default function CommandBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const { commandQuery, setCommandQuery, setActiveSymbol, activeSymbol } = useAppStore();
  const addWindow = useLayoutStore((s) => s.addWindow);

  const isCommandMode = commandQuery.startsWith('/');
  const { results, loading } = useSearch(isCommandMode ? '' : commandQuery);

  const COMMANDS_PAGE_ENTRY = { cmd: '/commands', shortcut: 'commands', type: 'commands-page' as WindowType, label: 'Open Commands Reference', needsSymbol: false };

  const parsedCmd = parseCommand(commandQuery).cmd;
  const filteredCommands = isCommandMode
    ? [
        ...COMMANDS.filter(
          (c) => c.cmd.startsWith(parsedCmd) || `/${c.shortcut}`.startsWith(parsedCmd)
        ),
        ...('/commands'.startsWith(parsedCmd) ? [COMMANDS_PAGE_ENTRY] : []),
      ]
    : [];

  useKeyboardShortcut('k', () => {
    if (inputRef.current) {
      inputRef.current.focus();
      setFocused(true);
    }
  }, [], { meta: true });

  function handleSelect(symbol: string) {
    setActiveSymbol(symbol);
    addWindow('chart', symbol, undefined, getViewportCenterPosition());
    setCommandQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleCommandSelect(type: WindowType) {
    if (type === ('commands-page' as WindowType)) {
      openCommandsPage();
      return;
    }
    const { symbol } = parseCommand(commandQuery);
    if (symbol) setActiveSymbol(symbol);
    addWindow(type, symbol || activeSymbol, undefined, getViewportCenterPosition());
    setCommandQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }

  function openCommandsPage() {
    window.open('/commands', '_blank');
    setCommandQuery('');
    setFocused(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab' && isCommandMode) {
      e.preventDefault();
      if (filteredCommands.length === 0) return;
      const { symbol } = parseCommand(commandQuery);
      const completed = filteredCommands[0].cmd;
      setCommandQuery(symbol ? `${completed} ${symbol}` : `${completed} `);
      return;
    }
    if (e.key === 'Enter' && isCommandMode) {
      const { cmd, symbol } = parseCommand(commandQuery);
      if (cmd === '/commands') {
        e.preventDefault();
        openCommandsPage();
        return;
      }
      const exactCmd = COMMANDS.find((c) => c.cmd === cmd);
      const matched = exactCmd || SHORTCUT_MAP.get(cmd);
      if (matched) {
        e.preventDefault();
        if (symbol) setActiveSymbol(symbol);
        addWindow(matched.type, symbol || (matched.needsSymbol ? activeSymbol : undefined), undefined, getViewportCenterPosition());
        setCommandQuery('');
        setFocused(false);
        inputRef.current?.blur();
        return;
      }
    }
    if (e.key === 'Escape') {
      setCommandQuery('');
      setFocused(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative flex-1">
      <div className="flex items-center h-10 bg-terminal-input border-b border-terminal-border px-3 gap-2">
        <img src="/celery-logo.png" alt="Celery" width={20} height={20} className="shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={commandQuery}
          onChange={(e) => setCommandQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search tickers or type / for commands... (⌘K)"
          className="flex-1 bg-transparent text-text-primary font-mono text-sm outline-none placeholder:text-text-muted"
        />
      </div>
      {focused && isCommandMode && filteredCommands.length > 0 && (
        <CommandPalette
          results={[]}
          loading={false}
          query={commandQuery}
          onSelect={() => {}}
          commands={filteredCommands}
          onCommandSelect={handleCommandSelect}
        />
      )}
      {focused && !isCommandMode && (commandQuery || results.length > 0) && (
        <CommandPalette
          results={results}
          loading={loading}
          query={commandQuery}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
