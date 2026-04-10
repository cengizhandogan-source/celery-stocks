'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  AreaSeries,
  ColorType,
  type UTCTimestamp,
  type MouseEventParams,
} from 'lightweight-charts';
import type { PortfolioSnapshot } from '@/lib/types';
import { formatPrice, formatChange, formatPercent } from '@/lib/formatters';

interface PerformanceChartProps {
  snapshots: PortfolioSnapshot[];
  currentValue: number;
  totalCost: number;
}

const TIME_RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: Infinity },
] as const;

export default function PerformanceChart({ snapshots, currentValue, totalCost }: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const [range, setRange] = useState<string>('ALL');
  const [hoverValue, setHoverValue] = useState<{ value: number; date: string } | null>(null);

  const totalPnl = currentValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isUp = totalPnl >= 0;

  const displayValue = hoverValue?.value ?? currentValue;
  const displayPnl = hoverValue ? hoverValue.value - totalCost : totalPnl;
  const displayPnlPct = totalCost > 0 ? (displayPnl / totalCost) * 100 : 0;
  const displayIsUp = displayPnl >= 0;

  const lineColor = isUp ? '#4ade80' : '#f87171';
  const topGradient = isUp ? 'rgba(74,222,128,0.24)' : 'rgba(248,113,113,0.24)';
  const bottomGradient = isUp ? 'rgba(74,222,128,0.01)' : 'rgba(248,113,113,0.01)';

  // Filter snapshots by time range
  const filteredSnapshots = (() => {
    const selected = TIME_RANGES.find((r) => r.label === range);
    if (!selected || selected.days === Infinity) return snapshots;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selected.days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return snapshots.filter((s) => s.date >= cutoffStr);
  })();

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (!param.time || !seriesRef.current) {
      setHoverValue(null);
      return;
    }
    const data = param.seriesData.get(seriesRef.current);
    if (data && 'value' in data) {
      const timeStr = typeof param.time === 'string' ? param.time : '';
      setHoverValue({ value: (data as { value: number }).value, date: timeStr });
    }
  }, []);

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888888',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(255,255,255,0.12)',
          width: 1,
          style: 2,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      rightPriceScale: {
        visible: false,
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        timeVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;
    chart.subscribeCrosshairMove(handleCrosshairMove);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [handleCrosshairMove]);

  // Update data
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    if (filteredSnapshots.length === 0) return;

    const series = chart.addSeries(AreaSeries, {
      topColor: topGradient,
      bottomColor: bottomGradient,
      lineColor,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor: lineColor,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const data = filteredSnapshots.map((s) => ({
      time: s.date as unknown as UTCTimestamp,
      value: s.total_value,
    }));

    series.setData(data);
    seriesRef.current = series;
    chart.timeScale().fitContent();
  }, [filteredSnapshots, lineColor, topGradient, bottomGradient]);

  if (snapshots.length === 0 && currentValue === 0) {
    return null;
  }

  return (
    <div className="flex flex-col px-3 py-2 border-b border-terminal-border">
      {/* Value header */}
      <div className="mb-1">
        <div className="text-lg font-mono font-medium text-text-primary leading-tight">
          ${formatPrice(displayValue)}
        </div>
        <div className={`text-xs font-mono ${displayIsUp ? 'text-up' : 'text-down'}`}>
          {formatChange(displayPnl)} ({formatPercent(displayPnlPct)})
          {hoverValue && <span className="text-text-muted ml-1.5">{hoverValue.date}</span>}
        </div>
      </div>

      {/* Chart */}
      {filteredSnapshots.length > 1 ? (
        <div ref={containerRef} className="w-full h-[100px]" />
      ) : (
        <div className="w-full h-[100px] flex items-center justify-center">
          <span className="text-xxs text-text-muted font-mono">Chart builds as snapshots are recorded</span>
        </div>
      )}

      {/* Time range selector */}
      <div className="flex gap-1 mt-1">
        {TIME_RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            className={`px-2 py-0.5 text-xxs font-mono rounded transition-colors ${
              range === r.label
                ? isUp ? 'text-up bg-up/10' : 'text-down bg-down/10'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
