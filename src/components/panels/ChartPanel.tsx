'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useCandles } from '@/hooks/useCandles';
import { useQuote } from '@/hooks/useQuote';
import { TIMEFRAMES } from '@/lib/constants';
import ChartControls from './ChartControls';
import StockChart from './StockChart';
import Spinner from '@/components/ui/Spinner';

interface ChartPanelProps {
  symbol?: string;
}

export default function ChartPanel({ symbol: propSymbol }: ChartPanelProps) {
  const activeSymbol = useAppStore((s) => s.activeSymbol);
  const symbol = propSymbol || activeSymbol;
  const [timeframe, setTimeframe] = useState(3); // 3M default
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');

  const tf = TIMEFRAMES[timeframe];
  const { candles, loading } = useCandles(symbol, tf.resolution, tf.range);
  const { quote } = useQuote(symbol);

  return (
    <div className="flex flex-col h-full w-full">
      <ChartControls
        symbol={symbol}
        price={quote?.price ?? null}
        change={quote?.change ?? null}
        changePercent={quote?.changePercent ?? null}
        timeframe={timeframe}
        chartType={chartType}
        onTimeframeChange={setTimeframe}
        onChartTypeChange={setChartType}
      />
      {loading && candles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      ) : (
        <StockChart candles={candles} chartType={chartType} />
      )}
    </div>
  );
}
