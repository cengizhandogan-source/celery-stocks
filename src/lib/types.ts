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
  | 'ideas'
  | 'crypto-overview'
  | 'ai-chat'
  | 'text-note';

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
}

// Chat types
export interface Profile {
  id: string;
  display_name: string;
  avatar_color: string;
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
}

export interface DMConversation {
  peer: Profile;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export type Sentiment = 'bullish' | 'bearish' | 'neutral';

export interface Idea {
  id: string;
  user_id: string;
  symbol: string;
  title: string;
  content: string;
  sentiment: Sentiment;
  created_at: string;
  profile?: Profile;
}

export interface AiConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolCalls?: AiToolCallResult[];
}

export interface AiToolCallResult {
  name: string;
  args: Record<string, unknown>;
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
