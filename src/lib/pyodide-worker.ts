/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Web Worker for executing Python trading strategies via Pyodide.
 *
 * Messages IN:
 *   { type: 'init' }                              — load Pyodide runtime
 *   { type: 'run', code, data }                   — run strategy code with market data
 *   { type: 'backtest', code, data, candles }      — run backtest over historical candles
 *
 * Messages OUT:
 *   { type: 'ready' }                             — Pyodide loaded and ready
 *   { type: 'signals', signals }                  — strategy run results
 *   { type: 'backtest_result', result }            — backtest metrics
 *   { type: 'error', error }                      — execution error
 *   { type: 'log', message }                      — console output from Python
 */

const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
const EXECUTION_TIMEOUT_MS = 10_000;

declare function importScripts(...urls: string[]): void;

let pyodide: any = null;
let sdkCode: string = '';

// Load the celery SDK source code
async function loadSDK() {
  // The SDK is bundled as a string — imported at build time
  // Since we're in a worker, we fetch it from a known path
  try {
    const resp = await fetch('/celery-sdk.py');
    sdkCode = await resp.text();
  } catch {
    // Fallback: the SDK will be passed in the init message
  }
}

async function initPyodide() {
  if (pyodide) return;

  // Import Pyodide from CDN
  importScripts(`${PYODIDE_CDN}pyodide.js`);

  pyodide = await (self as any).loadPyodide({
    indexURL: PYODIDE_CDN,
    stdout: (msg: string) => self.postMessage({ type: 'log', message: msg }),
    stderr: (msg: string) => self.postMessage({ type: 'log', message: `[stderr] ${msg}` }),
  });

  await loadSDK();

  self.postMessage({ type: 'ready' });
}

function injectData(data: any) {
  // Inject market data into Python globals
  pyodide.globals.set('__celery_quotes__', pyodide.toPy(data.quotes || {}));
  pyodide.globals.set('__celery_candles__', pyodide.toPy(data.candles || {}));
  pyodide.globals.set('__celery_portfolio__', pyodide.toPy(data.portfolio || []));
  pyodide.globals.set('__celery_watchlist__', pyodide.toPy(data.watchlist || []));
  pyodide.globals.set('__celery_signals__', pyodide.toPy([]));
}

function collectSignals(): any[] {
  const pySignals = pyodide.globals.get('__celery_signals__');
  const signals = pySignals.toJs({ dict_converter: Object.fromEntries });
  pySignals.destroy();
  return Array.isArray(signals) ? signals : Array.from(signals);
}

async function runWithTimeout(code: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Strategy execution timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    try {
      pyodide.runPython(code);
      clearTimeout(timer);
      resolve();
    } catch (err: any) {
      clearTimeout(timer);
      reject(err);
    }
  });
}

async function runStrategy(code: string, data: any) {
  if (!pyodide) throw new Error('Pyodide not initialized');

  injectData(data);

  // Run SDK setup + user code
  const fullCode = `${sdkCode}\n\n${code}`;

  await runWithTimeout(fullCode, EXECUTION_TIMEOUT_MS);

  return collectSignals();
}

async function runBacktest(code: string, data: any, historicalCandles: any) {
  if (!pyodide) throw new Error('Pyodide not initialized');

  // For backtesting, we simulate running the strategy day by day
  const candles: any[] = historicalCandles;
  if (!candles || candles.length === 0) {
    throw new Error('No historical candle data provided for backtest');
  }

  const allSignals: any[] = [];
  let equity = 10000;
  let position = 0; // shares held
  let entryPrice = 0;
  let wins = 0;
  let losses = 0;
  let trades = 0;
  let peakEquity = equity;
  let maxDrawdown = 0;
  const equityCurve: { date: string; value: number }[] = [];

  // Run strategy at each candle point with all available history up to that point
  for (let i = 20; i < candles.length; i++) {
    const historySlice = candles.slice(0, i + 1);
    const currentCandle = candles[i];
    const currentPrice = currentCandle.close;
    const symbol = data.symbol || 'UNKNOWN';

    // Build data context for this point in time
    const sliceData = {
      quotes: {
        [symbol]: {
          price: currentPrice,
          change: currentPrice - (candles[i - 1]?.close || currentPrice),
          changePercent: ((currentPrice - (candles[i - 1]?.close || currentPrice)) / (candles[i - 1]?.close || currentPrice)) * 100,
          volume: currentCandle.volume || 0,
          high: currentCandle.high,
          low: currentCandle.low,
          open: currentCandle.open,
        },
      },
      candles: {
        [`${symbol}:1d:3m`]: historySlice,
      },
      portfolio: data.portfolio || [],
      watchlist: data.watchlist || [],
    };

    injectData(sliceData);

    const fullCode = `${sdkCode}\n\n${code}`;

    try {
      pyodide.runPython(fullCode);
    } catch {
      continue; // Skip errors on individual iterations
    }

    const signals = collectSignals();

    for (const sig of signals) {
      allSignals.push({ ...sig, price: currentPrice, time: currentCandle.time });

      if (sig.signal === 'buy' && position === 0) {
        position = Math.floor(equity / currentPrice);
        entryPrice = currentPrice;
        equity -= position * currentPrice;
        trades++;
      } else if (sig.signal === 'sell' && position > 0) {
        equity += position * currentPrice;
        if (currentPrice > entryPrice) wins++;
        else losses++;
        position = 0;
        trades++;
      }
    }

    const totalValue = equity + position * currentPrice;
    peakEquity = Math.max(peakEquity, totalValue);
    const drawdown = ((peakEquity - totalValue) / peakEquity) * 100;
    maxDrawdown = Math.max(maxDrawdown, drawdown);

    // Sample equity curve (every 5th point to keep it manageable)
    if (i % 5 === 0 || i === candles.length - 1) {
      const date = new Date(currentCandle.time * 1000).toISOString().split('T')[0];
      equityCurve.push({ date, value: Math.round(totalValue * 100) / 100 });
    }
  }

  // Close any open position at the end
  const lastPrice = candles[candles.length - 1].close;
  const finalEquity = equity + position * lastPrice;
  if (position > 0 && lastPrice > entryPrice) wins++;
  else if (position > 0) losses++;

  const totalReturn = ((finalEquity - 10000) / 10000) * 100;
  const winRate = trades > 0 ? (wins / Math.ceil(trades / 2)) * 100 : 0;

  // Simplified Sharpe ratio approximation
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    returns.push((equityCurve[i].value - equityCurve[i - 1].value) / equityCurve[i - 1].value);
  }
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1))
    : 0;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  return {
    total_return: Math.round(totalReturn * 100) / 100,
    win_rate: Math.round(winRate * 100) / 100,
    sharpe_ratio: Math.round(sharpeRatio * 100) / 100,
    max_drawdown: Math.round(-maxDrawdown * 100) / 100,
    total_trades: trades,
    backtest_range: `${candles.length} candles`,
    equity_curve: equityCurve,
  };
}

// Message handler
self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  try {
    switch (type) {
      case 'init': {
        await initPyodide();
        break;
      }
      case 'set_sdk': {
        sdkCode = e.data.sdkCode;
        break;
      }
      case 'run': {
        const signals = await runStrategy(e.data.code, e.data.data);
        self.postMessage({ type: 'signals', signals });
        break;
      }
      case 'backtest': {
        const result = await runBacktest(e.data.code, e.data.data, e.data.candles);
        self.postMessage({ type: 'backtest_result', result });
        break;
      }
      default:
        self.postMessage({ type: 'error', error: `Unknown message type: ${type}` });
    }
  } catch (err: any) {
    self.postMessage({
      type: 'error',
      error: err?.message || String(err),
    });
  }
};
