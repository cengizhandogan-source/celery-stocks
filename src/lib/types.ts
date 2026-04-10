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

export interface Position {
  id: string;
  symbol: string;
  shares: number;
  avgCost: number;
  addedAt: string;
}

export type WindowType =
  | 'chart'
  | 'watchlist'
  | 'news'
  | 'portfolio'
  | 'market-overview'
  | 'stock-detail'
  | 'quote-monitor';

export interface WindowConfig {
  id: string;
  type: WindowType;
  title: string;
  symbol?: string;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}
