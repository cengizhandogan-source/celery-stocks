import { createHash, createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError } from './types';

const BASE_URL = 'https://api.gateio.ws';

function hashBody(body: string): string {
  return createHash('sha512').update(body).digest('hex');
}

function sign(
  method: string,
  path: string,
  query: string,
  body: string,
  timestamp: number,
  apiSecret: string,
): string {
  const bodyHash = hashBody(body);
  const signingString = `${method}\n${path}\n${query}\n${bodyHash}\n${timestamp}`;
  return createHmac('sha512', apiSecret).update(signingString).digest('hex');
}

function buildHeaders(
  apiKey: string,
  apiSecret: string,
  method: string,
  path: string,
  query: string = '',
  body: string = '',
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(method, path, query, body, timestamp, apiSecret);
  return {
    KEY: apiKey,
    SIGN: signature,
    Timestamp: timestamp.toString(),
    'Content-Type': 'application/json',
  };
}

interface GateAccount {
  currency: string;
  available: string;
  locked: string;
}

export class GateioAdapter implements ExchangeAdapter {
  name = 'Gate.io';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const path = '/api/v4/spot/accounts';
      const headers = buildHeaders(apiKey, apiSecret, 'GET', path);
      const res = await fetch(`${BASE_URL}${path}`, { headers });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const path = '/api/v4/spot/accounts';
    const headers = buildHeaders(apiKey, apiSecret, 'GET', path);
    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Gate.io', res.status, text);
      }
      throw new Error(`Gate.io API error ${res.status}: ${text}`);
    }

    const data: GateAccount[] = await res.json();
    const balances: ExchangeBalance[] = (data ?? [])
      .map((a) => ({
        asset: a.currency,
        free: parseFloat(a.available),
        locked: parseFloat(a.locked),
      }))
      .filter((b) => b.free !== 0 || b.locked !== 0);

    return balances;
  }
}
