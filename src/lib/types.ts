export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  industry: string;
  sector: string;
  description: string;
  website: string;
  logo?: string;
  country: string;
  marketCap: number;
  sharesOutstanding: number;
  employees?: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  image?: string;
  tickers?: string[];
}

export interface KeyStats {
  symbol: string;
  pe?: number;
  forwardPe?: number;
  eps?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  dividendYield?: number;
  beta?: number;
  avgVolume?: number;
  priceToBook?: number;
  priceToSales?: number;
  profitMargin?: number;
  revenueGrowth?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Position {
  id: string;
  portfolio_id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  addedAt: string;
}

export interface PortfolioSnapshot {
  id: string;
  portfolio_id: string;
  date: string;
  total_value: number;
  total_cost: number;
  day_change: number;
}

export type WindowType =
  | 'chart'
  | 'watchlist'
  | 'news'
  | 'portfolio'
  | 'market-overview'
  | 'stock-detail'
  | 'quote-monitor'
  | 'focus'
  | 'most-active'
  | 'financials'
  | 'holders'
  | 'filings'
  | 'chatroom'
  | 'direct-messages'
  | 'feed'
  | 'crypto-overview'
  | 'text-note'
  | 'strategy-editor'
  | 'strategy-signals'
  | 'crypto-wallet'
  | 'settings';

export interface ScreenerResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
}

export interface FinancialStatements {
  income: { annual: FinancialRow[]; quarterly: FinancialRow[] };
  balance: { annual: FinancialRow[]; quarterly: FinancialRow[] };
  cashflow: { annual: FinancialRow[]; quarterly: FinancialRow[] };
}

export interface FinancialRow {
  date: string;
  [key: string]: string | number | null | undefined;
}

export interface HoldersData {
  holders: Holder[];
  insidersPercent?: number;
  institutionsPercent?: number;
  institutionsCount?: number;
}

export interface Holder {
  organization: string;
  pctHeld: number;
  shares: number;
  value: number;
  pctChange?: number;
  reportDate?: string;
}

export interface Filing {
  date: string;
  type: string;
  title: string;
  edgarUrl: string;
}

export interface WindowConfig {
  id: string;
  type: WindowType;
  title: string;
  symbol?: string;
  symbols?: string[];
  chatroomId?: string;
  content?: string;
  strategyId?: string;
}

// Chat types
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  is_verified: boolean;
  crypto_net_worth?: number | null;
  show_net_worth?: boolean;
}

export interface Chatroom {
  id: string;
  name: string;
  description: string | null;
  symbol: string | null;
  is_default: boolean;
  created_by: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  chatroom_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
  strategy_id?: string;
  strategy?: StrategyChipData;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
  strategy_id?: string;
  strategy?: StrategyChipData;
}

export interface DMConversation {
  peer: Profile;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export type PostType = 'text' | 'position' | 'strategy' | 'trade';

export interface Post {
  id: string;
  user_id: string;
  post_type: PostType;
  content: string | null;
  symbol: string | null;
  sentiment: Sentiment | null;
  position_symbol: string | null;
  position_shares: number | null;
  position_avg_cost: number | null;
  strategy_id: string | null;
  strategy?: StrategyChipData;
  trade_symbol: string | null;
  trade_side: 'buy' | 'sell' | null;
  trade_qty: number | null;
  trade_price: number | null;
  trade_quote_qty: number | null;
  trade_pnl: number | null;
  trade_executed_at: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
  profile?: Profile;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  parent?: { user_id: string; profile?: Pick<Profile, 'username' | 'display_name' | 'avatar_color'> };
  profile?: Profile;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  zIndex: number;
}

export interface PageData {
  name: string;
  windows: WindowConfig[];
  layouts: LayoutItem[];
  maxZIndex: number;
  minimizedWindows: Record<string, { h: number; minH: number }>;
  pinnedWindows: string[];
}

// Strategy types
export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string;
  code: string;
  symbols: string[];
  parameters: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  import_count?: number;
  backtest?: StrategyBacktestResult;
}

export interface StrategyBacktestResult {
  id: string;
  strategy_id: string;
  total_return: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  total_trades: number;
  backtest_range: string;
  equity_curve: { date: string; value: number }[];
  computed_at: string;
}

export interface StrategySignal {
  id: string;
  strategy_id: string;
  user_id: string;
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  price: number;
  confidence: number;
  reason: string;
  created_at: string;
  strategy_name?: string;
}

export interface StrategyChipData {
  id: string;
  name: string;
  description: string;
  symbols: string[];
  code: string;
  author: Profile;
  backtest?: StrategyBacktestResult;
  import_count: number;
  created_at: string;
}

// Crypto wallet types
export type ExchangeName =
  | 'binance'
  | 'coinbase'
  | 'kraken'
  | 'bybit'
  | 'okx'
  | 'kucoin'
  | 'bitget'
  | 'gateio'
  | 'mexc'
  | 'cryptocom';

export interface ExchangeConnection {
  id: string;
  user_id: string;
  exchange: ExchangeName;
  label: string;
  is_valid: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export interface CryptoHolding {
  id: string;
  connection_id: string;
  user_id: string;
  asset: string;
  free_balance: number;
  locked_balance: number;
  usd_value: number;
  price_at_sync: number;
  synced_at: string;
}

export interface CachedTrade {
  id: string;
  connection_id: string;
  user_id: string;
  exchange_trade_id: string;
  symbol: string;
  base_asset: string;
  quote_asset: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  quote_qty: number;
  fee: number;
  fee_asset: string | null;
  executed_at: string;
  synced_at: string;
}
