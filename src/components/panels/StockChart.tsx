'use client';

import { useRef, useEffect } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  ColorType,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Candle } from '@/lib/types';

interface StockChartProps {
  candles: Candle[];
  chartType: 'candlestick' | 'line' | 'area';
}

export default function StockChart({ candles, chartType }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#232323' },
        textColor: '#888888',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: 'rgba(255,255,255,0.15)',
          labelBackgroundColor: '#2C2C2C',
        },
        horzLine: {
          color: 'rgba(255,255,255,0.15)',
          labelBackgroundColor: '#2C2C2C',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.resize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    // Remove old series
    if (seriesRef.current) {
      chart.removeSeries(seriesRef.current);
      seriesRef.current = null;
    }

    // Create new series
    if (chartType === 'candlestick') {
      const series = chart.addSeries(CandlestickSeries, {
        upColor: '#4ade80',
        downColor: '#f87171',
        borderUpColor: '#4ade80',
        borderDownColor: '#f87171',
        wickUpColor: '#4ade80',
        wickDownColor: '#f87171',
      });
      series.setData(candles.map(c => ({ ...c, time: c.time as UTCTimestamp })));
      seriesRef.current = series;
    } else if (chartType === 'line') {
      const series = chart.addSeries(LineSeries, {
        color: '#4ade80',
        lineWidth: 2,
      });
      series.setData(candles.map(c => ({ time: c.time as UTCTimestamp, value: c.close })));
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(74,222,128,0.28)',
        bottomColor: 'rgba(74,222,128,0.02)',
        lineColor: '#4ade80',
        lineWidth: 2,
      });
      series.setData(candles.map(c => ({ time: c.time as UTCTimestamp, value: c.close })));
      seriesRef.current = series;
    }

    chart.timeScale().fitContent();
  }, [candles, chartType]);

  return <div ref={containerRef} className="flex-1 w-full" />;
}
