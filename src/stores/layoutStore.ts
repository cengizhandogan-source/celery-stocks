import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useState, useEffect } from 'react';
import { WindowConfig, WindowType, LayoutItem, PageData } from '@/lib/types';
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

// --- Types ---

interface PersistedLayout {
  windows: WindowConfig[];
  layouts: LayoutItem[];
  maxZIndex: number;
  minimizedWindows: Record<string, { h: number; minH: number }>;
  pinnedWindows: string[];
}

interface PersistedLayoutV2 {
  version: 2;
  activePage: number;
  pages: PageData[];
}

// --- Helpers ---

function emptyPage(name: string): PageData {
  return { name, windows: [], layouts: [], maxZIndex: 0, minimizedWindows: {}, pinnedWindows: [] };
}

function snapshotPage(state: { windows: WindowConfig[]; layouts: LayoutItem[]; maxZIndex: number; minimizedWindows: Record<string, { h: number; minH: number }>; pinnedWindows: string[]; pages: PageData[]; activePage: number }): PageData {
  return {
    name: state.pages[state.activePage]?.name ?? 'Page 1',
    windows: state.windows,
    layouts: state.layouts,
    maxZIndex: state.maxZIndex,
    minimizedWindows: state.minimizedWindows,
    pinnedWindows: state.pinnedWindows,
  };
}

function buildV2(state: { windows: WindowConfig[]; layouts: LayoutItem[]; maxZIndex: number; minimizedWindows: Record<string, { h: number; minH: number }>; pinnedWindows: string[]; pages: PageData[]; activePage: number }): PersistedLayoutV2 {
  const pages = state.pages.map((p, i) =>
    i === state.activePage ? snapshotPage(state) : p
  );
  return { version: 2, activePage: state.activePage, pages };
}

function migrateV1toV2(data: PersistedLayout): PersistedLayoutV2 {
  return {
    version: 2,
    activePage: 0,
    pages: [{
      name: 'Page 1',
      windows: data.windows,
      layouts: data.layouts,
      maxZIndex: data.maxZIndex,
      minimizedWindows: data.minimizedWindows ?? {},
      pinnedWindows: data.pinnedWindows ?? [],
    }],
  };
}

function isV2(data: unknown): data is PersistedLayoutV2 {
  return typeof data === 'object' && data !== null && 'version' in data && (data as PersistedLayoutV2).version === 2;
}

function toV2(data: unknown): PersistedLayoutV2 {
  if (isV2(data)) return data;
  return migrateV1toV2(data as PersistedLayout);
}

// --- Supabase helpers ---

async function saveLayoutToSupabase(data: PersistedLayoutV2): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

async function loadLayoutFromSupabase(): Promise<PersistedLayoutV2 | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('user_layouts')
      .select('layout_data')
      .eq('user_id', user.id)
      .single();
    if (!data?.layout_data) return null;
    return toV2(data.layout_data);
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

function migratePages(pages: PageData[]): PageData[] {
  return pages.map(p => {
    // Rename old window types
    const windows = p.windows.map(w =>
      w.type === ('ideas' as string) ? { ...w, type: 'feed' as WindowConfig['type'] } : w
    );
    if (p.layouts.length === 0) return { ...p, windows };
    const migrated = migrateLayoutData(p.layouts);
    return { ...p, windows, layouts: migrated.layouts, maxZIndex: migrated.maxZIndex };
  });
}

// --- Hydration guard for debounced save ---

let isHydrating = false;

// --- Store ---

interface LayoutState {
  windows: WindowConfig[];
  layouts: LayoutItem[];
  maxZIndex: number;
  viewportSize: { width: number; height: number };
  isDragging: boolean;
  minimizedWindows: Record<string, { h: number; minH: number }>;
  pinnedWindows: string[];
  preSnapLayouts: Record<string, { x: number; y: number; w: number; h: number }>;
  activePage: number;
  pages: PageData[];
  addWindow: (type: WindowType, symbol?: string, strategyId?: string, position?: { x: number; y: number }) => void;
  removeWindow: (id: string) => void;
  updateWindowPosition: (id: string, x: number, y: number) => void;
  updateWindowSize: (id: string, w: number, h: number) => void;
  bringToFront: (id: string) => void;
  updateWindowSymbol: (id: string, symbol: string) => void;
  addWindowSymbol: (id: string, symbol: string, defaults: string[]) => void;
  removeWindowSymbol: (id: string, symbol: string) => void;
  updateWindowContent: (id: string, content: string) => void;
  setViewportSize: (size: { width: number; height: number }) => void;
  setIsDragging: (v: boolean) => void;
  toggleMinimize: (id: string) => void;
  togglePin: (id: string) => void;
  setPreSnapLayout: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  clearPreSnapLayout: (id: string) => void;
  restorePreSnap: (id: string) => void;
  updateLayout: (layout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  clearAll: () => void;
  initializeFromSupabase: () => Promise<void>;
  switchPage: (index: number) => void;
  addPage: () => void;
  removePage: (index: number) => void;
  renamePage: (index: number, name: string) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      windows: [],
      layouts: [],
      maxZIndex: 0,
      viewportSize: { width: 0, height: 0 },
      isDragging: false,
      minimizedWindows: {},
      pinnedWindows: [],
      preSnapLayouts: {},
      activePage: 0,
      pages: [emptyPage('Page 1')],

      addWindow: (type, symbol, strategyId, position) => set((state) => {
        const id = crypto.randomUUID();
        const defaults = WINDOW_DEFAULTS[type];
        const title = symbol
          ? `${WINDOW_TYPE_LABELS[type]} — ${symbol}`
          : WINDOW_TYPE_LABELS[type];

        const { width: vpW, height: vpH } = state.viewportSize;
        const w = Math.min(defaults.w, vpW || defaults.w);
        const h = Math.min(defaults.h, vpH || defaults.h);

        let x = (position?.x ?? 0) - w / 2;
        let y = (position?.y ?? 0) - h / 2;

        if (vpW > 0) x = Math.max(0, Math.min(x, vpW - w));
        if (vpH > 0) y = Math.max(0, Math.min(y, vpH - h));

        while (state.layouts.some(l => Math.abs(l.x - x) < 10 && Math.abs(l.y - y) < 10)) {
          x += CASCADE_OFFSET;
          y += CASCADE_OFFSET;
        }

        if (vpW > 0) x = Math.max(0, Math.min(x, vpW - w));
        if (vpH > 0) y = Math.max(0, Math.min(y, vpH - h));

        const newZIndex = state.maxZIndex + 1;
        const window: WindowConfig = { id, type, title, symbol, strategyId };
        const layout: LayoutItem = {
          i: id,
          x,
          y,
          w,
          h,
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

      setPreSnapLayout: (id, rect) => set((state) => ({
        preSnapLayouts: { ...state.preSnapLayouts, [id]: rect },
      })),

      clearPreSnapLayout: (id) => set((state) => {
        const { [id]: _, ...rest } = state.preSnapLayouts;
        return { preSnapLayouts: rest };
      }),

      restorePreSnap: (id) => set((state) => {
        const saved = state.preSnapLayouts[id];
        if (!saved) return {};
        const { [id]: _, ...rest } = state.preSnapLayouts;
        return {
          preSnapLayouts: rest,
          layouts: state.layouts.map(l =>
            l.i === id ? { ...l, x: saved.x, y: saved.y, w: saved.w, h: saved.h } : l
          ),
        };
      }),

      setViewportSize: (size) => set((state) => {
        if (size.width === 0 || size.height === 0) return { viewportSize: size };
        const layouts = state.layouts.map(l => {
          const w = Math.min(l.w, size.width);
          const h = Math.min(l.h, size.height);
          const x = Math.max(0, Math.min(l.x, size.width - w));
          const y = Math.max(0, Math.min(l.y, size.height - h));
          return { ...l, x, y, w, h };
        });
        return { viewportSize: size, layouts };
      }),
      setIsDragging: (v) => set({ isDragging: v }),

      updateLayout: (layout) => set((state) => ({
        layouts: state.layouts.map(existing => {
          const updated = layout.find(l => l.i === existing.i);
          return updated ? { ...existing, x: updated.x, y: updated.y, w: updated.w, h: updated.h } : existing;
        }),
      })),

      clearAll: () => set({
        windows: [],
        layouts: [],
        maxZIndex: 0,
        minimizedWindows: {},
        pinnedWindows: [],
        preSnapLayouts: {},
        activePage: 0,
        pages: [emptyPage('Page 1')],
      }),

      switchPage: (index) => set((state) => {
        if (index === state.activePage) return {};
        if (index < 0 || index >= state.pages.length) return {};
        // Save current page
        const updatedPages = state.pages.map((p, i) =>
          i === state.activePage ? snapshotPage(state) : p
        );
        // Load target page
        const target = updatedPages[index];
        return {
          activePage: index,
          pages: updatedPages,
          windows: target.windows,
          layouts: target.layouts,
          maxZIndex: target.maxZIndex,
          minimizedWindows: target.minimizedWindows,
          pinnedWindows: target.pinnedWindows,
          preSnapLayouts: {},
        };
      }),

      addPage: () => set((state) => {
        if (state.pages.length >= 3) return {};
        const newName = `Page ${state.pages.length + 1}`;
        // Save current page before switching
        const updatedPages = state.pages.map((p, i) =>
          i === state.activePage ? snapshotPage(state) : p
        );
        const newPage = emptyPage(newName);
        const newIndex = updatedPages.length;
        return {
          pages: [...updatedPages, newPage],
          activePage: newIndex,
          windows: newPage.windows,
          layouts: newPage.layouts,
          maxZIndex: newPage.maxZIndex,
          minimizedWindows: newPage.minimizedWindows,
          pinnedWindows: newPage.pinnedWindows,
          preSnapLayouts: {},
        };
      }),

      removePage: (index) => set((state) => {
        if (state.pages.length <= 1) return {};
        // Save current page first
        const updatedPages = state.pages.map((p, i) =>
          i === state.activePage ? snapshotPage(state) : p
        );
        const remaining = updatedPages.filter((_, i) => i !== index);
        // Determine new active page
        let newActive = state.activePage;
        if (index === state.activePage) {
          newActive = Math.min(index, remaining.length - 1);
        } else if (index < state.activePage) {
          newActive = state.activePage - 1;
        }
        const target = remaining[newActive];
        return {
          pages: remaining,
          activePage: newActive,
          windows: target.windows,
          layouts: target.layouts,
          maxZIndex: target.maxZIndex,
          minimizedWindows: target.minimizedWindows,
          pinnedWindows: target.pinnedWindows,
          preSnapLayouts: {},
        };
      }),

      renamePage: (index, name) => set((state) => ({
        pages: state.pages.map((p, i) =>
          i === index ? { ...(i === state.activePage ? snapshotPage(state) : p), name } : p
        ),
      })),

      initializeFromSupabase: async () => {
        isHydrating = true;
        try {
          const cloudData = await loadLayoutFromSupabase();
          if (cloudData && cloudData.pages.length > 0 && cloudData.pages.some(p => p.layouts.length > 0)) {
            const migratedPages = migratePages(cloudData.pages);
            const active = Math.min(cloudData.activePage, migratedPages.length - 1);
            const target = migratedPages[active];
            set({
              pages: migratedPages,
              activePage: active,
              windows: target.windows,
              layouts: target.layouts,
              maxZIndex: target.maxZIndex,
              minimizedWindows: target.minimizedWindows ?? {},
              pinnedWindows: target.pinnedWindows ?? [],
            });
          } else {
            // No cloud data — migrate current localStorage state up to Supabase
            const state = get();
            const v2 = buildV2(state);
            if (state.windows.length > 0) {
              await saveLayoutToSupabase(v2);
            }
          }
        } finally {
          isHydrating = false;
        }
      },
    }),
    {
      name: 'celery-layout',
      partialize: (state) => {
        const v2 = buildV2(state);
        return v2 as unknown as Record<string, unknown>;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Check if this is V2 data (persisted via partialize)
        const raw = state as unknown as Record<string, unknown>;
        if (raw.version === 2 && Array.isArray(raw.pages)) {
          const v2 = raw as unknown as PersistedLayoutV2;
          const migratedPages = migratePages(v2.pages);
          const active = Math.min(v2.activePage, migratedPages.length - 1);
          const target = migratedPages[active];
          state.pages = migratedPages;
          state.activePage = active;
          state.windows = target.windows;
          state.layouts = target.layouts;
          state.maxZIndex = target.maxZIndex;
          state.minimizedWindows = target.minimizedWindows ?? {};
          state.pinnedWindows = target.pinnedWindows ?? [];
        } else {
          // V1 data — migrate
          if (state.layouts && state.layouts.length > 0) {
            const migrated = migrateLayoutData(state.layouts);
            state.layouts = migrated.layouts;
            state.maxZIndex = migrated.maxZIndex;
          }
          state.pages = [{
            name: 'Page 1',
            windows: state.windows,
            layouts: state.layouts,
            maxZIndex: state.maxZIndex,
            minimizedWindows: state.minimizedWindows ?? {},
            pinnedWindows: state.pinnedWindows ?? [],
          }];
          state.activePage = 0;
        }
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
    saveLayoutToSupabase(buildV2(s));
  }, SAVE_DEBOUNCE_MS);
});

// Synchronous save for unload/visibility-change events
function flushSaveSync(): void {
  if (!cachedUserId || !cachedAccessToken) return;

  const s = useLayoutStore.getState();
  const data = buildV2(s);

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
  const { viewportSize } = useLayoutStore.getState();
  const { width, height } = viewportSize;
  return { x: width / 2, y: height / 2 };
}

export const useLayoutHydrated = () => {
  const [hydrated, setHydrated] = useState(useLayoutStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useLayoutStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
};
