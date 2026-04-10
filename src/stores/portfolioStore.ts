import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import type { Portfolio, Position, PortfolioSnapshot } from '@/lib/types';

interface PortfolioState {
  portfolios: Portfolio[];
  activePortfolioId: string | null;
  positions: Position[];
  snapshots: PortfolioSnapshot[];
  loading: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  createPortfolio: (name: string) => Promise<void>;
  renamePortfolio: (id: string, name: string) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  setActivePortfolio: (id: string) => Promise<void>;
  addPosition: (data: { symbol: string; shares: number; avgCost: number }) => Promise<void>;
  removePosition: (positionId: string) => Promise<void>;
  updatePosition: (positionId: string, data: Partial<Pick<Position, 'shares' | 'avgCost'>>) => Promise<void>;
  recordSnapshot: (totalValue: number, totalCost: number, dayChange: number) => Promise<void>;
  fetchSnapshots: (portfolioId: string) => Promise<void>;
}

const supabase = createClient();

async function fetchPositionsForPortfolio(portfolioId: string): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('added_at');

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    portfolio_id: r.portfolio_id,
    symbol: r.symbol,
    shares: Number(r.shares),
    avgCost: Number(r.avg_cost),
    addedAt: r.added_at,
  }));
}

async function fetchSnapshotsForPortfolio(portfolioId: string): Promise<PortfolioSnapshot[]> {
  const { data, error } = await supabase
    .from('portfolio_snapshots')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('date');

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    portfolio_id: r.portfolio_id,
    date: r.date,
    total_value: Number(r.total_value),
    total_cost: Number(r.total_cost),
    day_change: Number(r.day_change),
  }));
}

export const usePortfolioStore = create<PortfolioState>()((set, get) => ({
  portfolios: [],
  activePortfolioId: null,
  positions: [],
  snapshots: [],
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null });

      const { data: portfolios, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at');

      if (error) throw error;

      let list: Portfolio[] = portfolios ?? [];

      // If no portfolios exist, create a default one
      if (list.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: newPortfolio, error: createErr } = await supabase
          .from('portfolios')
          .insert({ user_id: user.id, name: 'Default' })
          .select()
          .single();

        if (createErr) throw createErr;
        list = [newPortfolio];

        // Migrate from localStorage if available
        try {
          const stored = localStorage.getItem('celery-portfolio');
          if (stored) {
            const parsed = JSON.parse(stored);
            const oldPositions: Array<{ symbol: string; shares: number; avgCost: number }> =
              (parsed.state?.positions ?? []).map((p: { symbol: string; shares: number; avgCost: number }) => ({
                symbol: p.symbol,
                shares: p.shares,
                avgCost: p.avgCost,
              }));

            if (oldPositions.length > 0) {
              await supabase.from('positions').insert(
                oldPositions.map((p) => ({
                  portfolio_id: newPortfolio.id,
                  symbol: p.symbol,
                  shares: p.shares,
                  avg_cost: p.avgCost,
                }))
              );
            }
            localStorage.removeItem('celery-portfolio');
          }
        } catch {
          // Migration is best-effort
        }
      }

      const activeId = list[0].id;
      const [positions, snapshots] = await Promise.all([
        fetchPositionsForPortfolio(activeId),
        fetchSnapshotsForPortfolio(activeId),
      ]);

      set({
        portfolios: list,
        activePortfolioId: activeId,
        positions,
        snapshots,
        loading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createPortfolio: async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('portfolios')
        .insert({ user_id: user.id, name })
        .select()
        .single();

      if (error) throw error;

      set((s) => ({ portfolios: [...s.portfolios, data] }));

      // Switch to the new portfolio
      await get().setActivePortfolio(data.id);
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  renamePortfolio: async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .update({ name })
        .eq('id', id);

      if (error) throw error;

      set((s) => ({
        portfolios: s.portfolios.map((p) => (p.id === id ? { ...p, name } : p)),
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  deletePortfolio: async (id: string) => {
    const { portfolios } = get();
    if (portfolios.length <= 1) return; // prevent deleting last portfolio

    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const remaining = portfolios.filter((p) => p.id !== id);
      set({ portfolios: remaining });

      // If we deleted the active one, switch to the first remaining
      if (get().activePortfolioId === id) {
        await get().setActivePortfolio(remaining[0].id);
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  setActivePortfolio: async (id: string) => {
    try {
      set({ activePortfolioId: id, loading: true });
      const [positions, snapshots] = await Promise.all([
        fetchPositionsForPortfolio(id),
        fetchSnapshotsForPortfolio(id),
      ]);
      set({ positions, snapshots, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addPosition: async (data) => {
    const { activePortfolioId } = get();
    if (!activePortfolioId) return;

    try {
      const { data: row, error } = await supabase
        .from('positions')
        .insert({
          portfolio_id: activePortfolioId,
          symbol: data.symbol.toUpperCase(),
          shares: data.shares,
          avg_cost: data.avgCost,
        })
        .select()
        .single();

      if (error) throw error;

      const position: Position = {
        id: row.id,
        portfolio_id: row.portfolio_id,
        symbol: row.symbol,
        shares: Number(row.shares),
        avgCost: Number(row.avg_cost),
        addedAt: row.added_at,
      };

      set((s) => ({ positions: [...s.positions, position] }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  removePosition: async (positionId: string) => {
    // Optimistic update
    const prev = get().positions;
    set((s) => ({ positions: s.positions.filter((p) => p.id !== positionId) }));

    try {
      const { error } = await supabase
        .from('positions')
        .delete()
        .eq('id', positionId);

      if (error) {
        set({ positions: prev }); // rollback
        throw error;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  updatePosition: async (positionId: string, data) => {
    const prev = get().positions;
    set((s) => ({
      positions: s.positions.map((p) =>
        p.id === positionId
          ? { ...p, ...(data.shares !== undefined && { shares: data.shares }), ...(data.avgCost !== undefined && { avgCost: data.avgCost }) }
          : p
      ),
    }));

    try {
      const updates: Record<string, number> = {};
      if (data.shares !== undefined) updates.shares = data.shares;
      if (data.avgCost !== undefined) updates.avg_cost = data.avgCost;

      const { error } = await supabase
        .from('positions')
        .update(updates)
        .eq('id', positionId);

      if (error) {
        set({ positions: prev });
        throw error;
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  recordSnapshot: async (totalValue: number, totalCost: number, dayChange: number) => {
    const { activePortfolioId } = get();
    if (!activePortfolioId) return;

    const today = new Date().toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('portfolio_snapshots')
        .upsert(
          {
            portfolio_id: activePortfolioId,
            date: today,
            total_value: totalValue,
            total_cost: totalCost,
            day_change: dayChange,
          },
          { onConflict: 'portfolio_id,date' }
        )
        .select()
        .single();

      if (error) throw error;

      const snapshot: PortfolioSnapshot = {
        id: data.id,
        portfolio_id: data.portfolio_id,
        date: data.date,
        total_value: Number(data.total_value),
        total_cost: Number(data.total_cost),
        day_change: Number(data.day_change),
      };

      set((s) => {
        const filtered = s.snapshots.filter((snap) => snap.date !== today);
        return { snapshots: [...filtered, snapshot] };
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  fetchSnapshots: async (portfolioId: string) => {
    try {
      const snapshots = await fetchSnapshotsForPortfolio(portfolioId);
      set({ snapshots });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
}));
