/* eslint-disable @typescript-eslint/no-explicit-any */
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const cache = new Map<string, { data: unknown; expiry: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

export async function getQuote(symbol: string) {
  const key = `quote:${symbol}`;
  const cached = getCached(key);
  if (cached) return cached;

  const result: any = await yahooFinance.quote(symbol);
  const quote = {
    symbol: result.symbol as string,
    price: (result.regularMarketPrice ?? 0) as number,
    change: (result.regularMarketChange ?? 0) as number,
    changePercent: (result.regularMarketChangePercent ?? 0) as number,
    high: (result.regularMarketDayHigh ?? 0) as number,
    low: (result.regularMarketDayLow ?? 0) as number,
    open: (result.regularMarketOpen ?? 0) as number,
    previousClose: (result.regularMarketPreviousClose ?? 0) as number,
    volume: (result.regularMarketVolume ?? 0) as number,
    marketCap: result.marketCap as number | undefined,
    timestamp: Date.now(),
  };
  setCache(key, quote, 30_000);
  return quote;
}

export async function getQuotes(symbols: string[]) {
  const results = await Promise.allSettled(symbols.map(s => getQuote(s)));
  return results
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getQuote>>> => r.status === 'fulfilled')
    .map(r => r.value);
}

export async function getCandles(symbol: string, interval: string, range: string) {
  const key = `candles:${symbol}:${interval}:${range}`;
  const cached = getCached(key);
  if (cached) return cached;

  const result: any = await yahooFinance.chart(symbol, {
    period1: getStartDate(range),
    interval: interval as any,
  });

  const candles = (result.quotes || []).map((q: any) => ({
    time: Math.floor(new Date(q.date).getTime() / 1000),
    open: q.open ?? 0,
    high: q.high ?? 0,
    low: q.low ?? 0,
    close: q.close ?? 0,
    volume: q.volume ?? 0,
  }));

  setCache(key, candles, 300_000);
  return candles;
}

export async function searchTickers(query: string) {
  const key = `search:${query}`;
  const cached = getCached(key);
  if (cached) return cached;

  const result: any = await yahooFinance.search(query);
  const results = (result.quotes || [])
    .filter((q: any) => q.symbol && q.shortname)
    .slice(0, 10)
    .map((q: any) => ({
      symbol: q.symbol as string,
      name: (q.shortname || q.longname || q.symbol) as string,
      exchange: (q.exchange || '') as string,
      type: (q.quoteType || 'EQUITY') as string,
    }));

  setCache(key, results, 600_000);
  return results;
}

export async function getProfile(symbol: string) {
  const key = `profile:${symbol}`;
  const cached = getCached(key);
  if (cached) return cached;

  const [quote, summary]: [any, any] = await Promise.all([
    yahooFinance.quote(symbol),
    yahooFinance.quoteSummary(symbol, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics'] }),
  ]);

  const profile = {
    symbol,
    name: quote.shortName || quote.longName || symbol,
    exchange: quote.fullExchangeName || quote.exchange || '',
    industry: summary.assetProfile?.industry || '',
    sector: summary.assetProfile?.sector || '',
    description: summary.assetProfile?.longBusinessSummary || '',
    website: summary.assetProfile?.website || '',
    country: summary.assetProfile?.country || '',
    marketCap: quote.marketCap || 0,
    sharesOutstanding: quote.sharesOutstanding || 0,
    employees: summary.assetProfile?.fullTimeEmployees || undefined,
  };

  setCache(key, profile, 3600_000);
  return profile;
}

export async function getKeyStats(symbol: string) {
  const key = `stats:${symbol}`;
  const cached = getCached(key);
  if (cached) return cached;

  const summary: any = await yahooFinance.quoteSummary(symbol, {
    modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData'],
  });

  const sd = summary.summaryDetail || {};
  const ks = summary.defaultKeyStatistics || {};
  const fd = summary.financialData || {};

  const stats = {
    symbol,
    pe: sd.trailingPE,
    forwardPe: sd.forwardPE || ks.forwardPE,
    eps: ks.trailingEps,
    marketCap: sd.marketCap,
    fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: sd.fiftyTwoWeekLow,
    dividendYield: sd.dividendYield,
    beta: sd.beta || ks.beta,
    avgVolume: sd.averageVolume,
    priceToBook: sd.priceToBook || ks.priceToBook,
    priceToSales: ks.priceToSalesTrailing12Months,
    profitMargin: fd.profitMargins,
    revenueGrowth: fd.revenueGrowth,
  };

  setCache(key, stats, 3600_000);
  return stats;
}

export async function getNews(query: string) {
  const key = `news:${query}`;
  const cached = getCached(key);
  if (cached) return cached;

  const result: any = await yahooFinance.search(query, { newsCount: 20 });
  const articles = (result.news || []).map((n: any, i: number) => ({
    id: `${query}-${i}-${Date.now()}`,
    title: n.title || '',
    description: '',
    source: n.publisher || '',
    url: n.link || '',
    publishedAt: n.providerPublishTime
      ? new Date(n.providerPublishTime * 1000).toISOString()
      : new Date().toISOString(),
    image: n.thumbnail?.resolutions?.[0]?.url || undefined,
    tickers: n.relatedTickers || [],
  }));

  setCache(key, articles, 300_000);
  return articles;
}

export async function getScreener(scrId: string) {
  const key = `screener:${scrId}`;
  const cached = getCached(key);
  if (cached) return cached;

  const result: any = await yahooFinance.screener({ scrIds: scrId as any, count: 25 });
  const quotes = (result.quotes || []).map((q: any) => ({
    symbol: (q.symbol || '') as string,
    name: (q.shortName || q.longName || q.symbol || '') as string,
    price: (q.regularMarketPrice ?? 0) as number,
    change: (q.regularMarketChange ?? 0) as number,
    changePercent: (q.regularMarketChangePercent ?? 0) as number,
    volume: (q.regularMarketVolume ?? 0) as number,
    marketCap: q.marketCap as number | undefined,
  }));

  setCache(key, quotes, 60_000);
  return quotes;
}

export async function getFinancials(symbol: string) {
  const key = `financials:${symbol}`;
  const cached = getCached(key);
  if (cached) return cached;

  const summary: any = await yahooFinance.quoteSummary(symbol, {
    modules: [
      'incomeStatementHistory',
      'incomeStatementHistoryQuarterly',
      'balanceSheetHistory',
      'balanceSheetHistoryQuarterly',
      'cashflowStatementHistory',
      'cashflowStatementHistoryQuarterly',
    ],
  });

  const mapStatements = (stmts: any[]) =>
    (stmts || []).map((s: any) => ({
      date: s.endDate ? new Date(s.endDate).toISOString().split('T')[0] : '',
      ...Object.fromEntries(
        Object.entries(s).filter(([k]) => k !== 'endDate' && k !== 'maxAge')
          .map(([k, v]) => [k, typeof v === 'number' ? v : null])
      ),
    }));

  const financials = {
    income: {
      annual: mapStatements(summary.incomeStatementHistory?.incomeStatementHistory),
      quarterly: mapStatements(summary.incomeStatementHistoryQuarterly?.incomeStatementHistory),
    },
    balance: {
      annual: mapStatements(summary.balanceSheetHistory?.balanceSheetStatements),
      quarterly: mapStatements(summary.balanceSheetHistoryQuarterly?.balanceSheetStatements),
    },
    cashflow: {
      annual: mapStatements(summary.cashflowStatementHistory?.cashflowStatements),
      quarterly: mapStatements(summary.cashflowStatementHistoryQuarterly?.cashflowStatements),
    },
  };

  setCache(key, financials, 3600_000);
  return financials;
}

export async function getHolders(symbol: string) {
  const key = `holders:${symbol}`;
  const cached = getCached(key);
  if (cached) return cached;

  const summary: any = await yahooFinance.quoteSummary(symbol, {
    modules: ['institutionOwnership', 'majorHoldersBreakdown'],
  });

  const io = summary.institutionOwnership || {};
  const mhb = summary.majorHoldersBreakdown || {};

  const holders = {
    holders: (io.ownershipList || []).map((h: any) => ({
      organization: (h.organization || '') as string,
      pctHeld: (h.pctHeld ?? 0) as number,
      shares: (h.position ?? 0) as number,
      value: (h.value ?? 0) as number,
      pctChange: h.pctChange as number | undefined,
      reportDate: h.reportDate ? new Date(h.reportDate).toISOString().split('T')[0] : undefined,
    })),
    insidersPercent: mhb.insidersPercentHeld as number | undefined,
    institutionsPercent: mhb.institutionsPercentHeld as number | undefined,
    institutionsCount: mhb.institutionsCount as number | undefined,
  };

  setCache(key, holders, 3600_000);
  return holders;
}

export async function getFilings(symbol: string) {
  const key = `filings:${symbol}`;
  const cached = getCached(key);
  if (cached) return cached;

  const summary: any = await yahooFinance.quoteSummary(symbol, {
    modules: ['secFilings'],
  });

  const filings = (summary.secFilings?.filings || []).map((f: any) => ({
    date: f.date ? new Date(f.date).toISOString().split('T')[0] : '',
    type: (f.type || '') as string,
    title: (f.title || '') as string,
    edgarUrl: (f.edgarUrl || '') as string,
  }));

  setCache(key, filings, 3600_000);
  return filings;
}

function getStartDate(range: string): string {
  const now = new Date();
  const days: Record<string, number> = {
    '1d': 1, '1w': 7, '1m': 30, '3m': 90, '1y': 365, '5y': 1825,
  };
  const d = days[range] || 30;
  now.setDate(now.getDate() - d);
  return now.toISOString().split('T')[0];
}
