import { WindowType } from './types';

export interface WindowShortcut {
  type: WindowType;
  label: string;
  needsSymbol: boolean;
  numberKey?: string;
  letterKey: string;
}

export const WINDOW_SHORTCUTS: WindowShortcut[] = [
  { type: 'chart',            label: 'Chart',            needsSymbol: true,  numberKey: '1', letterKey: 'c' },
  { type: 'watchlist',        label: 'Watchlist',        needsSymbol: false, numberKey: '2', letterKey: 'l' },
  { type: 'news',             label: 'News Feed',        needsSymbol: false, numberKey: '3', letterKey: 'e' },
  { type: 'market-overview',  label: 'Market Overview',  needsSymbol: false, numberKey: '4', letterKey: 'm' },
  { type: 'stock-detail',     label: 'Stock Detail',     needsSymbol: true,  numberKey: '5', letterKey: 's' },
  { type: 'quote-monitor',    label: 'Quote Monitor',    needsSymbol: false, numberKey: '6', letterKey: 'q' },
  { type: 'focus',            label: 'Focus',            needsSymbol: true,  numberKey: '7', letterKey: 'f' },
  { type: 'most-active',      label: 'Most Active',      needsSymbol: false, numberKey: '8', letterKey: 'a' },
  { type: 'financials',       label: 'Financials',       needsSymbol: true,  numberKey: '9', letterKey: 'v' },
  { type: 'holders',          label: 'Holders',          needsSymbol: true,                  letterKey: 'h' },
  { type: 'filings',          label: 'SEC Filings',      needsSymbol: true,                  letterKey: 'g' },
  { type: 'chatroom',         label: 'Chatroom',         needsSymbol: false,                 letterKey: 'r' },
  { type: 'direct-messages',  label: 'Direct Messages',  needsSymbol: false,                 letterKey: 'x' },
  { type: 'feed',             label: 'Feed',             needsSymbol: false,                 letterKey: 'y' },
  { type: 'crypto-overview',  label: 'Crypto Overview',  needsSymbol: false,                 letterKey: 'k' },
];

export function getShortcutLabel(shortcut: WindowShortcut): string {
  if (shortcut.numberKey) {
    return `Ctrl ${shortcut.numberKey}`;
  }
  return `Ctrl Shift ${shortcut.letterKey.toUpperCase()}`;
}

const shortcutsByType = new Map(WINDOW_SHORTCUTS.map(s => [s.type, s]));

export function getShortcutForType(type: WindowType): WindowShortcut | undefined {
  return shortcutsByType.get(type);
}
