export type SnapZone =
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | null;

const SNAP_THRESHOLD = 20;

export function detectSnapZone(
  cursorX: number,
  cursorY: number,
  vpWidth: number,
  vpHeight: number,
): SnapZone {
  const nearLeft = cursorX < SNAP_THRESHOLD;
  const nearRight = cursorX > vpWidth - SNAP_THRESHOLD;
  const nearTop = cursorY < SNAP_THRESHOLD;
  const nearBottom = cursorY > vpHeight - SNAP_THRESHOLD;

  // Corners take priority
  if (nearTop && nearLeft) return 'top-left';
  if (nearTop && nearRight) return 'top-right';
  if (nearBottom && nearLeft) return 'bottom-left';
  if (nearBottom && nearRight) return 'bottom-right';

  // Edges
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  if (nearTop) return 'top';

  return null;
}

export function getSnapRect(
  zone: NonNullable<SnapZone>,
  vpWidth: number,
  vpHeight: number,
): { x: number; y: number; w: number; h: number } {
  const halfW = Math.round(vpWidth / 2);
  const halfH = Math.round(vpHeight / 2);

  switch (zone) {
    case 'left':
      return { x: 0, y: 0, w: halfW, h: vpHeight };
    case 'right':
      return { x: halfW, y: 0, w: vpWidth - halfW, h: vpHeight };
    case 'top':
      return { x: 0, y: 0, w: vpWidth, h: vpHeight };
    case 'top-left':
      return { x: 0, y: 0, w: halfW, h: halfH };
    case 'top-right':
      return { x: halfW, y: 0, w: vpWidth - halfW, h: halfH };
    case 'bottom-left':
      return { x: 0, y: halfH, w: halfW, h: vpHeight - halfH };
    case 'bottom-right':
      return { x: halfW, y: halfH, w: vpWidth - halfW, h: vpHeight - halfH };
  }
}

export function clampToViewport(
  x: number,
  y: number,
  w: number,
  h: number,
  vpWidth: number,
  vpHeight: number,
): { x: number; y: number; w: number; h: number } {
  const cw = Math.min(w, vpWidth);
  const ch = Math.min(h, vpHeight);
  return {
    x: Math.max(0, Math.min(x, vpWidth - cw)),
    y: Math.max(0, Math.min(y, vpHeight - ch)),
    w: cw,
    h: ch,
  };
}
