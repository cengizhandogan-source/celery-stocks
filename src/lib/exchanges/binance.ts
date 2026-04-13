import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance } from './types';

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
}
