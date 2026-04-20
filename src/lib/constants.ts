import type { ExchangeName } from './types';

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
