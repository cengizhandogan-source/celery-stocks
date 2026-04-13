import { createHash, createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

const BASE_URL = 'https://api.kraken.com';

const SYMBOL_MAP: Record<string, string> = {
  XXBT: 'BTC',
  XETH: 'ETH',
  ZUSD: 'USD',
  XXRP: 'XRP',
  XLTC: 'LTC',
  XXLM: 'XLM',
  XXDG: 'DOGE',
  ZEUR: 'EUR',
  ZGBP: 'GBP',
  ZJPY: 'JPY',
  ZCAD: 'CAD',
  ZAUD: 'AUD',
};

function normalizeAsset(asset: string): string {
  if (SYMBOL_MAP[asset]) return SYMBOL_MAP[asset];
  if (asset.length === 4 && (asset.startsWith('X') || asset.startsWith('Z'))) {
    return asset.slice(1);
  }
  return asset;
}

function sign(path: string, body: string, nonce: number, apiSecret: string): string {
  const sha256 = createHash('sha256')
    .update(nonce.toString() + body)
    .digest();
  const secret = Buffer.from(apiSecret, 'base64');
  const hmac = createHmac('sha512', secret)
    .update(Buffer.concat([Buffer.from(path), sha256]))
    .digest('base64');
  return hmac;
}

export class KrakenAdapter implements ExchangeAdapter {
  name = 'Kraken';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const path = '/0/private/Balance';
      const nonce = Date.now() * 1000;
      const body = `nonce=${nonce}`;
      const signature = sign(path, body, nonce, apiSecret);

      const res = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          'API-Key': apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!res.ok) return false;
      const data = await res.json();
      return !data.error || data.error.length === 0;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const path = '/0/private/Balance';
    const nonce = Date.now() * 1000;
    const body = `nonce=${nonce}`;
    const signature = sign(path, body, nonce, apiSecret);

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Kraken', res.status, text);
      }
      throw new Error(`Kraken API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const result: Record<string, string> = data.result ?? {};
    const balances: ExchangeBalance[] = Object.entries(result)
      .map(([asset, amount]) => ({
        asset: normalizeAsset(asset),
        free: parseFloat(amount),
        locked: 0,
      }))
      .filter((b) => b.free !== 0);

    return balances;
  }

  async fetchTrades(
    apiKey: string,
    apiSecret: string,
    _passphrase?: string,
    symbols?: string[],
    since?: Date,
  ): Promise<ExchangeTrade[]> {
    const KRAKEN_QUOTES = ['ZUSD', 'ZEUR', 'ZGBP', 'USDT', 'USDC', 'XBT', 'USD', 'EUR'];

    function splitPair(pair: string): [string, string] {
      for (const q of KRAKEN_QUOTES) {
        if (pair.endsWith(q)) {
          return [normalizeAsset(pair.slice(0, -q.length)), normalizeAsset(q)];
        }
      }
      const mid = Math.floor(pair.length / 2);
      return [normalizeAsset(pair.slice(0, mid)), normalizeAsset(pair.slice(mid))];
    }

    const path = '/0/private/TradesHistory';
    const nonce = Date.now() * 1000;
    let body = `nonce=${nonce}`;
    if (since) body += `&start=${Math.floor(since.getTime() / 1000)}`;
    const signature = sign(path, body, nonce, apiSecret);

    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'API-Key': apiKey,
        'API-Sign': signature,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Kraken', res.status, text);
      }
      throw new Error(`Kraken API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const rawTrades: Record<
      string,
      { pair: string; type: string; vol: string; price: string; fee: string; cost: string; time: number }
    > = data.result?.trades ?? {};

    const trades: ExchangeTrade[] = Object.entries(rawTrades).map(([tradeId, t]) => {
      const [baseAsset, quoteAsset] = splitPair(t.pair);
      return {
        tradeId,
        symbol: t.pair,
        baseAsset,
        quoteAsset,
        side: t.type as 'buy' | 'sell',
        quantity: parseFloat(t.vol),
        price: parseFloat(t.price),
        quoteQty: parseFloat(t.cost),
        fee: parseFloat(t.fee),
        feeAsset: quoteAsset,
        executedAt: new Date(t.time * 1000),
      };
    });

    return trades;
  }
}
