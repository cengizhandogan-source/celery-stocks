import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { WindowConfig, WindowType, LayoutItem } from '@/lib/types';
import { WINDOW_DEFAULTS, WINDOW_TYPE_LABELS } from '@/lib/constants';

interface LayoutState {
  windows: WindowConfig[];
  layouts: LayoutItem[];
  addWindow: (type: WindowType, symbol?: string) => void;
  removeWindow: (id: string) => void;
  updateLayout: (newLayouts: LayoutItem[]) => void;
  updateWindowSymbol: (id: string, symbol: string) => void;
  clearAll: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      windows: [],
      layouts: [],

      addWindow: (type, symbol) => set((state) => {
        const id = crypto.randomUUID();
        const defaults = WINDOW_DEFAULTS[type];
        const title = symbol
          ? `${WINDOW_TYPE_LABELS[type]} — ${symbol}`
          : WINDOW_TYPE_LABELS[type];

        const window: WindowConfig = { id, type, title, symbol };
        const layout: LayoutItem = {
          i: id,
          x: 0,
          y: Infinity,
          w: defaults.w,
          h: defaults.h,
          minW: defaults.minW,
          minH: defaults.minH,
        };

        return {
          windows: [...state.windows, window],
          layouts: [...state.layouts, layout],
        };
      }),

      removeWindow: (id) => set((state) => ({
        windows: state.windows.filter(w => w.id !== id),
        layouts: state.layouts.filter(l => l.i !== id),
      })),

      updateLayout: (newLayouts) => set((state) => {
        const mapped = newLayouts.map(nl => {
          const existing = state.layouts.find(l => l.i === nl.i);
          return {
            i: nl.i,
            x: nl.x,
            y: nl.y,
            w: nl.w,
            h: nl.h,
            minW: existing?.minW ?? nl.minW,
            minH: existing?.minH ?? nl.minH,
          };
        });
        return { layouts: mapped };
      }),

      updateWindowSymbol: (id, symbol) => set((state) => ({
        windows: state.windows.map(w =>
          w.id === id
            ? { ...w, symbol, title: `${WINDOW_TYPE_LABELS[w.type]} — ${symbol}` }
            : w
        ),
      })),

      clearAll: () => set({ windows: [], layouts: [] }),
    }),
    {
      name: 'celery-layout',
    }
  )
);

export const useLayoutHydrated = () => {
  const [hydrated, setHydrated] = useState(useLayoutStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useLayoutStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
};
