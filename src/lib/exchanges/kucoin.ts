import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError } from './types';

const BASE_URL = 'https://api.kucoin.com';

function signMessage(message: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(message).digest('base64');
}

function signPassphrase(passphrase: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(passphrase).digest('base64');
}

function buildHeaders(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  method: string,
  path: string,
  body: string = '',
) {
  const timestamp = Date.now().toString();
  const message = `${timestamp}${method}${path}${body}`;
  const signature = signMessage(message, apiSecret);
  const signedPassphrase = signPassphrase(passphrase, apiSecret);

  return {
    'KC-API-KEY': apiKey,
    'KC-API-SIGN': signature,
    'KC-API-TIMESTAMP': timestamp,
    'KC-API-PASSPHRASE': signedPassphrase,
    'KC-API-KEY-VERSION': '2',
    'Content-Type': 'application/json',
  };
}

interface KuCoinAccount {
  currency: string;
  balance: string;
  holds: string;
  type: string;
}

interface KuCoinResponse {
  code: string;
  data: KuCoinAccount[];
}

export class KuCoinAdapter implements ExchangeAdapter {
  name = 'KuCoin';

  async validateCredentials(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
  ): Promise<boolean> {
    try {
      const path = '/api/v1/accounts';
      const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
      const res = await fetch(`${BASE_URL}${path}`, { headers });
      const data: KuCoinResponse = await res.json();
      return data.code === '200000';
    } catch {
      return false;
    }
  }

  async fetchBalances(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
  ): Promise<ExchangeBalance[]> {
    const path = '/api/v1/accounts';
    const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('KuCoin', res.status, body);
      }
      throw new Error(`KuCoin API error ${res.status}: ${body}`);
    }

    const data: KuCoinResponse = await res.json();

    if (data.code !== '200000') {
      throw new Error(`KuCoin API error code ${data.code}`);
    }

    const aggregated = new Map<string, { free: number; locked: number }>();

    for (const account of data.data ?? []) {
      const free = parseFloat(account.balance);
      const locked = parseFloat(account.holds);
      const existing = aggregated.get(account.currency);

      if (existing) {
        existing.free += free;
        existing.locked += locked;
      } else {
        aggregated.set(account.currency, { free, locked });
      }
    }

    const balances: ExchangeBalance[] = [];
    for (const [asset, { free, locked }] of aggregated) {
      if (free !== 0 || locked !== 0) {
        balances.push({ asset, free, locked });
      }
    }

    return balances;
  }
}
