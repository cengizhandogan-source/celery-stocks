import { CRYPTO_SYMBOLS } from './constants';

/** Set of bare crypto tickers: 'BTC', 'ETH', 'SOL', etc. */
const CRYPTO_BASE_SET = new Set(
  CRYPTO_SYMBOLS.map(c => c.symbol.split('-')[0])
);

/**
 * Normalize a symbol for Yahoo Finance lookups.
 * Bare crypto base symbols (BTC, ETH, ...) are mapped to BTC-USD, ETH-USD, etc.
 * Everything else passes through uppercased.
 */
export function resolveSymbol(raw: string): string {
  const upper = raw.trim().toUpperCase();
  if (CRYPTO_BASE_SET.has(upper)) return `${upper}-USD`;
  return upper;
}
