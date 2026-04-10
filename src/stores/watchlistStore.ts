import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WATCHLIST_SYMBOLS } from '@/lib/constants';

interface WatchlistState {
  symbols: string[];
  _hasHydrated: boolean;
  addSymbol: (symbol: string) => void;
  removeSymbol: (symbol: string) => void;
  reorderSymbols: (fromIndex: number, toIndex: number) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      symbols: DEFAULT_WATCHLIST_SYMBOLS,
      _hasHydrated: false,

      addSymbol: (symbol) => set((state) => {
        const upper = symbol.toUpperCase();
        if (state.symbols.includes(upper)) return state;
        return { symbols: [...state.symbols, upper] };
      }),

      removeSymbol: (symbol) => set((state) => ({
        symbols: state.symbols.filter(s => s !== symbol),
      })),

      reorderSymbols: (fromIndex, toIndex) => set((state) => {
        const symbols = [...state.symbols];
        const [moved] = symbols.splice(fromIndex, 1);
        symbols.splice(toIndex, 0, moved);
        return { symbols };
      }),
    }),
    {
      name: 'celery-watchlist',
      onRehydrateStorage: () => () => {
        useWatchlistStore.setState({ _hasHydrated: true });
      },
    }
  )
);
