import { createHash, createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

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

  async fetchTrades(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
    symbols?: string[],
    since?: Date,
  ): Promise<ExchangeTrade[]> {
    const path = '/api/v4/spot/my_trades';
    let query = 'limit=100';
    if (since) {
      query += `&from=${Math.floor(since.getTime() / 1000)}`;
    }

    const headers = buildHeaders(apiKey, apiSecret, 'GET', path, query);
    const res = await fetch(`${BASE_URL}${path}?${query}`, { headers });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Gate.io', res.status, text);
      }
      throw new Error(`Gate.io API error ${res.status}: ${text}`);
    }

    const data: Array<{
      id: string;
      currency_pair: string;
      side: string;
      amount: string;
      price: string;
      fee: string;
      fee_currency: string;
      create_time: string;
    }> = await res.json();

    return (data ?? []).map((t) => {
      const [baseAsset, quoteAsset] = t.currency_pair.split('_');
      const quantity = parseFloat(t.amount);
      const price = parseFloat(t.price);
      return {
        tradeId: t.id,
        symbol: t.currency_pair,
        baseAsset,
        quoteAsset,
        side: t.side as 'buy' | 'sell',
        quantity,
        price,
        quoteQty: quantity * price,
        fee: parseFloat(t.fee),
        feeAsset: t.fee_currency,
        executedAt: new Date(parseInt(t.create_time, 10) * 1000),
      };
    });
  }
}
