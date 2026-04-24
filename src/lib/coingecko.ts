/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Quote, Candle } from './types';
import { LruCache } from './lruCache';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Price cache (used by wallet sync getPrices)
const cache = new LruCache<string, { data: Record<string, number>; expiry: number }>(1000);
const CACHE_TTL = 60_000;

// General-purpose cache for quotes and candles
const dataCache = new LruCache<string, { data: unknown; expiry: number }>(2000);

function getCached<T>(key: string): T | null {
  const entry = dataCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  dataCache.delete(key);
  return null;
}

function setDataCache(key: string, data: unknown, ttlMs: number) {
  dataCache.set(key, { data, expiry: Date.now() + ttlMs });
}

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }
  return headers;
}

const ASSET_TO_COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'ripple',
  BNB: 'binancecoin',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  POL: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  ETC: 'ethereum-classic',
  XLM: 'stellar',
  NEAR: 'near',
  APT: 'aptos',
  SUI: 'sui',
  ARB: 'arbitrum',
  OP: 'optimism',
  FIL: 'filecoin',
  HBAR: 'hedera-hashgraph',
  ICP: 'internet-computer',
  VET: 'vechain',
  AAVE: 'aave',
  MKR: 'maker',
  GRT: 'the-graph',
  ALGO: 'algorand',
  FTM: 'fantom',
  SAND: 'the-sandbox',
  MANA: 'decentraland',
  AXS: 'axie-infinity',
  CRO: 'crypto-com-chain',
  USDT: 'tether',
  USDC: 'usd-coin',
  DAI: 'dai',
  BUSD: 'binance-usd',
  TUSD: 'true-usd',
  SHIB: 'shiba-inu',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  BONK: 'bonk',
  FLOKI: 'floki',
  TRX: 'tron',
  TON: 'the-open-network',
  BCH: 'bitcoin-cash',
  LEO: 'leo-token',
  OKB: 'okb',
  RENDER: 'render-token',
  INJ: 'injective-protocol',
  TIA: 'celestia',
  SEI: 'sei-network',
  STX: 'blockstack',
  IMX: 'immutable-x',
  RUNE: 'thorchain',
  FET: 'fetch-ai',
  PENDLE: 'pendle',
  JUP: 'jupiter-exchange-solana',
  W: 'wormhole',
  ENA: 'ethena',
  ONDO: 'ondo-finance',
};

function getCoingeckoId(asset: string): string | null {
  return ASSET_TO_COINGECKO_ID[asset.toUpperCase()] ?? null;
}

export async function getPrices(assets: string[]): Promise<Record<string, number>> {
  const uniqueAssets = [...new Set(assets.map((a) => a.toUpperCase()))];

  // Check cache
  const cacheKey = uniqueAssets.sort().join(',');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // Map assets to CoinGecko IDs
  const idToAsset = new Map<string, string>();
  for (const asset of uniqueAssets) {
    const id = getCoingeckoId(asset);
    if (id) idToAsset.set(id, asset);
  }

  if (idToAsset.size === 0) return {};

  const ids = [...idToAsset.keys()].join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd`;

  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) {
    throw new Error(`CoinGecko API error: ${res.status}`);
  }

  const data = (await res.json()) as Record<string, { usd?: number }>;

  const prices: Record<string, number> = {};
  for (const [id, asset] of idToAsset) {
    const price = data[id]?.usd;
    if (price != null) {
      prices[asset] = price;
    }
  }

  // Cache result
  cache.set(cacheKey, { data: prices, expiry: Date.now() + CACHE_TTL });

  return prices;
}

// --- Quote / Candle API (used by /api/quote and /api/candles routes) ---

export function hasCoinGeckoId(symbol: string): boolean {
  const base = symbol.split('-')[0].toUpperCase();
  return base in ASSET_TO_COINGECKO_ID;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const key = `cg-quote:${symbol}`;
  const cached = getCached<Quote>(key);
  if (cached) return cached;

  const base = symbol.split('-')[0].toUpperCase();
  const coinId = ASSET_TO_COINGECKO_ID[base];
  if (!coinId) throw new Error(`No CoinGecko mapping for ${symbol}`);

  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${coinId}`;
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

  const [data] = (await res.json()) as any[];
  if (!data) throw new Error(`No data returned for ${symbol}`);

  const previousClose = (data.current_price ?? 0) - (data.price_change_24h ?? 0);
  const quote: Quote = {
    symbol,
    price: data.current_price ?? 0,
    change: data.price_change_24h ?? 0,
    changePercent: data.price_change_percentage_24h ?? 0,
    high: data.high_24h ?? 0,
    low: data.low_24h ?? 0,
    open: previousClose,
    previousClose,
    volume: data.total_volume ?? 0,
    marketCap: data.market_cap ?? undefined,
    timestamp: Date.now(),
  };

  setDataCache(key, quote, 30_000);
  return quote;
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  if (!symbols.length) return [];

  const key = `cg-quotes:${[...symbols].sort().join(',')}`;
  const cached = getCached<Quote[]>(key);
  if (cached) return cached;

  const idToSymbol = new Map<string, string>();
  for (const sym of symbols) {
    const base = sym.split('-')[0].toUpperCase();
    const id = ASSET_TO_COINGECKO_ID[base];
    if (id) idToSymbol.set(id, sym);
  }

  if (idToSymbol.size === 0) return [];

  const ids = [...idToSymbol.keys()].join(',');
  const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${ids}`;
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

  const data = (await res.json()) as any[];

  const quotes: Quote[] = data.map((d: any) => {
    const symbol = idToSymbol.get(d.id) || d.symbol?.toUpperCase();
    const previousClose = (d.current_price ?? 0) - (d.price_change_24h ?? 0);
    return {
      symbol,
      price: d.current_price ?? 0,
      change: d.price_change_24h ?? 0,
      changePercent: d.price_change_percentage_24h ?? 0,
      high: d.high_24h ?? 0,
      low: d.low_24h ?? 0,
      open: previousClose,
      previousClose,
      volume: d.total_volume ?? 0,
      marketCap: d.market_cap ?? undefined,
      timestamp: Date.now(),
    };
  });

  setDataCache(key, quotes, 30_000);
  return quotes;
}

const RANGE_TO_DAYS: Record<string, string> = {
  '1d': '1', '1w': '7', '1m': '30', '3m': '90', '1y': '365', '5y': 'max',
};

export async function getCandles(symbol: string, _interval: string, range: string): Promise<Candle[]> {
  const days = RANGE_TO_DAYS[range] || '30';
  const key = `cg-candles:${symbol}:${days}`;
  const cached = getCached<Candle[]>(key);
  if (cached) return cached;

  const base = symbol.split('-')[0].toUpperCase();
  const coinId = ASSET_TO_COINGECKO_ID[base];
  if (!coinId) throw new Error(`No CoinGecko mapping for ${symbol}`);

  const url = `${COINGECKO_BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

  const data = (await res.json()) as number[][];

  const candles: Candle[] = data.map(([timestamp, open, high, low, close]) => ({
    time: Math.floor(timestamp / 1000),
    open,
    high,
    low,
    close,
  }));

  setDataCache(key, candles, 300_000);
  return candles;
}
