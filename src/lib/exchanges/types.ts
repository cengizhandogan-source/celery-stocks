export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
}

export class ExchangeAuthError extends Error {
  constructor(exchange: string, status: number, body: string) {
    super(`${exchange} auth error ${status}: ${body}`);
    this.name = 'ExchangeAuthError';
  }
}

export interface ExchangeTrade {
  tradeId: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  quoteQty: number;
  fee: number;
  feeAsset: string;
  executedAt: Date;
}

export interface ExchangeAdapter {
  name: string;
  validateCredentials(apiKey: string, apiSecret: string, passphrase?: string): Promise<boolean>;
  fetchBalances(apiKey: string, apiSecret: string, passphrase?: string): Promise<ExchangeBalance[]>;
  fetchTrades(apiKey: string, apiSecret: string, passphrase?: string, symbols?: string[], since?: Date): Promise<ExchangeTrade[]>;
}
