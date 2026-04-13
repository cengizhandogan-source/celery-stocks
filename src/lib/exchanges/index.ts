import type { ExchangeAdapter } from './types';
import { BinanceAdapter } from './binance';
import { CoinbaseAdapter } from './coinbase';
import { KrakenAdapter } from './kraken';
import { BybitAdapter } from './bybit';
import { OkxAdapter } from './okx';
import { KuCoinAdapter } from './kucoin';
import { BitgetAdapter } from './bitget';
import { GateioAdapter } from './gateio';
import { MexcAdapter } from './mexc';
import { CryptoComAdapter } from './cryptocom';

const adapters: Record<string, ExchangeAdapter> = {
  binance: new BinanceAdapter(),
  coinbase: new CoinbaseAdapter(),
  kraken: new KrakenAdapter(),
  bybit: new BybitAdapter(),
  okx: new OkxAdapter(),
  kucoin: new KuCoinAdapter(),
  bitget: new BitgetAdapter(),
  gateio: new GateioAdapter(),
  mexc: new MexcAdapter(),
  cryptocom: new CryptoComAdapter(),
};

export function getAdapter(exchange: string): ExchangeAdapter {
  const adapter = adapters[exchange];
  if (!adapter) {
    throw new Error(`Unsupported exchange: ${exchange}`);
  }
  return adapter;
}

export { encrypt, decrypt } from './encryption';
export type { ExchangeAdapter, ExchangeBalance, ExchangeTrade } from './types';
