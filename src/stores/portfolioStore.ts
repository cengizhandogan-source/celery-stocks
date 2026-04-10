import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Position } from '@/lib/types';

interface PortfolioState {
  positions: Position[];
  _hasHydrated: boolean;
  addPosition: (data: { symbol: string; shares: number; avgCost: number }) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, data: Partial<Pick<Position, 'shares' | 'avgCost'>>) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      positions: [],
      _hasHydrated: false,

      addPosition: (data) => set((state) => ({
        positions: [...state.positions, {
          id: crypto.randomUUID(),
          symbol: data.symbol.toUpperCase(),
          shares: data.shares,
          avgCost: data.avgCost,
          addedAt: new Date().toISOString(),
        }],
      })),

      removePosition: (id) => set((state) => ({
        positions: state.positions.filter(p => p.id !== id),
      })),

      updatePosition: (id, data) => set((state) => ({
        positions: state.positions.map(p =>
          p.id === id ? { ...p, ...data } : p
        ),
      })),
    }),
    {
      name: 'celery-portfolio',
      onRehydrateStorage: () => () => {
        usePortfolioStore.setState({ _hasHydrated: true });
      },
    }
  )
);
