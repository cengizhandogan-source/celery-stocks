import type { WindowType, ExchangeName } from './types';

export const DEFAULT_WATCHLIST_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ', 'BTC-USD', 'ETH-USD'
];

export const INDEX_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500' },
  { symbol: 'QQQ', name: 'NASDAQ 100' },
  { symbol: 'DIA', name: 'Dow Jones' },
  { symbol: 'IWM', name: 'Russell 2000' },
];

export const CRYPTO_SYMBOLS = [
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'SOL-USD', name: 'Solana' },
  { symbol: 'XRP-USD', name: 'XRP' },
  { symbol: 'BNB-USD', name: 'BNB' },
  { symbol: 'ADA-USD', name: 'Cardano' },
  { symbol: 'DOGE-USD', name: 'Dogecoin' },
  { symbol: 'DOT-USD', name: 'Polkadot' },
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
  'focus': 'Focus',
  'most-active': 'Most Active',
  'financials': 'Financials',
  'holders': 'Holders',
  'filings': 'SEC Filings',
  'chatroom': 'Chatroom',
  'direct-messages': 'Direct Messages',
  'feed': 'Feed',
  'crypto-overview': 'Crypto Overview',
  'text-note': 'Text Note',
  'strategy-editor': 'Strategy Editor',
  'strategy-signals': 'Strategy Signals',
  'crypto-wallet': 'Crypto Wallet',
  'settings': 'Settings',
};

export const WINDOW_DEFAULTS: Record<WindowType, { w: number; h: number; minW: number; minH: number }> = {
  'chart':            { w: 600, h: 400, minW: 400, minH: 280 },
  'watchlist':        { w: 300, h: 480, minW: 200, minH: 280 },
  'news':             { w: 400, h: 400, minW: 300, minH: 200 },
  'portfolio':        { w: 600, h: 480, minW: 300, minH: 280 },
  'market-overview':  { w: 400, h: 300, minW: 300, minH: 200 },
  'stock-detail':     { w: 300, h: 480, minW: 200, minH: 280 },
  'quote-monitor':    { w: 300, h: 300, minW: 200, minH: 200 },
  'focus':            { w: 200, h: 200, minW: 200, minH: 200 },
  'most-active':      { w: 400, h: 400, minW: 300, minH: 280 },
  'financials':       { w: 500, h: 480, minW: 400, minH: 360 },
  'holders':          { w: 400, h: 400, minW: 300, minH: 280 },
  'filings':          { w: 400, h: 400, minW: 300, minH: 280 },
  'chatroom':         { w: 400, h: 480, minW: 300, minH: 280 },
  'direct-messages':  { w: 400, h: 480, minW: 300, minH: 280 },
  'feed':             { w: 500, h: 480, minW: 300, minH: 280 },
  'crypto-overview':  { w: 400, h: 300, minW: 300, minH: 200 },
  'text-note':            { w: 300, h: 300, minW: 200, minH: 200 },
  'strategy-editor':      { w: 700, h: 500, minW: 500, minH: 380 },
  'strategy-signals':     { w: 400, h: 400, minW: 300, minH: 280 },
  'crypto-wallet':        { w: 500, h: 480, minW: 350, minH: 320 },
  'settings':             { w: 480, h: 520, minW: 380, minH: 400 },
};

export const CASCADE_OFFSET = 30;
export const PANEL_HEADER_HEIGHT = 32;

export const QUOTE_POLL_INTERVAL = 15_000;
export const NEWS_POLL_INTERVAL = 300_000;

export const EXCHANGE_METADATA: Record<ExchangeName, { displayName: string; requiresPassphrase: boolean }> = {
  binance:   { displayName: 'Binance',    requiresPassphrase: false },
  coinbase:  { displayName: 'Coinbase',   requiresPassphrase: true },
  kraken:    { displayName: 'Kraken',     requiresPassphrase: false },
  bybit:     { displayName: 'Bybit',      requiresPassphrase: false },
  okx:       { displayName: 'OKX',        requiresPassphrase: true },
  kucoin:    { displayName: 'KuCoin',     requiresPassphrase: true },
  bitget:    { displayName: 'Bitget',     requiresPassphrase: true },
  gateio:    { displayName: 'Gate.io',    requiresPassphrase: false },
  mexc:      { displayName: 'MEXC',       requiresPassphrase: false },
  cryptocom: { displayName: 'Crypto.com', requiresPassphrase: false },
};
