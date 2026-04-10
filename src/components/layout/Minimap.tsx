'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LayoutItem } from '@/lib/types';

interface MinimapProps {
  layouts: LayoutItem[];
  canvasOffset: { x: number; y: number };
  canvasScale: number;
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (offset: { x: number; y: number }) => void;
}

const MINIMAP_WIDTH = 200;
const MINIMAP_PADDING = 20;

export default function Minimap({
  layouts,
  canvasOffset,
  canvasScale,
  viewportWidth,
  viewportHeight,
  onNavigate,
}: MinimapProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Show minimap on pan or zoom, fade after 2s
  useEffect(() => {
    if (canvasOffset.x === 0 && canvasOffset.y === 0 && canvasScale === 1) {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [canvasOffset.x, canvasOffset.y, canvasScale]);

  // Window rects are already in pixel coordinates
  const windowRects = useMemo(() => {
    return layouts
      .filter(l => Number.isFinite(l.x) && Number.isFinite(l.y))
      .map(l => ({ x: l.x, y: l.y, w: l.w, h: l.h, key: l.i }));
  }, [layouts]);

  // Viewport rect in world coordinates (accounting for scale)
  const viewportRect = useMemo(() => ({
    x: -canvasOffset.x / canvasScale,
    y: -canvasOffset.y / canvasScale,
    w: viewportWidth / canvasScale,
    h: viewportHeight / canvasScale,
  }), [canvasOffset.x, canvasOffset.y, canvasScale, viewportWidth, viewportHeight]);

  // Compute world bounding box
  const worldBounds = useMemo(() => {
    const allBoxes = [...windowRects, viewportRect];
    const minX = Math.min(...allBoxes.map((r) => r.x));
    const minY = Math.min(...allBoxes.map((r) => r.y));
    const maxX = Math.max(...allBoxes.map((r) => r.x + r.w));
    const maxY = Math.max(...allBoxes.map((r) => r.y + r.h));
    return { minX, minY, maxX, maxY };
  }, [windowRects, viewportRect]);

  // Scale to fit minimap
  const worldWidth = worldBounds.maxX - worldBounds.minX;
  const worldHeight = worldBounds.maxY - worldBounds.minY;
  const scale = Math.min(
    (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / Math.max(worldWidth, 1),
    (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / Math.max(worldHeight, 1),
  );
  const minimapHeight = Math.max(worldHeight * scale + MINIMAP_PADDING * 2, 60);

  const toMinimap = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => ({
      x: MINIMAP_PADDING + (rect.x - worldBounds.minX) * scale,
      y: MINIMAP_PADDING + (rect.y - worldBounds.minY) * scale,
      w: rect.w * scale,
      h: rect.h * scale,
    }),
    [worldBounds.minX, worldBounds.minY, scale],
  );

  const navigateFromMinimap = useCallback(
    (clientX: number, clientY: number) => {
      const el = minimapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const worldX = worldBounds.minX + (mx - MINIMAP_PADDING) / scale;
      const worldY = worldBounds.minY + (my - MINIMAP_PADDING) / scale;

      onNavigate({
        x: -(worldX * canvasScale - viewportWidth / 2),
        y: -(worldY * canvasScale - viewportHeight / 2),
      });
    },
    [worldBounds.minX, worldBounds.minY, scale, canvasScale, viewportWidth, viewportHeight, onNavigate],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      navigateFromMinimap(e.clientX, e.clientY);

      const handleMouseMove = (e: MouseEvent) => {
        if (draggingRef.current) navigateFromMinimap(e.clientX, e.clientY);
      };
      const handleMouseUp = () => {
        draggingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [navigateFromMinimap],
  );

  // Keep minimap visible while hovering
  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(false), 1000);
  }, []);

  const vpMinimap = toMinimap(viewportRect);

  return (
    <div
      ref={minimapRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute bottom-3 right-3 rounded-md border cursor-crosshair"
      style={{
        width: MINIMAP_WIDTH,
        height: minimapHeight,
        background: 'rgba(28, 28, 28, 0.9)',
        borderColor: 'rgba(255, 255, 255, 0.08)',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 300ms ease',
        zIndex: 50,
      }}
    >
      {/* Window rectangles */}
      {windowRects.map((wr) => {
        const m = toMinimap(wr);
        return (
          <div
            key={wr.key}
            className="absolute rounded-sm"
            style={{
              left: m.x,
              top: m.y,
              width: Math.max(m.w, 2),
              height: Math.max(m.h, 2),
              background: 'rgba(35, 35, 35, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          />
        );
      })}

      {/* Viewport indicator */}
      <div
        className="absolute rounded-sm"
        style={{
          left: vpMinimap.x,
          top: vpMinimap.y,
          width: vpMinimap.w,
          height: vpMinimap.h,
          border: '1.5px solid rgba(74, 222, 128, 0.5)',
          background: 'rgba(74, 222, 128, 0.05)',
        }}
      />
    </div>
  );
}
