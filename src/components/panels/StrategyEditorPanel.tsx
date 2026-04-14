'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { useStrategyStore } from '@/stores/strategyStore';
import { useStrategyRunner } from '@/hooks/useStrategyRunner';
import { useWatchlistStore } from '@/stores/watchlistStore';
import type { Strategy, StrategySignal } from '@/lib/types';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const SAVE_DEBOUNCE_MS = 1500;

export default function StrategyEditorPanel({ strategyId }: { strategyId?: string }) {
  const strategies = useStrategyStore((s) => s.strategies);
  const createStrategy = useStrategyStore((s) => s.createStrategy);
  const updateStrategy = useStrategyStore((s) => s.updateStrategy);
  const deleteStrategy = useStrategyStore((s) => s.deleteStrategy);
  const saveBacktestResult = useStrategyStore((s) => s.saveBacktestResult);
  const initialize = useStrategyStore((s) => s.initialize);
  const loading = useStrategyStore((s) => s.loading);

  const watchlist = useWatchlistStore((s) => s.symbols);

  const { isRunning, isBacktesting, error: runError, logs, runStrategy, runBacktest, clearLogs } = useStrategyRunner();

  const [selectedId, setSelectedId] = useState<string | null>(strategyId || null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbols, setSymbols] = useState('');
  const [runSignals, setRunSignals] = useState<StrategySignal[]>([]);
  const [runError2, setRunError2] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [outputTab, setOutputTab] = useState<'signals' | 'logs' | 'backtest'>('signals');
  const [initialized, setInitialized] = useState(false);

  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Initialize store
  useEffect(() => {
    if (!initialized) {
      initialize().then(() => setInitialized(true));
    }
  }, [initialize, initialized]);

  // Select strategy on mount or when strategyId changes
  useEffect(() => {
    if (strategyId && strategies.length > 0) {
      const found = strategies.find(s => s.id === strategyId);
      if (found) {
        setSelectedId(found.id);
        setCode(found.code);
        setName(found.name);
        setDescription(found.description);
        setSymbols((found.symbols || []).join(', '));
      }
    } else if (!selectedId && strategies.length > 0) {
      selectStrategy(strategies[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strategyId, strategies.length, initialized]);

  const selectStrategy = useCallback((s: Strategy) => {
    setSelectedId(s.id);
    setCode(s.code);
    setName(s.name);
    setDescription(s.description);
    setSymbols((s.symbols || []).join(', '));
    setRunSignals([]);
    setRunError2(null);
    clearLogs();
  }, [clearLogs]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    const v = value ?? '';
    setCode(v);
    if (!selectedId) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateStrategy(selectedId, { code: v });
    }, SAVE_DEBOUNCE_MS);
  }, [selectedId, updateStrategy]);

  const handleSave = useCallback(() => {
    if (!selectedId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const parsedSymbols = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    updateStrategy(selectedId, { name, description, code, symbols: parsedSymbols });
  }, [selectedId, name, description, code, symbols, updateStrategy]);

  const handleNew = useCallback(async () => {
    const s = await createStrategy();
    if (s) selectStrategy(s);
  }, [createStrategy, selectStrategy]);

  const handleDelete = useCallback(async () => {
    if (!selectedId) return;
    await deleteStrategy(selectedId);
    const remaining = strategies.filter(s => s.id !== selectedId);
    if (remaining.length > 0) {
      selectStrategy(remaining[0]);
    } else {
      setSelectedId(null);
      setCode('');
      setName('');
      setDescription('');
      setSymbols('');
    }
  }, [selectedId, deleteStrategy, strategies, selectStrategy]);

  const handleRun = useCallback(async () => {
    if (!selectedId || !code) return;
    setRunError2(null);
    setRunSignals([]);
    clearLogs();

    try {
      const parsedSymbols = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const quoteSymbols = parsedSymbols.length > 0 ? parsedSymbols : watchlist;

      // Fetch quotes for target symbols
      const quoteRes = await fetch(`/api/quote?symbols=${quoteSymbols.join(',')}`);
      const quoteData = await quoteRes.json();
      const quotes: Record<string, Record<string, number>> = {};
      if (quoteData.quotes) {
        for (const q of quoteData.quotes) {
          quotes[q.symbol] = q;
        }
      } else if (quoteData.quote) {
        quotes[quoteData.quote.symbol] = quoteData.quote;
      }

      // Fetch candles for each symbol
      const candles: Record<string, { time: number; open: number; high: number; low: number; close: number; volume?: number }[]> = {};
      for (const sym of quoteSymbols.slice(0, 5)) {
        try {
          const candleRes = await fetch(`/api/candles?symbol=${sym}&interval=1d&range=3m`);
          const candleData = await candleRes.json();
          if (candleData.candles) {
            candles[`${sym}:1d:3m`] = candleData.candles;
          }
        } catch { /* skip */ }
      }

      const data = {
        quotes,
        candles,
        portfolio: [],
        watchlist,
      };

      const signals = await runStrategy(code, data);
      setRunSignals(signals.map((sig, i) => ({
        id: `run-${i}`,
        strategy_id: selectedId,
        user_id: '',
        symbol: sig.symbol,
        signal: sig.signal,
        price: 0,
        confidence: sig.confidence,
        reason: sig.reason,
        created_at: new Date().toISOString(),
      })));
      setOutputTab('signals');
    } catch (err) {
      setRunError2(err instanceof Error ? err.message : String(err));
    }
  }, [selectedId, code, symbols, watchlist, runStrategy, clearLogs]);

  const handleBacktest = useCallback(async () => {
    if (!selectedId || !code) return;
    setRunError2(null);
    clearLogs();

    try {
      const parsedSymbols = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const symbol = parsedSymbols[0] || 'AAPL';

      // Fetch 1 year of daily candles for backtest
      const candleRes = await fetch(`/api/candles?symbol=${symbol}&interval=1d&range=1y`);
      const candleData = await candleRes.json();

      if (!candleData.candles || candleData.candles.length === 0) {
        setRunError2('No candle data available for backtest');
        return;
      }

      const data = {
        quotes: {},
        candles: {},
        portfolio: [],
        watchlist,
        symbol,
      };

      const result = await runBacktest(code, data, candleData.candles);
      await saveBacktestResult(selectedId, result);
      setOutputTab('backtest');
    } catch (err) {
      setRunError2(err instanceof Error ? err.message : String(err));
    }
  }, [selectedId, code, symbols, watchlist, runBacktest, saveBacktestResult, clearLogs]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Register celery_sdk autocomplete
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model: { getWordUntilPosition: (p: unknown) => { startColumn: number; endColumn: number } }, position: { lineNumber: number; column: number }) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          { label: 'get_price', kind: monaco.languages.CompletionItemKind.Function, insertText: 'get_price("${1:AAPL}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Get current quote for a symbol', range },
          { label: 'get_prices', kind: monaco.languages.CompletionItemKind.Function, insertText: 'get_prices(["${1:AAPL}", "${2:MSFT}"])', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Get quotes for multiple symbols', range },
          { label: 'get_candles', kind: monaco.languages.CompletionItemKind.Function, insertText: 'get_candles("${1:AAPL}", interval="${2:1d}", range="${3:3m}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Get historical OHLC candles', range },
          { label: 'get_portfolio', kind: monaco.languages.CompletionItemKind.Function, insertText: 'get_portfolio()', detail: 'Get portfolio positions', range },
          { label: 'get_watchlist', kind: monaco.languages.CompletionItemKind.Function, insertText: 'get_watchlist()', detail: 'Get watchlist symbols', range },
          { label: 'emit_signal', kind: monaco.languages.CompletionItemKind.Function, insertText: 'emit_signal("${1:AAPL}", Signal.${2:BUY}, confidence=${3:0.8}, reason="${4:}")', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Emit a trading signal', range },
          { label: 'sma', kind: monaco.languages.CompletionItemKind.Function, insertText: 'sma(${1:prices}, ${2:20})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Simple Moving Average', range },
          { label: 'ema', kind: monaco.languages.CompletionItemKind.Function, insertText: 'ema(${1:prices}, ${2:20})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Exponential Moving Average', range },
          { label: 'rsi', kind: monaco.languages.CompletionItemKind.Function, insertText: 'rsi(${1:prices}, ${2:14})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Relative Strength Index', range },
          { label: 'macd', kind: monaco.languages.CompletionItemKind.Function, insertText: 'macd(${1:prices}, fast=${2:12}, slow=${3:26}, signal_period=${4:9})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'MACD indicator', range },
          { label: 'bollinger_bands', kind: monaco.languages.CompletionItemKind.Function, insertText: 'bollinger_bands(${1:prices}, period=${2:20}, std_dev=${3:2.0})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Bollinger Bands', range },
          { label: 'vwap', kind: monaco.languages.CompletionItemKind.Function, insertText: 'vwap(${1:candles})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Volume Weighted Average Price', range },
          { label: 'crossover', kind: monaco.languages.CompletionItemKind.Function, insertText: 'crossover(${1:series_a}, ${2:series_b})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Check if A crossed above B', range },
          { label: 'crossunder', kind: monaco.languages.CompletionItemKind.Function, insertText: 'crossunder(${1:series_a}, ${2:series_b})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: 'Check if A crossed below B', range },
          { label: 'Signal.BUY', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'Signal.BUY', detail: 'Buy signal constant', range },
          { label: 'Signal.SELL', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'Signal.SELL', detail: 'Sell signal constant', range },
          { label: 'Signal.HOLD', kind: monaco.languages.CompletionItemKind.Constant, insertText: 'Signal.HOLD', detail: 'Hold signal constant', range },
        ];

        return { suggestions };
      },
    });

    editor.updateOptions({
      minimap: { enabled: false },
      fontSize: 13,
      lineNumbers: 'on',
      renderWhitespace: 'none',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      tabSize: 4,
      padding: { top: 8 },
    });
  };

  const selected = strategies.find(s => s.id === selectedId);

  if (loading && !initialized) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Loading strategies...
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-48 shrink-0 border-r border-terminal-border flex flex-col">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-terminal-border">
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wide">Strategies</span>
            <button
              onClick={handleNew}
              className="text-xxs font-mono text-up hover:text-up/80 transition-colors"
            >
              + New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto" data-scrollable>
            {strategies.length === 0 ? (
              <div className="px-2 py-4 text-xxs font-mono text-text-muted text-center">
                No strategies yet
              </div>
            ) : (
              strategies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectStrategy(s)}
                  className={`w-full text-left px-2 py-1.5 text-xs font-mono transition-colors truncate ${
                    s.id === selectedId
                      ? 'bg-terminal-hover text-text-primary'
                      : 'text-text-muted hover:bg-terminal-hover/50'
                  }`}
                >
                  <div className="truncate">{s.name}</div>
                  {s.symbols && s.symbols.length > 0 && (
                    <div className="text-xxs text-text-muted truncate">{s.symbols.join(', ')}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-terminal-border shrink-0 flex-wrap">
          <button
            onClick={() => setShowSidebar(v => !v)}
            className="text-xxs font-mono text-text-muted hover:text-text-primary transition-colors px-1"
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            {showSidebar ? '◀' : '▶'}
          </button>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            placeholder="Strategy name"
            className="bg-terminal-input text-xs font-mono text-text-primary placeholder:text-text-muted px-2 py-0.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none w-36"
          />
          <input
            value={symbols}
            onChange={(e) => setSymbols(e.target.value)}
            onBlur={handleSave}
            placeholder="Symbols (e.g. AAPL, MSFT)"
            className="bg-terminal-input text-xxs font-mono text-text-primary placeholder:text-text-muted px-2 py-0.5 rounded border border-terminal-border focus:border-up/40 focus:outline-none w-40 uppercase"
          />
          <div className="flex-1" />
          <button
            onClick={handleRun}
            disabled={isRunning || !selectedId}
            className="text-xxs font-mono px-2 py-0.5 rounded border border-up/30 text-up hover:bg-up/10 disabled:opacity-40 transition-colors"
          >
            {isRunning ? 'Running...' : '▶ Run'}
          </button>
          <button
            onClick={handleBacktest}
            disabled={isBacktesting || !selectedId}
            className="text-xxs font-mono px-2 py-0.5 rounded border border-text-muted/30 text-text-muted hover:bg-terminal-hover disabled:opacity-40 transition-colors"
          >
            {isBacktesting ? 'Testing...' : '⟳ Backtest'}
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedId}
            className="text-xxs font-mono px-2 py-0.5 rounded border border-text-muted/30 text-text-muted hover:bg-terminal-hover disabled:opacity-40 transition-colors"
          >
            Save
          </button>
          {selectedId && (
            <button
              onClick={handleDelete}
              className="text-xxs font-mono px-2 py-0.5 rounded border border-down/30 text-down hover:bg-down/10 transition-colors"
            >
              Delete
            </button>
          )}
        </div>

        {/* Description */}
        {selectedId && (
          <div className="px-2 py-1 border-b border-terminal-border">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Strategy description..."
              className="w-full bg-transparent text-xxs font-mono text-text-muted placeholder:text-text-muted/50 focus:outline-none"
            />
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 min-h-0">
          {selectedId ? (
            <Editor
              language="python"
              theme="vs-dark"
              value={code}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                padding: { top: 8 },
              }}
              loading={
                <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
                  Loading editor...
                </div>
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
              <button onClick={handleNew} className="text-up hover:underline">
                + Create your first strategy
              </button>
            </div>
          )}
        </div>

        {/* Output pane */}
        <div className="h-36 shrink-0 border-t border-terminal-border flex flex-col">
          {/* Output tabs */}
          <div className="flex items-center gap-3 px-2 py-1 border-b border-terminal-border shrink-0">
            {(['signals', 'logs', 'backtest'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setOutputTab(tab)}
                className={`text-xxs font-mono uppercase tracking-wide transition-colors ${
                  outputTab === tab ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab}
                {tab === 'signals' && runSignals.length > 0 && (
                  <span className="ml-1 text-up">({runSignals.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Output content */}
          <div className="flex-1 overflow-y-auto px-2 py-1" data-scrollable>
            {(runError || runError2) && (
              <div className="text-xxs font-mono text-down mb-1">{runError || runError2}</div>
            )}

            {outputTab === 'signals' && (
              runSignals.length === 0 ? (
                <div className="text-xxs font-mono text-text-muted">Run strategy to see signals</div>
              ) : (
                runSignals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5 text-xxs font-mono">
                    <span className={
                      sig.signal === 'buy' ? 'text-up font-medium' :
                      sig.signal === 'sell' ? 'text-down font-medium' :
                      'text-text-muted'
                    }>
                      {sig.signal.toUpperCase()}
                    </span>
                    <span className="text-text-primary">{sig.symbol}</span>
                    <span className="text-text-muted">conf:{(sig.confidence * 100).toFixed(0)}%</span>
                    {sig.reason && <span className="text-text-muted truncate">{sig.reason}</span>}
                  </div>
                ))
              )
            )}

            {outputTab === 'logs' && (
              logs.length === 0 ? (
                <div className="text-xxs font-mono text-text-muted">No output</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-xxs font-mono text-text-muted">{log}</div>
                ))
              )
            )}

            {outputTab === 'backtest' && (
              selected?.backtest ? (
                <BacktestResultView result={selected.backtest} />
              ) : (
                <div className="text-xxs font-mono text-text-muted">Run backtest to see results</div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BacktestResultView({ result }: { result: Strategy['backtest'] }) {
  if (!result) return null;

  const isPositive = result.total_return >= 0;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-xxs font-mono text-text-muted">Return</div>
          <div className={`text-xs font-mono font-medium ${isPositive ? 'text-up' : 'text-down'}`}>
            {isPositive ? '+' : ''}{result.total_return.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted">Win Rate</div>
          <div className="text-xs font-mono text-text-primary">{result.win_rate.toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted">Sharpe</div>
          <div className="text-xs font-mono text-text-primary">{result.sharpe_ratio.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted">Max DD</div>
          <div className="text-xs font-mono text-down">{result.max_drawdown.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted">Trades</div>
          <div className="text-xs font-mono text-text-primary">{result.total_trades}</div>
        </div>
        <div>
          <div className="text-xxs font-mono text-text-muted">Range</div>
          <div className="text-xs font-mono text-text-primary">{result.backtest_range}</div>
        </div>
      </div>

      {result.equity_curve && result.equity_curve.length > 0 && (
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={result.equity_curve}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={isPositive ? '#4ade80' : '#f87171'}
                fill={isPositive ? '#4ade8020' : '#f8717120'}
                strokeWidth={1}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
