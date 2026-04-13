import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError, ExchangeTrade } from './types';

const BASE_URL = 'https://api.bybit.com';
const RECV_WINDOW = '5000';

function sign(payload: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(payload).digest('hex');
}

function buildHeaders(apiKey: string, apiSecret: string, queryString: string) {
  const timestamp = Date.now().toString();
  const payload = timestamp + apiKey + RECV_WINDOW + queryString;
  const signature = sign(payload, apiSecret);

  return {
    'X-BAPI-API-KEY': apiKey,
    'X-BAPI-TIMESTAMP': timestamp,
    'X-BAPI-SIGN': signature,
    'X-BAPI-RECV-WINDOW': RECV_WINDOW,
  };
}

export class BybitAdapter implements ExchangeAdapter {
  name = 'Bybit';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const queryString = 'accountType=UNIFIED';
      const headers = buildHeaders(apiKey, apiSecret, queryString);
      const res = await fetch(`${BASE_URL}/v5/account/wallet-balance?${queryString}`, {
        headers,
      });

      if (!res.ok) return false;

      const data = await res.json();
      return data.retCode === 0;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const queryString = 'accountType=UNIFIED';
    const headers = buildHeaders(apiKey, apiSecret, queryString);
    const res = await fetch(`${BASE_URL}/v5/account/wallet-balance?${queryString}`, {
      headers,
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Bybit', res.status, body);
      }
      throw new Error(`Bybit API error ${res.status}: ${body}`);
    }

    const data = await res.json();

    if (data.retCode !== 0) {
      throw new Error(`Bybit API retCode ${data.retCode}: ${data.retMsg}`);
    }

    const coins = data.result?.list?.[0]?.coin ?? [];
    const balances: ExchangeBalance[] = coins
      .map((c: { coin: string; free: string; locked: string }) => ({
        asset: c.coin,
        free: parseFloat(c.free),
        locked: parseFloat(c.locked),
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
    const BYBIT_QUOTES = ['USDT', 'USDC', 'USD', 'BTC', 'ETH', 'EUR', 'DAI'];

    function splitSymbol(sym: string): [string, string] {
      for (const q of BYBIT_QUOTES) {
        if (sym.endsWith(q) && sym.length > q.length) {
          return [sym.slice(0, -q.length), q];
        }
      }
      return [sym, 'USDT'];
    }

    let queryString = 'category=spot&limit=100';
    if (since) queryString += `&startTime=${since.getTime()}`;

    const headers = buildHeaders(apiKey, apiSecret, queryString);
    const res = await fetch(`${BASE_URL}/v5/execution/list?${queryString}`, { headers });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('Bybit', res.status, body);
      }
      throw new Error(`Bybit API error ${res.status}: ${body}`);
    }

    const data = await res.json();

    if (data.retCode !== 0) {
      throw new Error(`Bybit API retCode ${data.retCode}: ${data.retMsg}`);
    }

    const list: {
      execId: string;
      symbol: string;
      side: string;
      execQty: string;
      execPrice: string;
      execFee: string;
      feeCurrency: string;
      execTime: string;
    }[] = data.result?.list ?? [];

    const trades: ExchangeTrade[] = list.map((t) => {
      const [baseAsset, quoteAsset] = splitSymbol(t.symbol);
      const quantity = parseFloat(t.execQty);
      const price = parseFloat(t.execPrice);

      return {
        tradeId: t.execId,
        symbol: t.symbol,
        baseAsset,
        quoteAsset,
        side: (t.side as string).toLowerCase() as 'buy' | 'sell',
        quantity,
        price,
        quoteQty: quantity * price,
        fee: parseFloat(t.execFee),
        feeAsset: t.feeCurrency,
        executedAt: new Date(parseInt(t.execTime, 10)),
      };
    });

    return trades;
  }
}
