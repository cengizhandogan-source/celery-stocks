'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
  const [containerWidth, setContainerWidth] = useState(200);
  const [tooltip, setTooltip] = useState<{ value: number; date: string; x: number; y: number } | null>(null);

  const filteredSnapshots = useMemo(() => {
    const selected = TIME_RANGES.find((r) => r.label === range);
    if (!selected || selected.days === Infinity) return snapshots;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selected.days);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return snapshots.filter((s) => s.date >= cutoffStr);
  }, [range, snapshots]);

  const { isUp, lineColor, topGradient, bottomGradient } = useMemo(() => {
    const f = filteredSnapshots[0]?.total_usd ?? 0;
    const l = currentValue ?? filteredSnapshots[filteredSnapshots.length - 1]?.total_usd ?? 0;
    const up = l >= f;
    return {
      isUp: up,
      lineColor: up ? '#00FFA3' : '#FF4D4F',
      topGradient: up ? 'rgba(0,255,163,0.28)' : 'rgba(255,77,79,0.28)',
      bottomGradient: up ? 'rgba(0,255,163,0.02)' : 'rgba(255,77,79,0.02)',
    };
  }, [filteredSnapshots, currentValue]);

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

    const monoFontFamily =
      getComputedStyle(document.documentElement).getPropertyValue('--font-plex-mono').trim() ||
      "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#A1A1AA',
        fontFamily: `${monoFontFamily}, 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace`,
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
        const { width, height } = entry.contentRect;
        setContainerWidth(width);
        chart.resize(width, height);
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
            className="absolute pointer-events-none bg-elevated border border-border rounded px-1.5 py-0.5 text-xxs font-mono whitespace-nowrap z-10"
            style={{
              left: Math.min(tooltip.x, containerWidth - 100),
              top: Math.max(0, tooltip.y - 28),
            }}
          >
            <span className="text-gold">{formatNetWorth(tooltip.value)}</span>
            <span className="text-text-muted ml-1.5">{tooltip.date}</span>
          </div>
        )}
      </div>

      {/* Time range selector */}
      <div className="flex gap-1 mt-2">
        {TIME_RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            className={`px-2.5 py-0.5 text-[11px] font-sans font-medium rounded-full transition-all duration-150 ease-[var(--ease-snap)] ${
              range === r.label
                ? isUp ? 'text-profit bg-profit/10' : 'text-loss bg-loss/10'
                : 'text-text-muted hover:text-text-primary hover:bg-hover'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
