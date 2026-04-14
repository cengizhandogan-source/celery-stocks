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
import type { NetWorthSnapshot } from '@/lib/types';
import { formatNetWorth } from '@/lib/formatters';

interface NetWorthChartProps {
  snapshots: NetWorthSnapshot[];
  currentValue?: number;
}

const TIME_RANGES = [
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '1Y', days: 365 },
  { label: 'ALL', days: Infinity },
] as const;

export default function NetWorthChart({ snapshots, currentValue }: NetWorthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const [range, setRange] = useState<string>('ALL');
  const [tooltip, setTooltip] = useState<{ value: number; date: string; x: number; y: number } | null>(null);

  const filteredSnapshots = (() => {
    const selected = TIME_RANGES.find((r) => r.label === range);
    if (!selected || selected.days === Infinity) return snapshots;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selected.days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return snapshots.filter((s) => s.date >= cutoffStr);
  })();

  const first = filteredSnapshots[0]?.total_usd ?? 0;
  const last = currentValue ?? filteredSnapshots[filteredSnapshots.length - 1]?.total_usd ?? 0;
  const isUp = last >= first;

  const lineColor = isUp ? '#4ade80' : '#f87171';
  const topGradient = isUp ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)';
  const bottomGradient = isUp ? 'rgba(74,222,128,0.02)' : 'rgba(248,113,113,0.02)';

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (!param.time || !seriesRef.current || !param.point) {
      setTooltip(null);
      return;
    }
    const data = param.seriesData.get(seriesRef.current);
    if (data && 'value' in data) {
      const timeStr = typeof param.time === 'string' ? param.time : '';
      setTooltip({
        value: (data as { value: number }).value,
        date: timeStr,
        x: param.point.x,
        y: param.point.y,
      });
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
      rightPriceScale: { visible: false },
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

    if (filteredSnapshots.length < 2) return;

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
      value: s.total_usd,
    }));

    series.setData(data);
    seriesRef.current = series;
    chart.timeScale().fitContent();
  }, [filteredSnapshots, lineColor, topGradient, bottomGradient]);

  if (filteredSnapshots.length < 2) {
    return (
      <div className="w-full h-[100px] flex items-center justify-center">
        <span className="text-xxs text-text-muted font-mono">Chart builds as snapshots are recorded</span>
      </div>
    );
  }

  return (
    <div>
      {/* Chart */}
      <div className="relative">
        <div ref={containerRef} className="w-full h-[100px]" />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-[#2C2C2C] border border-terminal-border rounded px-1.5 py-0.5 text-xxs font-mono whitespace-nowrap z-10"
            style={{
              left: Math.min(tooltip.x, (containerRef.current?.clientWidth ?? 200) - 100),
              top: Math.max(0, tooltip.y - 28),
            }}
          >
            <span className="text-amber-400">{formatNetWorth(tooltip.value)}</span>
            <span className="text-text-muted ml-1.5">{tooltip.date}</span>
          </div>
        )}
      </div>

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
