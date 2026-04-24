// Profile / social types
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

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
  post_id?: string | null;
  post?: Post | null;
}

export interface DMConversation {
  peer: Profile;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export type PostType = 'text' | 'position' | 'trade';

export interface Post {
  id: string;
  user_id: string;
  post_type: PostType;
  content: string | null;
  symbol: string | null;
  position_symbol: string | null;
  position_shares: number | null;
  position_avg_cost: number | null;
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
  top_comment?: Comment | null;
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
  like_count: number;
  liked_by_me: boolean;
}

// Market-data types (used by the feed mini chart + symbol search)
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

export interface NetWorthSnapshot {
  date: string;
  total_usd: number;
}
