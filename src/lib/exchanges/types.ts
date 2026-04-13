export interface ExchangeBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface ExchangeAdapter {
  name: string;
  validateCredentials(apiKey: string, apiSecret: string, passphrase?: string): Promise<boolean>;
  fetchBalances(apiKey: string, apiSecret: string, passphrase?: string): Promise<ExchangeBalance[]>;
}
