'use client';

import { TIMEFRAMES } from '@/lib/constants';
import { formatAssetPrice, formatChange, formatPercent } from '@/lib/formatters';
import TickerLogo from '@/components/ui/TickerLogo';

interface ChartControlsProps {
  symbol: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  timeframe: number;
  chartType: 'candlestick' | 'line' | 'area';
  onTimeframeChange: (index: number) => void;
  onChartTypeChange: (type: 'candlestick' | 'line' | 'area') => void;
}

export default function ChartControls({
  symbol,
  price,
  change,
  changePercent,
  timeframe,
  chartType,
  onTimeframeChange,
  onChartTypeChange,
}: ChartControlsProps) {
  const changeColor = (change ?? 0) > 0 ? 'text-up' : (change ?? 0) < 0 ? 'text-down' : 'text-text-secondary';
  const chartTypes: { key: 'candlestick' | 'line' | 'area'; label: string }[] = [
    { key: 'candlestick', label: 'C' },
    { key: 'line', label: 'L' },
    { key: 'area', label: 'A' },
  ];

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-terminal-border bg-terminal-panel-header shrink-0">
      {/* Symbol + price */}
      <TickerLogo symbol={symbol} size={16} />
      <span className="text-sm text-text-primary font-mono font-medium mr-1">{symbol}</span>
      {price !== null && (
        <>
          <span className="text-sm font-mono text-text-primary">{formatAssetPrice(price, symbol)}</span>
          <span className={`text-xxs font-mono ${changeColor} ml-1`}>
            {formatChange(change ?? 0)} ({formatPercent(changePercent ?? 0)})
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Timeframes */}
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map((tf, i) => (
          <button
            key={tf.label}
            onClick={() => onTimeframeChange(i)}
            className={`px-2 py-0.5 rounded text-xxs font-mono transition-colors cursor-pointer ${
              i === timeframe
                ? 'bg-white/10 text-text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-terminal-border mx-1" />

      {/* Chart type */}
      <div className="flex items-center gap-0.5">
        {chartTypes.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onChartTypeChange(key)}
            className={`px-2 py-0.5 rounded text-xxs font-mono transition-colors cursor-pointer ${
              chartType === key
                ? 'bg-white/10 text-text-primary'
                : 'text-text-muted hover:text-text-secondary hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
