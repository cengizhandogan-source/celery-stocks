import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

const BASE_URL = 'https://api.bitget.com';

function signMessage(message: string, apiSecret: string): string {
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
  const message = `${timestamp}${method}${path}${body}`;
  const signature = signMessage(message, apiSecret);

  return {
    'ACCESS-KEY': apiKey,
    'ACCESS-SIGN': signature,
    'ACCESS-TIMESTAMP': timestamp,
    'ACCESS-PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

interface BitgetAsset {
  coin: string;
  available: string;
  frozen: string;
}

interface BitgetResponse {
  code: string;
  data: BitgetAsset[];
}

export class BitgetAdapter implements ExchangeAdapter {
  name = 'Bitget';

  async validateCredentials(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
  ): Promise<boolean> {
    try {
      const path = '/api/v2/spot/account/assets';
      const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
      const res = await fetch(`${BASE_URL}${path}`, { headers });
      const data: BitgetResponse = await res.json();
      return data.code === '00000';
    } catch {
      return false;
    }
  }

  async fetchBalances(
    apiKey: string,
    apiSecret: string,
    passphrase?: string,
  ): Promise<ExchangeBalance[]> {
    const path = '/api/v2/spot/account/assets';
    const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Bitget', res.status, body);
      }
      throw new Error(`Bitget API error ${res.status}: ${body}`);
    }

    const data: BitgetResponse = await res.json();

    if (data.code !== '00000') {
      throw new Error(`Bitget API error code ${data.code}`);
    }

    const balances: ExchangeBalance[] = (data.data ?? [])
      .map((a) => ({
        asset: a.coin,
        free: parseFloat(a.available),
        locked: parseFloat(a.frozen),
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
    let path = '/api/v2/spot/trade/fills?limit=100';
    if (since) {
      path += `&startTime=${since.getTime()}`;
    }

    const headers = buildHeaders(apiKey, apiSecret, passphrase ?? '', 'GET', path);
    const res = await fetch(`${BASE_URL}${path}`, { headers });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Bitget', res.status, body);
      }
      throw new Error(`Bitget API error ${res.status}: ${body}`);
    }

    const data: { code: string; data: Array<{
      tradeId: string;
      symbol: string;
      side: string;
      size: string;
      priceAvg: string;
      fee: string;
      feeCcy: string;
      cTime: string;
    }> } = await res.json();

    if (data.code !== '00000') {
      throw new Error(`Bitget API error code ${data.code}`);
    }

    const BITGET_QUOTES = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR'];
    function splitSymbol(sym: string): [string, string] {
      for (const q of BITGET_QUOTES) {
        if (sym.endsWith(q) && sym.length > q.length) {
          return [sym.slice(0, -q.length), q];
        }
      }
      return [sym, 'USDT'];
    }

    return (data.data ?? []).map((t) => {
      const [baseAsset, quoteAsset] = splitSymbol(t.symbol);
      const quantity = parseFloat(t.size);
      const price = parseFloat(t.priceAvg);
      return {
        tradeId: t.tradeId,
        symbol: t.symbol,
        baseAsset,
        quoteAsset,
        side: t.side.toLowerCase() as 'buy' | 'sell',
        quantity,
        price,
        quoteQty: quantity * price,
        fee: parseFloat(t.fee),
        feeAsset: t.feeCcy,
        executedAt: new Date(parseInt(t.cTime, 10)),
      };
    });
  }
}
