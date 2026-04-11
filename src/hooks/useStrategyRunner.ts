'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { StrategyBacktestResult } from '@/lib/types';

interface StrategyRunData {
  quotes: Record<string, Record<string, number | string>>;
  candles: Record<string, { time: number; open: number; high: number; low: number; close: number; volume?: number }[]>;
  portfolio: { symbol: string; shares: number; avgCost: number }[];
  watchlist: string[];
  symbol?: string;
}

interface SignalResult {
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  reason: string;
}

// Read SDK source at module level (it's a static asset)
let sdkCodePromise: Promise<string> | null = null;

function loadSDKCode(): Promise<string> {
  if (!sdkCodePromise) {
    sdkCodePromise = fetch('/celery-sdk.py').then(r => r.text()).catch(() => '');
  }
  return sdkCodePromise;
}

export function useStrategyRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const pendingResolve = useRef<((value: unknown) => void) | null>(null);
  const pendingReject = useRef<((reason: unknown) => void) | null>(null);

  const initWorker = useCallback(async () => {
    if (workerRef.current) return;

    const worker = new Worker(
      new URL('../lib/pyodide-worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const { type } = e.data;

      switch (type) {
        case 'ready':
          setPyodideReady(true);
          break;
        case 'signals':
          setIsRunning(false);
          pendingResolve.current?.(e.data.signals);
          pendingResolve.current = null;
          pendingReject.current = null;
          break;
        case 'backtest_result':
          setIsBacktesting(false);
          pendingResolve.current?.(e.data.result);
          pendingResolve.current = null;
          pendingReject.current = null;
          break;
        case 'error':
          setIsRunning(false);
          setIsBacktesting(false);
          setError(e.data.error);
          pendingReject.current?.(new Error(e.data.error));
          pendingResolve.current = null;
          pendingReject.current = null;
          break;
        case 'log':
          setLogs(prev => [...prev.slice(-99), e.data.message]);
          break;
      }
    };

    worker.onerror = (err) => {
      setIsRunning(false);
      setIsBacktesting(false);
      setError(err.message);
      pendingReject.current?.(err);
      pendingResolve.current = null;
      pendingReject.current = null;
    };

    workerRef.current = worker;

    // Load SDK and send to worker
    const sdkCode = await loadSDKCode();

    worker.postMessage({ type: 'init' });
    worker.postMessage({ type: 'set_sdk', sdkCode });
  }, []);

  const runStrategy = useCallback(async (code: string, data: StrategyRunData): Promise<SignalResult[]> => {
    await initWorker();
    setIsRunning(true);
    setError(null);

    return new Promise((resolve, reject) => {
      pendingResolve.current = resolve as (value: unknown) => void;
      pendingReject.current = reject as (reason: unknown) => void;
      workerRef.current!.postMessage({ type: 'run', code, data });
    });
  }, [initWorker]);

  const runBacktest = useCallback(async (
    code: string,
    data: StrategyRunData,
    candles: { time: number; open: number; high: number; low: number; close: number; volume?: number }[]
  ): Promise<Omit<StrategyBacktestResult, 'id' | 'strategy_id' | 'computed_at'>> => {
    await initWorker();
    setIsBacktesting(true);
    setError(null);

    return new Promise((resolve, reject) => {
      pendingResolve.current = resolve as (value: unknown) => void;
      pendingReject.current = reject as (reason: unknown) => void;
      workerRef.current!.postMessage({ type: 'backtest', code, data, candles });
    });
  }, [initWorker]);

  const clearLogs = useCallback(() => setLogs([]), []);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return {
    isRunning,
    isBacktesting,
    pyodideReady,
    error,
    logs,
    runStrategy,
    runBacktest,
    clearLogs,
    initWorker,
  };
}
