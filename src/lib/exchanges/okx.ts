import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

const BASE_URL = 'https://www.okx.com';

function sign(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  apiSecret: string,
): string {
  const message = `${timestamp}${method}${path}${body}`;
  return createHmac('sha256', apiSecret).update(message).digest('base64');
}

function buildHeaders(
  apiKey: string,
  apiSecret: string,
  passphrase: string,
  method: string,
  path: string,
  body: string = '',
) {
  const timestamp = new Date().toISOString();
  const signature = sign(timestamp, method, path, body, apiSecret);
  return {
    'OK-ACCESS-KEY': apiKey,
    'OK-ACCESS-SIGN': signature,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

interface OkxDetail {
  ccy: string;
  availBal: string;
  frozenBal: string;
}

interface OkxResponse {
  code: string;
  data: Array<{ details: OkxDetail[] }>;
}

export class OkxAdapter implements ExchangeAdapter {
  name = 'OKX';

  async validateCredentials(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
  ): Promise<boolean> {
    try {
      const path = '/api/v5/account/balance';
      const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
      const res = await fetch(`${BASE_URL}${path}`, { headers });

      if (!res.ok) return false;
      const data: OkxResponse = await res.json();
      return data.code === '0';
    } catch {
      return false;
    }
  }

  async fetchBalances(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
  ): Promise<ExchangeBalance[]> {
    const path = '/api/v5/account/balance';
    const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('OKX', res.status, text);
      }
      throw new Error(`OKX API error ${res.status}: ${text}`);
    }

    const data: OkxResponse = await res.json();
    if (data.code !== '0') {
      throw new Error(`OKX API error code ${data.code}`);
    }

    const details: OkxDetail[] = data.data?.[0]?.details ?? [];
    const balances: ExchangeBalance[] = details
      .map((d) => ({
        asset: d.ccy,
        free: parseFloat(d.availBal),
        locked: parseFloat(d.frozenBal),
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
    let path = '/api/v5/trade/fills-history?instType=SPOT&limit=100';
    if (since) {
      path += `&begin=${since.getTime()}`;
    }

    const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('OKX', res.status, text);
      }
      throw new Error(`OKX API error ${res.status}: ${text}`);
    }

    const data: { code: string; data: Array<{
      tradeId: string;
      instId: string;
      side: string;
      fillSz: string;
      fillPx: string;
      fee: string;
      feeCcy: string;
      ts: string;
    }> } = await res.json();

    if (data.code !== '0') {
      throw new Error(`OKX API error code ${data.code}`);
    }

    return (data.data ?? []).map((t) => {
      const [baseAsset, quoteAsset] = t.instId.split('-');
      const quantity = parseFloat(t.fillSz);
      const price = parseFloat(t.fillPx);
      return {
        tradeId: t.tradeId,
        symbol: t.instId,
        baseAsset,
        quoteAsset,
        side: t.side as 'buy' | 'sell',
        quantity,
        price,
        quoteQty: quantity * price,
        fee: Math.abs(parseFloat(t.fee)),
        feeAsset: t.feeCcy,
        executedAt: new Date(parseInt(t.ts, 10)),
      };
    });
  }
}
