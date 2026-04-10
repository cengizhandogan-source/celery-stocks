import { create } from 'zustand';

interface AppState {
  activeSymbol: string;
  commandBarOpen: boolean;
  commandQuery: string;
  addWindowMenuOpen: boolean;
  setActiveSymbol: (symbol: string) => void;
  toggleCommandBar: () => void;
  setCommandQuery: (q: string) => void;
  setAddWindowMenuOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeSymbol: 'AAPL',
  commandBarOpen: false,
  commandQuery: '',
  addWindowMenuOpen: false,
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol, commandBarOpen: false, commandQuery: '' }),
  toggleCommandBar: () => set((s) => ({ commandBarOpen: !s.commandBarOpen, commandQuery: '' })),
  setCommandQuery: (q) => set({ commandQuery: q }),
  setAddWindowMenuOpen: (open) => set({ addWindowMenuOpen: open }),
}));
