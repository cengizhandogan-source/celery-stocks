export function formatPrice(price: number): string {
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}`;
}

export function formatPercent(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(1)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
}

export function formatMarketCap(cap: number): string {
  const abs = Math.abs(cap);
  const sign = cap < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) return `${sign}$${(abs / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function isCryptoSymbol(symbol: string): boolean {
  return symbol.endsWith('-USD') || symbol.endsWith('-EUR') || symbol.endsWith('-GBP');
}

export function formatCryptoPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  if (price >= 0.001) return price.toFixed(6);
  return price.toFixed(8);
}

export function formatAssetPrice(price: number, symbol: string): string {
  return isCryptoSymbol(symbol) ? formatCryptoPrice(price) : formatPrice(price);
}

export function formatNetWorth(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  if (usd >= 1) return `$${Math.round(usd)}`;
  return '$0';
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export type MarketStatus = 'open' | 'extended' | 'closed';
export type Exchange = 'NYSE' | 'NASDAQ' | 'EURO' | 'JPX' | 'CRYPTO';

type Session = { start: number; end: number; status: MarketStatus; label: string };

const US_SCHEDULE = {
  timezone: 'America/New_York',
  sessions: [
    { start: 240, end: 570, status: 'extended' as const, label: 'Pre-market' },
    { start: 570, end: 960, status: 'open' as const, label: 'Opens' },
    { start: 960, end: 1200, status: 'extended' as const, label: 'After-hours' },
  ],
};

const CRYPTO_SCHEDULE = {
  timezone: 'UTC',
  sessions: [
    { start: 0, end: 1440, status: 'open' as const, label: '24/7' },
  ],
};

// NYSE/NASDAQ holidays 2025–2026
const US_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
  '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
]);

// Euronext holidays 2025–2026
const EU_HOLIDAYS = new Set([
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-01', '2025-12-25', '2025-12-26',
  '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01', '2026-12-25', '2026-12-26',
]);

// JPX (Tokyo) holidays 2025–2026
const JPX_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-13', '2025-02-11', '2025-02-24',
  '2025-03-20', '2025-04-29', '2025-05-05', '2025-05-06', '2025-07-21', '2025-08-11',
  '2025-09-15', '2025-09-23', '2025-10-13', '2025-11-03', '2025-11-24', '2025-12-31',
  '2026-01-01', '2026-01-02', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-04', '2026-05-05', '2026-05-06', '2026-07-20', '2026-08-11',
  '2026-09-21', '2026-09-23', '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-31',
]);

const EXCHANGE_HOLIDAYS: Record<Exclude<Exchange, 'CRYPTO'>, Set<string>> = {
  NYSE: US_HOLIDAYS, NASDAQ: US_HOLIDAYS, EURO: EU_HOLIDAYS, JPX: JPX_HOLIDAYS,
};

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isTradingDay(exchange: Exchange, localDate: Date): boolean {
  const day = localDate.getDay();
  if (day === 0 || day === 6) return false;
  if (exchange === 'CRYPTO') return true;
  return !EXCHANGE_HOLIDAYS[exchange].has(dateKey(localDate));
}

const MARKET_SCHEDULES: Record<Exchange, { timezone: string; sessions: Session[] }> = {
  NYSE: US_SCHEDULE,
  NASDAQ: US_SCHEDULE,
  CRYPTO: CRYPTO_SCHEDULE,
  EURO: {
    timezone: 'Europe/Paris',
    sessions: [
      { start: 435, end: 540, status: 'extended', label: 'Pre-market' },
      { start: 540, end: 1050, status: 'open', label: 'Opens' },
      { start: 1050, end: 1060, status: 'extended', label: 'After-hours' },
    ],
  },
  JPX: {
    timezone: 'Asia/Tokyo',
    sessions: [
      { start: 540, end: 690, status: 'open', label: 'Opens' },
      { start: 690, end: 750, status: 'extended', label: 'Lunch break' },
      { start: 750, end: 900, status: 'open', label: 'Reopens' },
    ],
  },
};

export function getMarketStatus(exchange: Exchange): MarketStatus {
  if (exchange === 'CRYPTO') return 'open';
  const schedule = MARKET_SCHEDULES[exchange];
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone }));
  if (!isTradingDay(exchange, local)) return 'closed';
  const totalMinutes = local.getHours() * 60 + local.getMinutes();
  for (const session of schedule.sessions) {
    if (totalMinutes >= session.start && totalMinutes < session.end) return session.status;
  }
  return 'closed';
}

export function getMarketStatusColor(status: MarketStatus): { dot: string; text: string } {
  switch (status) {
    case 'open': return { dot: 'bg-up', text: 'text-up' };
    case 'extended': return { dot: 'bg-amber', text: 'text-amber' };
    case 'closed': return { dot: 'bg-down', text: 'text-down' };
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

export function getNextMarketEvent(exchange: Exchange): string {
  if (exchange === 'CRYPTO') return '24/7';
  const schedule = MARKET_SCHEDULES[exchange];
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone }));
  const totalMinutes = local.getHours() * 60 + local.getMinutes();
  const { sessions } = schedule;

  if (isTradingDay(exchange, local)) {
    // In a session? Countdown to its end
    for (let i = 0; i < sessions.length; i++) {
      if (totalMinutes >= sessions[i].start && totalMinutes < sessions[i].end) {
        const minutesLeft = sessions[i].end - totalMinutes;
        const nextLabel = sessions[i + 1]?.label ?? 'Closes';
        return `${nextLabel} in ${formatDuration(minutesLeft)}`;
      }
    }

    // Before a session today? Countdown to its start
    for (const session of sessions) {
      if (totalMinutes < session.start) {
        return `${session.label} in ${formatDuration(session.start - totalMinutes)}`;
      }
    }
  }

  // Non-trading day or after all sessions — find next trading day
  const d = new Date(local);
  for (let offset = 1; offset <= 10; offset++) {
    d.setDate(d.getDate() + 1);
    if (isTradingDay(exchange, d)) {
      const minutesUntil = (1440 - totalMinutes) + (offset - 1) * 1440 + sessions[0].start;
      return `${sessions[0].label} in ${formatDuration(minutesUntil)}`;
    }
  }
  return `${sessions[0].label} in —`;
}
