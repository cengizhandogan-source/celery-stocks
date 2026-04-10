import { isCryptoSymbol } from './formatters';

// CoinGecko CDN image URLs for supported crypto symbols
const CRYPTO_LOGO_MAP: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  XRP: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  ADA: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  DOGE: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  DOT: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
};

// Well-known ticker-to-domain mappings for common stocks & ETFs
const WELL_KNOWN_DOMAINS: Record<string, string> = {
  AAPL: 'apple.com', MSFT: 'microsoft.com', GOOGL: 'google.com', GOOG: 'google.com',
  AMZN: 'amazon.com', TSLA: 'tesla.com', NVDA: 'nvidia.com', META: 'meta.com',
  NFLX: 'netflix.com', DIS: 'disney.com', PYPL: 'paypal.com', ADBE: 'adobe.com',
  INTC: 'intel.com', AMD: 'amd.com', CRM: 'salesforce.com', ORCL: 'oracle.com',
  CSCO: 'cisco.com', IBM: 'ibm.com', QCOM: 'qualcomm.com', TXN: 'ti.com',
  AVGO: 'broadcom.com', SHOP: 'shopify.com', SQ: 'squareup.com', UBER: 'uber.com',
  LYFT: 'lyft.com', SNAP: 'snap.com', PINS: 'pinterest.com', SPOT: 'spotify.com',
  ZM: 'zoom.us', COIN: 'coinbase.com', HOOD: 'robinhood.com', PLTR: 'palantir.com',
  SNOW: 'snowflake.com', NET: 'cloudflare.com', DDOG: 'datadoghq.com',
  JPM: 'jpmorganchase.com', BAC: 'bankofamerica.com', WFC: 'wellsfargo.com',
  GS: 'goldmansachs.com', MS: 'morganstanley.com', C: 'citigroup.com',
  V: 'visa.com', MA: 'mastercard.com', AXP: 'americanexpress.com',
  JNJ: 'jnj.com', PFE: 'pfizer.com', UNH: 'unitedhealthgroup.com',
  ABBV: 'abbvie.com', MRK: 'merck.com', LLY: 'lilly.com', TMO: 'thermofisher.com',
  WMT: 'walmart.com', COST: 'costco.com', TGT: 'target.com', HD: 'homedepot.com',
  LOW: 'lowes.com', NKE: 'nike.com', SBUX: 'starbucks.com', MCD: 'mcdonalds.com',
  KO: 'coca-cola.com', PEP: 'pepsico.com', PG: 'pg.com', CL: 'colgate.com',
  XOM: 'exxonmobil.com', CVX: 'chevron.com', BA: 'boeing.com', CAT: 'cat.com',
  DE: 'deere.com', GE: 'ge.com', MMM: '3m.com', HON: 'honeywell.com',
  UPS: 'ups.com', FDX: 'fedex.com', T: 'att.com', VZ: 'verizon.com',
  TMUS: 't-mobile.com', CMCSA: 'comcast.com',
  // ETF issuers
  SPY: 'ssga.com', VOO: 'vanguard.com', IVV: 'ishares.com',
  QQQ: 'invesco.com', DIA: 'ssga.com', IWM: 'ishares.com',
  VTI: 'vanguard.com', VEA: 'vanguard.com', VWO: 'vanguard.com',
  BND: 'vanguard.com', AGG: 'ishares.com', GLD: 'spdrgoldshares.com',
  SLV: 'ishares.com', XLF: 'ssga.com', XLK: 'ssga.com', XLE: 'ssga.com',
  XLV: 'ssga.com', XLI: 'ssga.com', ARKK: 'ark-invest.com',
};

function extractDomain(websiteUrl: string): string | null {
  try {
    const url = new URL(websiteUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

export function getLogoUrl(symbol: string, website?: string): string | null {
  // Crypto: use static map
  if (isCryptoSymbol(symbol)) {
    const base = symbol.split('-')[0];
    return CRYPTO_LOGO_MAP[base] ?? null;
  }

  // Stocks/ETFs: try website domain first, then well-known map
  if (website) {
    const domain = extractDomain(website);
    if (domain) return faviconUrl(domain);
  }

  const knownDomain = WELL_KNOWN_DOMAINS[symbol];
  if (knownDomain) return faviconUrl(knownDomain);

  return null;
}
