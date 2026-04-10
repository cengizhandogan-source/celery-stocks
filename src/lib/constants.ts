import { WindowType } from './types';

export const DEFAULT_WATCHLIST_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ'
];

export const INDEX_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ 100' },
  { symbol: 'DIA', name: 'Dow Jones' },
  { symbol: 'IWM', name: 'Russell 2000' },
];

export const TIMEFRAMES = [
  { label: '1D', resolution: '1d', range: '1d' },
  { label: '1W', resolution: '1d', range: '1w' },
  { label: '1M', resolution: '1d', range: '1m' },
  { label: '3M', resolution: '1d', range: '3m' },
  { label: '1Y', resolution: '1wk', range: '1y' },
  { label: '5Y', resolution: '1mo', range: '5y' },
] as const;

export const WINDOW_TYPE_LABELS: Record<WindowType, string> = {
  'chart': 'Chart',
  'watchlist': 'Watchlist',
  'news': 'News Feed',
  'portfolio': 'Portfolio',
  'market-overview': 'Market Overview',
  'stock-detail': 'Stock Detail',
  'quote-monitor': 'Quote Monitor',
};

export const WINDOW_DEFAULTS: Record<WindowType, { w: number; h: number; minW: number; minH: number }> = {
  'chart': { w: 6, h: 4, minW: 4, minH: 3 },
  'watchlist': { w: 3, h: 5, minW: 2, minH: 3 },
  'news': { w: 4, h: 4, minW: 3, minH: 2 },
  'portfolio': { w: 5, h: 3, minW: 3, minH: 2 },
  'market-overview': { w: 4, h: 3, minW: 3, minH: 2 },
  'stock-detail': { w: 3, h: 5, minW: 2, minH: 3 },
  'quote-monitor': { w: 3, h: 3, minW: 2, minH: 2 },
};

export const QUOTE_POLL_INTERVAL = 15_000;
export const NEWS_POLL_INTERVAL = 300_000;
