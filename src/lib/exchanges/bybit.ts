import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance } from './types';

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
}
