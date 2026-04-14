'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLayoutStore, useLayoutHydrated } from '@/stores/layoutStore';
import { useAppStore } from '@/stores/appStore';
import CommandBar from '@/components/command/CommandBar';
import StatusBar from '@/components/layout/StatusBar';
import EmptyState from '@/components/layout/EmptyState';
import PanelHeader from '@/components/layout/PanelHeader';
import WindowRenderer from '@/components/layout/WindowRenderer';
import AddWindowMenu from '@/components/layout/AddWindowMenu';
import PanelErrorBoundary from '@/components/layout/PanelErrorBoundary';
import SnapPreview from '@/components/layout/SnapPreview';
import { useWindowShortcuts } from '@/hooks/useWindowShortcuts';
import { usePresence } from '@/hooks/usePresence';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUser } from '@/hooks/useUser';
import { WindowType } from '@/lib/types';
import { detectSnapZone, getSnapRect, type SnapZone } from '@/lib/windowSnap';
import { WINDOW_DEFAULTS } from '@/lib/constants';

const SYMBOL_EDITABLE_TYPES: Set<WindowType> = new Set([
  'chart', 'quote-monitor', 'stock-detail', 'financials', 'holders', 'filings', 'focus',
]);

export default function TerminalShell() {
  useWindowShortcuts();
  usePresence();
  useUserProfile();
  const hydrated = useLayoutHydrated();
  const { user, loading: authLoading } = useUser();
  const supabaseSynced = useRef(false);

  // Initialize layout from Supabase after localStorage hydration + auth resolution
  useEffect(() => {
    if (!hydrated || authLoading || supabaseSynced.current) return;
    supabaseSynced.current = true;
    if (user) {
      useLayoutStore.getState().initializeFromSupabase();
    }
  }, [hydrated, user, authLoading]);

  const {
    windows, layouts, removeWindow, updateWindowPosition, updateWindowSize,
    bringToFront, isDragging, setIsDragging, setViewportSize,
    minimizedWindows, pinnedWindows, toggleMinimize, togglePin,
    preSnapLayouts, setPreSnapLayout, clearPreSnapLayout, restorePreSnap,
  } = useLayoutStore();
  const activeSymbol = useAppStore((s) => s.activeSymbol);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuClosingRef = useRef(false);

  const closeMenu = useCallback(() => {
    if (menuClosingRef.current) return;
    menuClosingRef.current = true;
    setMenuClosing(true);
    setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      menuClosingRef.current = false;
    }, 150);
  }, []);

  const viewportRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [activeSnapZone, setActiveSnapZone] = useState<SnapZone>(null);
  const activeSnapZoneRef = useRef<SnapZone>(null);
  const snapDwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSnapZone = useRef<SnapZone>(null);

  isDraggingRef.current = isDragging;

  // Sync viewport dimensions to store for new window placement + clamp
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewportSize]);

  // Custom drag handler with snap detection
  const handleWindowMouseDown = useCallback((windowId: string, e: React.MouseEvent) => {
    const handle = (e.target as HTMLElement).closest('.drag-handle');
    if (!handle) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const isPinned = useLayoutStore.getState().pinnedWindows.includes(windowId);
    if (isPinned) return;

    e.preventDefault();
    bringToFront(windowId);
    setIsDragging(true);

    const layout = useLayoutStore.getState().layouts.find(l => l.i === windowId);
    if (!layout) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startLayoutX = layout.x;
    const startLayoutY = layout.y;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Detect snap zone relative to viewport (with dwell delay)
      const vpRect = viewportRef.current?.getBoundingClientRect();
      if (!vpRect) return;
      const cursorInVP_X = e.clientX - vpRect.left;
      const cursorInVP_Y = e.clientY - vpRect.top;
      const zone = detectSnapZone(cursorInVP_X, cursorInVP_Y, vpRect.width, vpRect.height);

      if (zone !== pendingSnapZone.current) {
        if (snapDwellTimer.current) {
          clearTimeout(snapDwellTimer.current);
          snapDwellTimer.current = null;
        }
        pendingSnapZone.current = zone;

        if (!zone) {
          activeSnapZoneRef.current = null;
          setActiveSnapZone(null);
        } else {
          snapDwellTimer.current = setTimeout(() => {
            activeSnapZoneRef.current = zone;
            setActiveSnapZone(zone);
            snapDwellTimer.current = null;
          }, 300);
        }
      }

      // Free position clamped to viewport
      const currentLayout = useLayoutStore.getState().layouts.find(l => l.i === windowId);
      const w = currentLayout?.w ?? layout.w;
      const h = currentLayout?.h ?? layout.h;
      const newX = Math.max(0, Math.min(startLayoutX + dx, vpRect.width - w));
      const newY = Math.max(0, Math.min(startLayoutY + dy, vpRect.height - h));
      updateWindowPosition(windowId, newX, newY);
    };

    const handleMouseUp = () => {
      if (snapDwellTimer.current) {
        clearTimeout(snapDwellTimer.current);
        snapDwellTimer.current = null;
      }
      pendingSnapZone.current = null;
      setIsDragging(false);
      const zone = activeSnapZoneRef.current;

      if (zone) {
        const vpRect = viewportRef.current?.getBoundingClientRect();
        if (vpRect) {
          // Store pre-snap geometry
          const currentLayout = useLayoutStore.getState().layouts.find(l => l.i === windowId);
          if (currentLayout) {
            // Only store pre-snap if not already snapped (use original free-floating size)
            const existing = useLayoutStore.getState().preSnapLayouts[windowId];
            if (!existing) {
              setPreSnapLayout(windowId, {
                x: startLayoutX, y: startLayoutY,
                w: currentLayout.w, h: currentLayout.h,
              });
            }
          }
          // Apply snap
          const snapRect = getSnapRect(zone, vpRect.width, vpRect.height);
          updateWindowPosition(windowId, snapRect.x, snapRect.y);
          updateWindowSize(windowId, snapRect.w, snapRect.h);
        }
      } else {
        // Dragged freely — clear any pre-snap state
        clearPreSnapLayout(windowId);
      }

      activeSnapZoneRef.current = null;
      setActiveSnapZone(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [bringToFront, setIsDragging, updateWindowPosition, updateWindowSize, setPreSnapLayout, clearPreSnapLayout]);

  // Double-click title bar to restore pre-snap geometry or reset to default size
  const handleWindowDoubleClick = useCallback((windowId: string, e: React.MouseEvent) => {
    const handle = (e.target as HTMLElement).closest('.drag-handle');
    if (!handle) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const state = useLayoutStore.getState();
    const hasPreSnap = state.preSnapLayouts[windowId];
    if (hasPreSnap) {
      restorePreSnap(windowId);
      return;
    }

    // Fallback: reset to default size for this window type
    const win = state.windows.find(w => w.id === windowId);
    if (!win) return;
    const defaults = WINDOW_DEFAULTS[win.type];
    if (!defaults) return;
    const layout = state.layouts.find(l => l.i === windowId);
    if (!layout) return;
    if (layout.w === defaults.w && layout.h === defaults.h) return;

    const vp = viewportRef.current?.getBoundingClientRect();
    const w = vp ? Math.min(defaults.w, vp.width) : defaults.w;
    const h = vp ? Math.min(defaults.h, vp.height) : defaults.h;
    const x = vp ? Math.max(0, Math.min(layout.x, vp.width - w)) : layout.x;
    const y = vp ? Math.max(0, Math.min(layout.y, vp.height - h)) : layout.y;

    updateWindowPosition(windowId, x, y);
    updateWindowSize(windowId, w, h);
  }, [restorePreSnap, updateWindowPosition, updateWindowSize]);

  // Custom resize handler
  const handleResizeMouseDown = useCallback((windowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isPinned = useLayoutStore.getState().pinnedWindows.includes(windowId);
    if (isPinned) return;

    bringToFront(windowId);
    setIsDragging(true);

    const layout = useLayoutStore.getState().layouts.find(l => l.i === windowId);
    if (!layout) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = layout.w;
    const startH = layout.h;

    const handleMouseMove = (e: MouseEvent) => {
      const dw = e.clientX - startX;
      const dh = e.clientY - startY;
      const vpRect = viewportRef.current?.getBoundingClientRect();
      const maxW = vpRect ? vpRect.width - layout.x : Infinity;
      const maxH = vpRect ? vpRect.height - layout.y : Infinity;
      updateWindowSize(windowId, Math.min(startW + dw, maxW), Math.min(startH + dh, maxH));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Clear pre-snap since user manually resized
      clearPreSnapLayout(windowId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [bringToFront, setIsDragging, updateWindowSize, clearPreSnapLayout]);

  if (!hydrated) {
    return <div className="flex flex-col h-screen" />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-stretch shrink-0">
        <CommandBar />
        <div className="relative z-[10000]">
          <button
            onClick={() => { if (menuOpen || menuClosing) { if (!menuClosing) closeMenu(); } else { setMenuOpen(true); } }}
            className="w-10 h-10 bg-terminal-panel border-b border-l border-terminal-border flex items-center justify-center text-text-muted hover:text-up hover:border-up/30 transition-colors text-lg font-mono cursor-pointer"
          >
            {menuOpen ? '−' : '+'}
          </button>
          {menuOpen && <AddWindowMenu onClose={closeMenu} closing={menuClosing} />}
        </div>
      </div>

      {/* Workspace viewport */}
      <div
        ref={viewportRef}
        className={`flex-1 overflow-hidden relative ${isDragging ? 'select-none' : ''}`}
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {windows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {windows.map((win) => {
              const layout = layouts.find(l => l.i === win.id);
              if (!layout) return null;
              const isEditable = SYMBOL_EDITABLE_TYPES.has(win.type);
              const effectiveSymbol = isEditable ? (win.symbol || activeSymbol) : win.symbol;
              const isMinimized = win.id in minimizedWindows;
              const isPinned = pinnedWindows.includes(win.id);

              return (
                <div
                  key={win.id}
                  onMouseDown={(e) => {
                    bringToFront(win.id);
                    handleWindowMouseDown(win.id, e);
                  }}
                  onDoubleClick={(e) => handleWindowDoubleClick(win.id, e)}
                  className={`absolute bg-terminal-panel rounded-md border overflow-hidden flex flex-col ${isPinned ? 'border-up/40' : 'border-terminal-border'}`}
                  style={{
                    left: layout.x,
                    top: layout.y,
                    width: layout.w,
                    height: layout.h,
                    zIndex: layout.zIndex,
                    transition: isDragging ? 'none' : 'left 200ms ease, top 200ms ease, width 200ms ease, height 200ms ease',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <PanelHeader
                    title={win.title}
                    windowId={win.id}
                    symbol={effectiveSymbol}
                    symbolEditable={isEditable}
                    onClose={() => removeWindow(win.id)}
                    isMinimized={isMinimized}
                    isPinned={isPinned}
                    onToggleMinimize={() => toggleMinimize(win.id)}
                    onTogglePin={() => togglePin(win.id)}
                  />
                  {!isMinimized && (
                    <div className="flex-1 overflow-hidden">
                      <PanelErrorBoundary windowId={win.id}>
                        <WindowRenderer config={win} />
                      </PanelErrorBoundary>
                    </div>
                  )}
                  {/* Resize handle */}
                  {!isMinimized && !isPinned && (
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(win.id, e)}
                      className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
                      style={{ zIndex: 1 }}
                    >
                      <div
                        className="absolute right-1 bottom-1"
                        style={{
                          width: 6,
                          height: 6,
                          borderRight: '2px solid rgba(255, 255, 255, 0.15)',
                          borderBottom: '2px solid rgba(255, 255, 255, 0.15)',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* Snap preview overlay */}
        <SnapPreview
          snapZone={activeSnapZone}
          viewportWidth={viewportRef.current?.clientWidth ?? 0}
          viewportHeight={viewportRef.current?.clientHeight ?? 0}
        />
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
