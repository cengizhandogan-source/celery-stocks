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
import Minimap from '@/components/layout/Minimap';
import { useWindowShortcuts } from '@/hooks/useWindowShortcuts';
import { usePresence } from '@/hooks/usePresence';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUser } from '@/hooks/useUser';
import { WindowType, LayoutItem } from '@/lib/types';

const SYMBOL_EDITABLE_TYPES: Set<WindowType> = new Set([
  'chart', 'quote-monitor', 'stock-detail', 'financials', 'holders', 'filings', 'focus',
]);

const CANVAS_OVERSHOOT = 300;
const MIN_CANVAS_SIZE = 1200;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 1.2;

function getCanvasBounds(
  layouts: LayoutItem[],
  viewportWidth: number,
  viewportHeight: number,
) {
  if (layouts.length === 0) {
    const halfW = Math.max(MIN_CANVAS_SIZE, viewportWidth) / 2;
    const halfH = Math.max(MIN_CANVAS_SIZE, viewportHeight) / 2;
    return { minX: -halfW, minY: -halfH, maxX: halfW, maxY: halfH };
  }

  let contentMaxX = 0;
  let contentMaxY = 0;
  for (const item of layouts) {
    if (!Number.isFinite(item.y)) continue;
    contentMaxX = Math.max(contentMaxX, item.x + item.w);
    contentMaxY = Math.max(contentMaxY, item.y + item.h);
  }

  const canvasW = Math.max(contentMaxX + CANVAS_OVERSHOOT, MIN_CANVAS_SIZE);
  const canvasH = Math.max(contentMaxY + CANVAS_OVERSHOOT, MIN_CANVAS_SIZE);

  return { minX: 0, minY: 0, maxX: canvasW, maxY: canvasH };
}

function clampOffset(
  offset: { x: number; y: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  viewportWidth: number,
  viewportHeight: number,
) {
  const maxOffsetX = -bounds.minX;
  const minOffsetX = -(bounds.maxX - viewportWidth);
  const maxOffsetY = -bounds.minY;
  const minOffsetY = -(bounds.maxY - viewportHeight);

  return {
    x: Math.min(maxOffsetX, Math.max(minOffsetX, offset.x)),
    y: Math.min(maxOffsetY, Math.max(minOffsetY, offset.y)),
  };
}

function zoomToCenter(
  oldScale: number,
  newScale: number,
  offset: { x: number; y: number },
  vw: number,
  vh: number,
) {
  const cx = (vw / 2 - offset.x) / oldScale;
  const cy = (vh / 2 - offset.y) / oldScale;
  return { x: vw / 2 - cx * newScale, y: vh / 2 - cy * newScale };
}

function clampScale(s: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));
}

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
  const { windows, layouts, removeWindow, updateWindowPosition, updateWindowSize, bringToFront, canvasOffset, setCanvasOffset, canvasScale, setCanvasScale, isDragging, setIsDragging, setViewportSize, minimizedWindows, pinnedWindows, toggleMinimize, togglePin } = useLayoutStore();
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

  isDraggingRef.current = isDragging;

  // Wheel handler for 2-finger trackpad pan + pinch-to-zoom
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (isDraggingRef.current) return;
      if ((e.target as HTMLElement).closest?.('.bg-terminal-panel')) return;

      // Pinch-to-zoom (trackpad pinch reports as ctrlKey + deltaY)
      if (e.ctrlKey) {
        e.preventDefault();
        const state = useLayoutStore.getState();
        const oldScale = state.canvasScale;
        const newScale = clampScale(oldScale * (1 - e.deltaY * 0.01));
        const vw = el.clientWidth;
        const vh = el.clientHeight;
        const newOffset = zoomToCenter(oldScale, newScale, state.canvasOffset, vw, vh);
        const bounds = getCanvasBounds(state.layouts, vw / newScale, vh / newScale);
        setCanvasScale(newScale);
        setCanvasOffset(clampOffset(newOffset, bounds, vw / newScale, vh / newScale));
        return;
      }

      // Pan with Cmd+Scroll
      if (!e.metaKey) return;
      e.preventDefault();
      const state = useLayoutStore.getState();
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      const scale = state.canvasScale;
      const bounds = getCanvasBounds(state.layouts, vw / scale, vh / scale);
      const raw = {
        x: state.canvasOffset.x - e.deltaX,
        y: state.canvasOffset.y - e.deltaY,
      };
      setCanvasOffset(clampOffset(raw, bounds, vw / scale, vh / scale));
    };

    document.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => document.removeEventListener('wheel', handleWheel, { capture: true });
  }, [setCanvasOffset, setCanvasScale]);

  // Keyboard zoom: Cmd+= (in), Cmd+- (out), Cmd+0 (reset)
  useEffect(() => {
    const el = viewportRef.current;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey) return;
      const key = e.key;
      if (key !== '=' && key !== '+' && key !== '-' && key !== '0') return;
      e.preventDefault();

      const state = useLayoutStore.getState();
      const vw = el?.clientWidth ?? 0;
      const vh = el?.clientHeight ?? 0;

      if (key === '0') {
        const newOffset = zoomToCenter(state.canvasScale, 1, state.canvasOffset, vw, vh);
        const bounds = getCanvasBounds(state.layouts, vw, vh);
        setCanvasScale(1);
        setCanvasOffset(clampOffset(newOffset, bounds, vw, vh));
        return;
      }

      const oldScale = state.canvasScale;
      const newScale = clampScale(
        key === '-' ? oldScale / ZOOM_STEP : oldScale * ZOOM_STEP,
      );
      const newOffset = zoomToCenter(oldScale, newScale, state.canvasOffset, vw, vh);
      const bounds = getCanvasBounds(state.layouts, vw / newScale, vh / newScale);
      setCanvasScale(newScale);
      setCanvasOffset(clampOffset(newOffset, bounds, vw / newScale, vh / newScale));
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCanvasOffset, setCanvasScale]);

  // Sync viewport dimensions to store for new window placement
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setViewportSize]);

  // Custom drag handler
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
      const scale = useLayoutStore.getState().canvasScale;
      const dx = (e.clientX - startX) / scale;
      const dy = (e.clientY - startY) / scale;
      updateWindowPosition(windowId, startLayoutX + dx, startLayoutY + dy);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [bringToFront, setIsDragging, updateWindowPosition]);

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
      const scale = useLayoutStore.getState().canvasScale;
      const dw = (e.clientX - startX) / scale;
      const dh = (e.clientY - startY) / scale;
      updateWindowSize(windowId, startW + dw, startH + dh);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [bringToFront, setIsDragging, updateWindowSize]);

  if (!hydrated) {
    return <div className="flex flex-col h-screen" />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-stretch shrink-0">
        <CommandBar />
        <div className="relative">
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
          backgroundSize: `${16 * canvasScale}px ${16 * canvasScale}px`,
          backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
        }}
      >
        {windows.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`,
              transformOrigin: '0 0',
              willChange: 'transform',
              position: 'relative',
            }}
          >
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
                  className={`absolute bg-terminal-panel rounded-md border overflow-hidden flex flex-col ${isPinned ? 'border-up/40' : 'border-terminal-border'}`}
                  style={{
                    left: layout.x,
                    top: layout.y,
                    width: layout.w,
                    height: layout.h,
                    zIndex: layout.zIndex,
                    transition: isDragging ? 'none' : 'width 200ms ease, height 200ms ease',
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
                      <WindowRenderer config={win} />
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
          </div>
        )}

        {/* Minimap */}
        {windows.length > 0 && (
          <Minimap
            layouts={layouts}
            canvasOffset={canvasOffset}
            canvasScale={canvasScale}
            viewportWidth={viewportRef.current?.clientWidth ?? 0}
            viewportHeight={viewportRef.current?.clientHeight ?? 0}
            onNavigate={(offset) => {
              const vh = viewportRef.current?.clientHeight ?? 0;
              const vw = viewportRef.current?.clientWidth ?? 0;
              const scale = useLayoutStore.getState().canvasScale;
              const bounds = getCanvasBounds(layouts, vw / scale, vh / scale);
              setCanvasOffset(clampOffset(offset, bounds, vw / scale, vh / scale));
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
