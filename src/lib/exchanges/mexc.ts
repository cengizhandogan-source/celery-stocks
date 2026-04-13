import { createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance, ExchangeAuthError } from './types';

const BASE_URL = 'https://api.mexc.com';

function sign(queryString: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

function buildSignedUrl(path: string, apiSecret: string): string {
  const queryString = `timestamp=${Date.now()}&recvWindow=5000`;
  const signature = sign(queryString, apiSecret);
  return `${BASE_URL}${path}?${queryString}&signature=${signature}`;
}

export class MexcAdapter implements ExchangeAdapter {
  name = 'MEXC';

  async validateCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const url = buildSignedUrl('/api/v3/account', apiSecret);
      const res = await fetch(url, {
        headers: { 'X-MEXC-APIKEY': apiKey },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async fetchBalances(apiKey: string, apiSecret: string): Promise<ExchangeBalance[]> {
    const url = buildSignedUrl('/api/v3/account', apiSecret);
    const res = await fetch(url, {
      headers: { 'X-MEXC-APIKEY': apiKey },
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new ExchangeAuthError('MEXC', res.status, body);
      }
      throw new Error(`MEXC API error ${res.status}: ${body}`);
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
