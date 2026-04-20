import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

const BASE_URL = 'https://api.binance.com';

function sign(queryString: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

function buildSignedUrl(path: string, apiSecret: string): string {
  const queryString = `timestamp=${Date.now()}&recvWindow=5000`;
  const signature = sign(queryString, apiSecret);
  return `${BASE_URL}${path}?${queryString}&signature=${signature}`;
}

export class BinanceAdapter implements ExchangeAdapter {
  name = 'Binance';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const url = buildSignedUrl('/api/v3/account', apiSecret);
      const res = await fetch(url, {
        headers: { 'X-MBX-APIKEY': apiKey },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const url = buildSignedUrl('/api/v3/account', apiSecret);
    const res = await fetch(url, {
      headers: { 'X-MBX-APIKEY': apiKey },
    });

    if (!res.ok) {
      const body = await res.text();
      // 451 = geo-block from this server region; will never resolve via retry.
      if (res.status === 401 || res.status === 403 || res.status === 451) {
        throw new ExchangeAuthError('Binance', res.status, body);
      }
      throw new Error(`Binance API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    const balances: ExchangeBalance[] = (data.balances ?? [])
      .map((b: { asset: string; free: string; locked: string }) => ({
        asset: b.asset,
        free: parseFloat(b.free),
        locked: parseFloat(b.locked),
      }))
      .filter((b: ExchangeBalance) => b.free !== 0 || b.locked !== 0);

    return balances;
  }

  async fetchTrades(
    apiKey: string,
    apiSecret: string,
    _passphrase?: string,
    symbols?: string[],
    since?: Date,
  ): Promise<ExchangeTrade[]> {
    const quoteAssets = ['USDT', 'USDC', 'BTC'];
    const pairs: { base: string; quote: string; symbol: string }[] = [];

    for (const base of symbols ?? []) {
      for (const quote of quoteAssets) {
        if (base === quote) continue;
        pairs.push({ base, quote, symbol: `${base}${quote}` });
        if (pairs.length >= 20) break;
      }
      if (pairs.length >= 20) break;
    }

    const trades: ExchangeTrade[] = [];

    for (const pair of pairs) {
      try {
        const qs =
          `symbol=${pair.symbol}&limit=100` +
          (since ? `&startTime=${since.getTime()}` : '') +
          `&timestamp=${Date.now()}&recvWindow=5000`;
        const signature = sign(qs, apiSecret);
        const url = `${BASE_URL}/api/v3/myTrades?${qs}&signature=${signature}`;

        const res = await fetch(url, {
          headers: { 'X-MBX-APIKEY': apiKey },
        });

        if (!res.ok) continue;

        const data: {
          id: number;
          symbol: string;
          isBuyer: boolean;
          qty: string;
          price: string;
          quoteQty: string;
          commission: string;
          commissionAsset: string;
          time: number;
        }[] = await res.json();

        for (const t of data) {
          trades.push({
            tradeId: String(t.id),
            symbol: t.symbol,
            baseAsset: pair.base,
            quoteAsset: pair.quote,
            side: t.isBuyer ? 'buy' : 'sell',
            quantity: parseFloat(t.qty),
            price: parseFloat(t.price),
            quoteQty: parseFloat(t.quoteQty),
            fee: parseFloat(t.commission),
            feeAsset: t.commissionAsset,
            executedAt: new Date(t.time),
          });
        }
      } catch {
        continue;
      }
    }

    return trades;
  }
}
