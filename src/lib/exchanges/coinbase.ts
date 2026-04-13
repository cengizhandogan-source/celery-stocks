import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError } from './types';

const BASE_URL = 'https://api.coinbase.com';

function sign(timestamp: number, method: string, path: string, apiSecret: string): string {
  const message = `${timestamp}${method}${path}`;
  return createHmac('sha256', apiSecret).update(message).digest('hex');
}

function buildHeaders(apiKey: string, apiSecret: string, method: string, path: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(timestamp, method, path, apiSecret);
  return {
    'CB-ACCESS-KEY': apiKey,
    'CB-ACCESS-SIGN': signature,
    'CB-ACCESS-TIMESTAMP': timestamp.toString(),
    'Content-Type': 'application/json',
  };
}

interface CoinbaseAccount {
  currency: string;
  available_balance: { value: string };
  hold: { value: string };
}

interface CoinbaseResponse {
  accounts: CoinbaseAccount[];
  cursor?: string;
  has_next?: boolean;
}

export class CoinbaseAdapter implements ExchangeAdapter {
  name = 'Coinbase';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const path = '/api/v3/brokerage/accounts?limit=1';
      const headers = buildHeaders(apiKey, apiSecret, 'GET', path);
      const res = await fetch(`${BASE_URL}${path}`, { headers });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const balances: ExchangeBalance[] = [];
    let cursor: string | undefined;

    do {
      const path = cursor
        ? `/api/v3/brokerage/accounts?limit=250&cursor=${cursor}`
        : '/api/v3/brokerage/accounts?limit=250';
      const headers = buildHeaders(apiKey, apiSecret, 'GET', path);
      const res = await fetch(`${BASE_URL}${path}`, { headers });

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 401 || res.status === 403) {
          throw new ExchangeAuthError('Coinbase', res.status, body);
        }
        throw new Error(`Coinbase API error ${res.status}: ${body}`);
      }

      const data: CoinbaseResponse = await res.json();

      for (const account of data.accounts ?? []) {
        const free = parseFloat(account.available_balance.value);
        const locked = parseFloat(account.hold.value);
        if (free !== 0 || locked !== 0) {
          balances.push({ asset: account.currency, free, locked });
        }
      }

      cursor = data.has_next ? data.cursor : undefined;
    } while (cursor);

    return balances;
  }
}
