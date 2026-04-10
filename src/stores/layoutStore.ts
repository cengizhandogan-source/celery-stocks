import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { WindowConfig, WindowType, LayoutItem } from '@/lib/types';
import { WINDOW_DEFAULTS, WINDOW_TYPE_LABELS, CASCADE_OFFSET, PANEL_HEADER_HEIGHT } from '@/lib/constants';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// --- Cached auth for synchronous access in beforeunload ---

let cachedUserId: string | null = null;
let cachedAccessToken: string | null = null;
let lastSavedJson = '';

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedUserId = session?.user?.id ?? null;
    cachedAccessToken = session?.access_token ?? null;
  });
  supabase.auth.getSession().then(({ data: { session } }) => {
    cachedUserId = session?.user?.id ?? null;
    cachedAccessToken = session?.access_token ?? null;
  });
}

// --- Supabase helpers ---

interface PersistedLayout {
  windows: WindowConfig[];
  layouts: LayoutItem[];
  maxZIndex: number;
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  minimizedWindows: Record<string, { h: number; minH: number }>;
  pinnedWindows: string[];
}

async function saveLayoutToSupabase(data: PersistedLayout): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Keep unload cache fresh
    const { data: { session } } = await supabase.auth.getSession();
    cachedUserId = user.id;
    cachedAccessToken = session?.access_token ?? null;

    await supabase.from('user_layouts').upsert(
      { user_id: user.id, layout_data: data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

    lastSavedJson = JSON.stringify(data);
  } catch {
    // Silently fail — localStorage is the fallback
  }
}

async function loadLayoutFromSupabase(): Promise<PersistedLayout | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('user_layouts')
      .select('layout_data')
      .eq('user_id', user.id)
      .single();
    return data?.layout_data as PersistedLayout | null;
  } catch {
    return null;
  }
}

function migrateLayoutData(layouts: LayoutItem[]): { layouts: LayoutItem[]; maxZIndex: number } {
  if (layouts.length === 0) return { layouts, maxZIndex: 0 };

  const needsMigration = layouts.some(l => l.w > 0 && l.w < 20);
  if (needsMigration) {
    const COL_PX = 100;
    const ROW_PX = 80;
    const migrated = layouts.map((l, idx) => ({
      ...l,
      x: l.x * COL_PX,
      y: l.y * ROW_PX,
      w: l.w * COL_PX,
      h: l.h * ROW_PX,
      minW: (l.minW ?? 2) * COL_PX,
      minH: (l.minH ?? 2) * ROW_PX,
      zIndex: l.zIndex ?? idx,
    }));
    return { layouts: migrated, maxZIndex: migrated.length };
  }

  const fixed = layouts.map((l, idx) => ({
    ...l,
    zIndex: l.zIndex ?? idx,
    y: Number.isFinite(l.y) ? l.y : 0,
  }));
  return { layouts: fixed, maxZIndex: Math.max(0, ...fixed.map(l => l.zIndex ?? 0)) };
}

// --- Hydration guard for debounced save ---

let isHydrating = false;

// --- Store ---

interface LayoutState {
  windows: WindowConfig[];
  layouts: LayoutItem[];
  maxZIndex: number;
  canvasOffset: { x: number; y: number };
  viewportSize: { width: number; height: number };
  isDragging: boolean;
  minimizedWindows: Record<string, { h: number; minH: number }>;
  pinnedWindows: string[];
  addWindow: (type: WindowType, symbol?: string, position?: { x: number; y: number }) => void;
  removeWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
  updateWindowSymbol: (id: string, symbol: string) => void;
  addWindowSymbol: (id: string, symbol: string, defaults: string[]) => void;
  removeWindowSymbol: (id: string, symbol: string) => void;
  updateWindowContent: (id: string, content: string) => void;
  canvasScale: number;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  resetCanvasOffset: () => void;
  setCanvasScale: (scale: number) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  setIsDragging: (v: boolean) => void;
  toggleMinimize: (id: string) => void;
  togglePin: (id: string) => void;
  updateLayout: (layout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  clearAll: () => void;
  initializeFromSupabase: () => Promise<void>;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      windows: [],
      layouts: [],
      maxZIndex: 0,
      canvasOffset: { x: 0, y: 0 },
      viewportSize: { width: 0, height: 0 },
      canvasScale: 1,
      isDragging: false,
      minimizedWindows: {},
      pinnedWindows: [],

      addWindow: (type, symbol, position) => set((state) => {
        const id = crypto.randomUUID();
        const defaults = WINDOW_DEFAULTS[type];
        const title = symbol
          ? `${WINDOW_TYPE_LABELS[type]} — ${symbol}`
          : WINDOW_TYPE_LABELS[type];

        // Center the window on the given position
        let x = (position?.x ?? 0) - defaults.w / 2;
        let y = (position?.y ?? 0) - defaults.h / 2;
        x = Math.max(0, x);
        y = Math.max(0, y);

        // Cascade: offset if another window is near the same position
        while (state.layouts.some(l => Math.abs(l.x - x) < 10 && Math.abs(l.y - y) < 10)) {
          x += CASCADE_OFFSET;
          y += CASCADE_OFFSET;
        }

        const newZIndex = state.maxZIndex + 1;
        const window: WindowConfig = { id, type, title, symbol };
        const layout: LayoutItem = {
          i: id,
          x,
          y,
          w: defaults.w,
          h: defaults.h,
          minW: defaults.minW,
          minH: defaults.minH,
          zIndex: newZIndex,
        };

        return {
          windows: [...state.windows, window],
          layouts: [...state.layouts, layout],
          maxZIndex: newZIndex,
        };
      }),

      removeWindow: (id) => set((state) => {
        const { [id]: _, ...restMinimized } = state.minimizedWindows;
        return {
          windows: state.windows.filter(w => w.id !== id),
          layouts: state.layouts.filter(l => l.i !== id),
          minimizedWindows: restMinimized,
          pinnedWindows: state.pinnedWindows.filter(p => p !== id),
        };
      }),

      updateWindowPosition: (id, x, y) => set((state) => ({
        layouts: state.layouts.map(l => l.i === id ? { ...l, x, y } : l),
      })),

      updateWindowSize: (id, w, h) => set((state) => ({
        layouts: state.layouts.map(l => {
          if (l.i !== id) return l;
          return {
            ...l,
            w: Math.max(w, l.minW ?? 0),
            h: Math.max(h, l.minH ?? 0),
          };
        }),
      })),

      bringToFront: (id) => set((state) => {
        const layout = state.layouts.find(l => l.i === id);
        if (!layout || layout.zIndex === state.maxZIndex) return {};
        const newZ = state.maxZIndex + 1;
        return {
          maxZIndex: newZ,
          layouts: state.layouts.map(l =>
            l.i === id ? { ...l, zIndex: newZ } : l
          ),
        };
      }),

      updateWindowSymbol: (id, symbol) => set((state) => ({
        windows: state.windows.map(w =>
          w.id === id
            ? { ...w, symbol, title: `${WINDOW_TYPE_LABELS[w.type]} — ${symbol}` }
            : w
        ),
      })),

      addWindowSymbol: (id, symbol, defaults) => set((state) => ({
        windows: state.windows.map(w => {
          if (w.id !== id) return w;
          const current = w.symbols ?? defaults;
          const upper = symbol.toUpperCase();
          if (current.some(s => s.toUpperCase() === upper)) return w;
          return { ...w, symbols: [...current, symbol] };
        }),
      })),

      removeWindowSymbol: (id, symbol) => set((state) => ({
        windows: state.windows.map(w => {
          if (w.id !== id) return w;
          if (!w.symbols) return w;
          return { ...w, symbols: w.symbols.filter(s => s !== symbol) };
        }),
      })),

      updateWindowContent: (id, content) => set((state) => ({
        windows: state.windows.map(w =>
          w.id === id ? { ...w, content } : w
        ),
      })),

      toggleMinimize: (id) => set((state) => {
        const isMinimized = id in state.minimizedWindows;
        if (isMinimized) {
          const saved = state.minimizedWindows[id];
          const { [id]: _, ...rest } = state.minimizedWindows;
          return {
            minimizedWindows: rest,
            layouts: state.layouts.map(l =>
              l.i === id ? { ...l, h: saved.h, minH: saved.minH } : l
            ),
          };
        } else {
          const layout = state.layouts.find(l => l.i === id);
          if (!layout) return {};
          return {
            minimizedWindows: {
              ...state.minimizedWindows,
              [id]: { h: layout.h, minH: layout.minH ?? 0 },
            },
            layouts: state.layouts.map(l =>
              l.i === id ? { ...l, h: PANEL_HEADER_HEIGHT, minH: PANEL_HEADER_HEIGHT } : l
            ),
          };
        }
      }),

      togglePin: (id) => set((state) => ({
        pinnedWindows: state.pinnedWindows.includes(id)
          ? state.pinnedWindows.filter(p => p !== id)
          : [...state.pinnedWindows, id],
      })),

      setCanvasOffset: (offset) => set({ canvasOffset: offset }),
      setCanvasScale: (scale) => set({ canvasScale: Math.min(2, Math.max(0.25, scale)) }),
      resetCanvasOffset: () => set((state) => {
        const { layouts, viewportSize } = state;
        if (layouts.length === 0) return { canvasOffset: { x: 0, y: 0 }, canvasScale: 1 };

        let sumX = 0;
        let sumY = 0;
        for (const item of layouts) {
          sumX += item.x + item.w / 2;
          sumY += item.y + item.h / 2;
        }
        const centroidX = sumX / layouts.length;
        const centroidY = sumY / layouts.length;

        return {
          canvasScale: 1,
          canvasOffset: {
            x: -(centroidX - viewportSize.width / 2),
            y: -(centroidY - viewportSize.height / 2),
          },
        };
      }),
      setViewportSize: (size) => set({ viewportSize: size }),
      setIsDragging: (v) => set({ isDragging: v }),

      updateLayout: (layout) => set((state) => ({
        layouts: state.layouts.map(existing => {
          const updated = layout.find(l => l.i === existing.i);
          return updated ? { ...existing, x: updated.x, y: updated.y, w: updated.w, h: updated.h } : existing;
        }),
      })),

      clearAll: () => set({ windows: [], layouts: [], maxZIndex: 0, canvasOffset: { x: 0, y: 0 }, canvasScale: 1, minimizedWindows: {}, pinnedWindows: [] }),

      initializeFromSupabase: async () => {
        isHydrating = true;
        try {
          const cloudData = await loadLayoutFromSupabase();
          if (cloudData && cloudData.layouts && cloudData.layouts.length > 0) {
            // Cloud data exists — apply it (with migration if needed)
            const migrated = migrateLayoutData(cloudData.layouts);
            set({
              windows: cloudData.windows,
              layouts: migrated.layouts,
              maxZIndex: migrated.maxZIndex,
              canvasOffset: cloudData.canvasOffset ?? { x: 0, y: 0 },
              canvasScale: cloudData.canvasScale ?? 1,
              minimizedWindows: cloudData.minimizedWindows ?? {},
              pinnedWindows: cloudData.pinnedWindows ?? [],
            });
          } else {
            // No cloud data — migrate current localStorage state up to Supabase
            const state = get();
            const localData: PersistedLayout = {
              windows: state.windows,
              layouts: state.layouts,
              maxZIndex: state.maxZIndex,
              canvasOffset: state.canvasOffset,
              canvasScale: state.canvasScale,
              minimizedWindows: state.minimizedWindows,
              pinnedWindows: state.pinnedWindows,
            };
            if (localData.windows.length > 0) {
              await saveLayoutToSupabase(localData);
            }
          }
        } finally {
          isHydrating = false;
        }
      },
    }),
    {
      name: 'celery-layout',
      partialize: (state) => ({
        windows: state.windows,
        layouts: state.layouts,
        maxZIndex: state.maxZIndex,
        canvasOffset: state.canvasOffset,
        canvasScale: state.canvasScale,
        minimizedWindows: state.minimizedWindows,
        pinnedWindows: state.pinnedWindows,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state?.layouts || state.layouts.length === 0) return;
        const migrated = migrateLayoutData(state.layouts);
        state.layouts = migrated.layouts;
        state.maxZIndex = migrated.maxZIndex;
      },
    }
  )
);

// --- Debounced save to Supabase ---

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 2500;

useLayoutStore.subscribe((state) => {
  if (isHydrating) return;
  if (state.isDragging) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const s = useLayoutStore.getState();
    saveLayoutToSupabase({
      windows: s.windows,
      layouts: s.layouts,
      maxZIndex: s.maxZIndex,
      canvasOffset: s.canvasOffset,
      canvasScale: s.canvasScale,
      minimizedWindows: s.minimizedWindows,
      pinnedWindows: s.pinnedWindows,
    });
  }, SAVE_DEBOUNCE_MS);
});

// Synchronous save for unload/visibility-change events
function flushSaveSync(): void {
  if (!cachedUserId || !cachedAccessToken) return;

  const s = useLayoutStore.getState();
  const data: PersistedLayout = {
    windows: s.windows,
    layouts: s.layouts,
    maxZIndex: s.maxZIndex,
    canvasOffset: s.canvasOffset,
    canvasScale: s.canvasScale,
    minimizedWindows: s.minimizedWindows,
    pinnedWindows: s.pinnedWindows,
  };

  const json = JSON.stringify(data);
  if (json === lastSavedJson) return;

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/user_layouts?on_conflict=user_id`;
  try {
    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        'Authorization': `Bearer ${cachedAccessToken}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: cachedUserId,
        layout_data: data,
        updated_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Best effort
  }
}

// Flush pending save on page unload + tab hide
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    flushSaveSync();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      flushSaveSync();
    }
  });
}

// --- Exports ---

export function getViewportCenterPosition(): { x: number; y: number } {
  const state = useLayoutStore.getState();
  const { canvasOffset, canvasScale, viewportSize } = state;
  const { width, height } = viewportSize;

  if (width === 0 || height === 0) return { x: 0, y: 0 };

  return {
    x: (width / 2 - canvasOffset.x) / canvasScale,
    y: (height / 2 - canvasOffset.y) / canvasScale,
  };
}

export const useLayoutHydrated = () => {
  const [hydrated, setHydrated] = useState(useLayoutStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useLayoutStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
};
