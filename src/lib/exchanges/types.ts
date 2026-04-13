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

export interface ExchangeAdapter {
  name: string;
  validateCredentials(apiKey: string, apiSecret: string, passphrase?: string): Promise<boolean>;
  fetchBalances(apiKey: string, apiSecret: string, passphrase?: string): Promise<ExchangeBalance[]>;
}
