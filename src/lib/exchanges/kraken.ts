import { createHash, createHmac } from 'crypto';
import { ExchangeAdapter, ExchangeBalance } from './types';

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
}
