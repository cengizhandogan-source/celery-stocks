'use client';

import { AreaChart, Area, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts';
import { useCandles } from '@/hooks/useCandles';
import { useQuote } from '@/stores/quoteStore';
import { formatPrice, formatPercent } from '@/lib/formatters';
import TickerLogo from '@/components/ui/TickerLogo';

export default function MiniStockChartInner({
  symbol,
  compact = false,
}: {
  symbol: string;
  compact?: boolean;
}) {
  const { candles, loading: candlesLoading } = useCandles(symbol, '60m', '5d');
  const quote = useQuote(symbol);

  if (candlesLoading) {
    return <div className="h-[100px] rounded bg-hover/50 animate-pulse" />;
  }

  if (!candles.length) return null;

  const chartData = candles.map((c) => ({ time: c.time, close: c.close }));
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;

  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes, first);
  const max = Math.max(...closes, first);
  const range = max - min || max * 0.01;
  const padding = range * 0.1;
  const domain: [number, number] = [min - padding, max + padding];

  const chartIsUp = last >= first;
  const color = chartIsUp ? '#00FFA3' : '#FF4D4F';
  const isUp = quote ? quote.change >= 0 : chartIsUp;

  const price = quote?.price ?? last;
  const changePct = quote?.changePercent ?? ((last - first) / first) * 100;

  if (compact) {
    return (
      <div className="w-full h-[60px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <YAxis domain={domain} hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                return (
                  <div className="text-xxs font-mono font-medium text-text-primary bg-base border border-border rounded px-1.5 py-0.5 shadow-lg">
                    {formatPrice(payload[0].value as number)}
                  </div>
                );
              }}
              cursor={{ stroke: '#52525B', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <ReferenceLine y={first} stroke="#52525B" strokeDasharray="3 3" strokeWidth={1} />
            <Area type="monotone" dataKey="close" stroke={color} fill="transparent" strokeWidth={1.5} dot={{ r: 1.5, fill: color, strokeWidth: 0 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-base/80 overflow-hidden px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        {/* Left: info */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <TickerLogo symbol={symbol} size={28} />
            <span className="text-xs font-mono font-medium text-text-secondary tracking-wide">{symbol}</span>
          </div>
          <span className="text-2xl font-mono font-bold text-text-primary leading-none mb-1.5">
            {formatPrice(price)}
          </span>
          <span className={`text-xxs font-mono font-medium ${isUp ? 'text-profit' : 'text-loss'}`}>
            {formatPercent(changePct)} today
          </span>
        </div>

        {/* Right: sparkline */}
        <div className="w-[45%] h-[60px] shrink-0 self-center">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <YAxis domain={domain} hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  return (
                    <div className="text-xxs font-mono font-medium text-text-primary bg-base border border-border rounded px-1.5 py-0.5 shadow-lg">
                      {formatPrice(payload[0].value as number)}
                    </div>
                  );
                }}
                cursor={{ stroke: '#52525B', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <ReferenceLine
                y={first}
                stroke="#52525B"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={color}
                fill="transparent"
                strokeWidth={1.5}
                dot={{ r: 1.5, fill: color, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
