import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import type { Strategy, StrategySignal, StrategyBacktestResult } from '@/lib/types';

const DEFAULT_STRATEGY_CODE = `from celery_sdk import *

# Example: SMA Crossover Strategy
# Emits a BUY when the 20-day SMA crosses above the 50-day SMA
# Emits a SELL when the 20-day SMA crosses below the 50-day SMA

symbol = "AAPL"
candles = get_candles(symbol, range="3m")
closes = [c["close"] for c in candles]

sma_20 = sma(closes, 20)
sma_50 = sma(closes, 50)

if crossover(sma_20, sma_50):
    emit_signal(symbol, Signal.BUY, confidence=0.8, reason="Golden cross: SMA20 crossed above SMA50")
elif crossunder(sma_20, sma_50):
    emit_signal(symbol, Signal.SELL, confidence=0.8, reason="Death cross: SMA20 crossed below SMA50")
else:
    emit_signal(symbol, Signal.HOLD, reason="No crossover detected")
`;

interface StrategyState {
  strategies: Strategy[];
  activeSignals: StrategySignal[];
  activeStrategyIds: Set<string>;
  loading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  createStrategy: (data?: { name?: string; description?: string; code?: string; symbols?: string[] }) => Promise<Strategy | null>;
  updateStrategy: (id: string, data: Partial<Pick<Strategy, 'name' | 'description' | 'code' | 'symbols' | 'parameters' | 'is_public'>>) => Promise<void>;
  deleteStrategy: (id: string) => Promise<void>;
  importStrategy: (strategyId: string) => Promise<void>;
  saveBacktestResult: (strategyId: string, result: Omit<StrategyBacktestResult, 'id' | 'strategy_id' | 'computed_at'>) => Promise<void>;
  activateStrategy: (id: string) => void;
  deactivateStrategy: (id: string) => void;
  addSignal: (signal: StrategySignal) => void;
  addSignals: (signals: StrategySignal[]) => void;
  clearSignals: () => void;
}

const supabase = createClient();

export const useStrategyStore = create<StrategyState>()((set, get) => ({
  strategies: [],
  activeSignals: [],
  activeStrategyIds: new Set(),
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch user's own strategies
      const { data: ownStrategies, error: ownErr } = await supabase
        .from('strategies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ownErr) throw ownErr;

      // Fetch imported strategies
      const { data: imports, error: impErr } = await supabase
        .from('strategy_imports')
        .select('strategy_id')
        .eq('user_id', user.id);

      if (impErr) throw impErr;

      const importedIds = (imports ?? []).map(i => i.strategy_id);
      let importedStrategies: Strategy[] = [];

      if (importedIds.length > 0) {
        const { data: impData, error: impDataErr } = await supabase
          .from('strategies')
          .select('*')
          .in('id', importedIds);

        if (impDataErr) throw impDataErr;
        importedStrategies = impData ?? [];
      }

      // Fetch latest backtest results for all strategies
      const allIds = [...(ownStrategies ?? []).map(s => s.id), ...importedIds];
      const backtestMap: Record<string, StrategyBacktestResult> = {};

      if (allIds.length > 0) {
        const { data: backtests } = await supabase
          .from('strategy_backtest_results')
          .select('*')
          .in('strategy_id', allIds)
          .order('computed_at', { ascending: false });

        if (backtests) {
          for (const bt of backtests) {
            if (!backtestMap[bt.strategy_id]) {
              backtestMap[bt.strategy_id] = {
                id: bt.id,
                strategy_id: bt.strategy_id,
                total_return: Number(bt.total_return),
                win_rate: Number(bt.win_rate),
                sharpe_ratio: Number(bt.sharpe_ratio),
                max_drawdown: Number(bt.max_drawdown),
                total_trades: bt.total_trades,
                backtest_range: bt.backtest_range,
                equity_curve: bt.equity_curve || [],
                computed_at: bt.computed_at,
              };
            }
          }
        }
      }

      const allStrategies = [...(ownStrategies ?? []), ...importedStrategies].map(s => ({
        id: s.id,
        user_id: s.user_id,
        name: s.name,
        description: s.description,
        code: s.code,
        symbols: s.symbols || [],
        parameters: s.parameters || {},
        is_public: s.is_public,
        created_at: s.created_at,
        updated_at: s.updated_at,
        backtest: backtestMap[s.id] || undefined,
      }));

      // Fetch recent signals
      const { data: signals } = await supabase
        .from('strategy_signals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      set({
        strategies: allStrategies,
        activeSignals: (signals ?? []).map(s => ({
          id: s.id,
          strategy_id: s.strategy_id,
          user_id: s.user_id,
          symbol: s.symbol,
          signal: s.signal as 'buy' | 'sell' | 'hold',
          price: Number(s.price),
          confidence: Number(s.confidence),
          reason: s.reason || '',
          created_at: s.created_at,
        })),
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createStrategy: async (data) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: row, error } = await supabase
        .from('strategies')
        .insert({
          user_id: user.id,
          name: data?.name || 'Untitled Strategy',
          description: data?.description || '',
          code: data?.code || DEFAULT_STRATEGY_CODE,
          symbols: data?.symbols || [],
        })
        .select()
        .single();

      if (error) throw error;

      const strategy: Strategy = {
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        description: row.description,
        code: row.code,
        symbols: row.symbols || [],
        parameters: row.parameters || {},
        is_public: row.is_public,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };

      set((s) => ({ strategies: [strategy, ...s.strategies] }));
      return strategy;
    } catch (err) {
      set({ error: (err as Error).message });
      return null;
    }
  },

  updateStrategy: async (id, data) => {
    const prev = get().strategies;
    set((s) => ({
      strategies: s.strategies.map((st) =>
        st.id === id ? { ...st, ...data, updated_at: new Date().toISOString() } : st
      ),
    }));

    try {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;
      if (data.code !== undefined) updates.code = data.code;
      if (data.symbols !== undefined) updates.symbols = data.symbols;
      if (data.parameters !== undefined) updates.parameters = data.parameters;
      if (data.is_public !== undefined) updates.is_public = data.is_public;

      const { error } = await supabase
        .from('strategies')
        .update(updates)
        .eq('id', id);

      if (error) {
        set({ strategies: prev });
        throw error;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deleteStrategy: async (id) => {
    const prev = get().strategies;
    set((s) => ({
      strategies: s.strategies.filter((st) => st.id !== id),
      activeStrategyIds: new Set([...s.activeStrategyIds].filter(sid => sid !== id)),
    }));

    try {
      const { error } = await supabase
        .from('strategies')
        .delete()
        .eq('id', id);

      if (error) {
        set({ strategies: prev });
        throw error;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  importStrategy: async (strategyId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already imported
      const existing = get().strategies.find(s => s.id === strategyId);
      if (existing && existing.user_id !== user.id) return; // already have it

      const { error } = await supabase
        .from('strategy_imports')
        .insert({ strategy_id: strategyId, user_id: user.id });

      if (error && error.code !== '23505') throw error; // 23505 = unique violation (already imported)

      // Fetch the strategy if we don't have it
      if (!existing) {
        const { data: strat } = await supabase
          .from('strategies')
          .select('*')
          .eq('id', strategyId)
          .single();

        if (strat) {
          const strategy: Strategy = {
            id: strat.id,
            user_id: strat.user_id,
            name: strat.name,
            description: strat.description,
            code: strat.code,
            symbols: strat.symbols || [],
            parameters: strat.parameters || {},
            is_public: strat.is_public,
            created_at: strat.created_at,
            updated_at: strat.updated_at,
          };
          set((s) => ({ strategies: [...s.strategies, strategy] }));
        }
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  saveBacktestResult: async (strategyId, result) => {
    try {
      const { data: row, error } = await supabase
        .from('strategy_backtest_results')
        .insert({
          strategy_id: strategyId,
          total_return: result.total_return,
          win_rate: result.win_rate,
          sharpe_ratio: result.sharpe_ratio,
          max_drawdown: result.max_drawdown,
          total_trades: result.total_trades,
          backtest_range: result.backtest_range,
          equity_curve: result.equity_curve,
        })
        .select()
        .single();

      if (error) throw error;

      const backtest: StrategyBacktestResult = {
        id: row.id,
        strategy_id: row.strategy_id,
        total_return: Number(row.total_return),
        win_rate: Number(row.win_rate),
        sharpe_ratio: Number(row.sharpe_ratio),
        max_drawdown: Number(row.max_drawdown),
        total_trades: row.total_trades,
        backtest_range: row.backtest_range,
        equity_curve: row.equity_curve || [],
        computed_at: row.computed_at,
      };

      set((s) => ({
        strategies: s.strategies.map(st =>
          st.id === strategyId ? { ...st, backtest } : st
        ),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  activateStrategy: (id) => {
    set((s) => ({
      activeStrategyIds: new Set([...s.activeStrategyIds, id]),
    }));
  },

  deactivateStrategy: (id) => {
    set((s) => ({
      activeStrategyIds: new Set([...s.activeStrategyIds].filter(sid => sid !== id)),
    }));
  },

  addSignal: (signal) => {
    set((s) => ({
      activeSignals: [signal, ...s.activeSignals].slice(0, 200),
    }));
  },

  addSignals: (signals) => {
    set((s) => ({
      activeSignals: [...signals, ...s.activeSignals].slice(0, 200),
    }));
  },

  clearSignals: () => {
    set({ activeSignals: [] });
  },
}));
