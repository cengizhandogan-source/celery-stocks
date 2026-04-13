import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

const BASE_URL = 'https://api.crypto.com/exchange/v1';

function sign(
  method: string,
  id: number,
  apiKey: string,
  params: Record<string, unknown>,
  nonce: number,
  apiSecret: string,
): string {
  const paramsString = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join('');
  const message = `${method}${id}${apiKey}${paramsString}${nonce}`;
  return createHmac('sha256', apiSecret).update(message).digest('hex');
}

function buildRequest(apiKey: string, apiSecret: string) {
  const id = Date.now();
  const nonce = Date.now();
  const method = 'private/get-accounts';
  const params = {};
  const sig = sign(method, id, apiKey, params, nonce, apiSecret);

  return {
    id,
    method,
    api_key: apiKey,
    params,
    nonce,
    sig,
  };
}

interface CryptoComAccount {
  currency: string;
  available: number;
  order: number;
  stake: number;
}

interface CryptoComResponse {
  code: number;
  result: { data: CryptoComAccount[] };
}

export class CryptoComAdapter implements ExchangeAdapter {
  name = 'Crypto.com';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const body = buildRequest(apiKey, apiSecret);
      const res = await fetch(`${BASE_URL}/private/get-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) return false;
      const data: CryptoComResponse = await res.json();
      return data.code === 0;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const body = buildRequest(apiKey, apiSecret);
    const res = await fetch(`${BASE_URL}/private/get-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Crypto.com', res.status, text);
      }
      throw new Error(`Crypto.com API error ${res.status}: ${text}`);
    }

    const data: CryptoComResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(`Crypto.com API error code ${data.code}`);
    }

    const accounts: CryptoComAccount[] = data.result?.data ?? [];
    const balances: ExchangeBalance[] = accounts
      .map((a) => ({
        asset: a.currency,
        free: a.available,
        locked: a.order + a.stake,
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
    const id = Date.now();
    const nonce = Date.now();
    const method = 'private/get-trades';
    const params: Record<string, unknown> = { page_size: 100 };
    if (since) {
      params.start_ts = since.getTime();
    }
    const sig = sign(method, id, apiKey, params, nonce, apiSecret);

    const body = {
      id,
      method,
      api_key: apiKey,
      params,
      nonce,
      sig,
    };

    const res = await fetch(`${BASE_URL}/private/get-trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Crypto.com', res.status, text);
      }
      throw new Error(`Crypto.com API error ${res.status}: ${text}`);
    }

    const data: { code: number; result: { data: Array<{
      trade_id: string;
      instrument_name: string;
      side: string;
      traded_quantity: number;
      traded_price: number;
      fee: number;
      fee_instrument_name: string;
      create_time: number;
    }> } } = await res.json();

    if (data.code !== 0) {
      throw new Error(`Crypto.com API error code ${data.code}`);
    }

    return (data.result?.data ?? []).map((t) => {
      const [baseAsset, quoteAsset] = t.instrument_name.split('_');
      return {
        tradeId: t.trade_id,
        symbol: t.instrument_name,
        baseAsset,
        quoteAsset,
        side: t.side.toLowerCase() as 'buy' | 'sell',
        quantity: t.traded_quantity,
        price: t.traded_price,
        quoteQty: t.traded_quantity * t.traded_price,
        fee: t.fee,
        feeAsset: t.fee_instrument_name,
        executedAt: new Date(t.create_time),
      };
    });
  }
}
