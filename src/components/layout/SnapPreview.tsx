'use client';

import { SnapZone, getSnapRect } from '@/lib/windowSnap';

interface SnapPreviewProps {
  snapZone: SnapZone;
  viewportWidth: number;
  viewportHeight: number;
}

export default function SnapPreview({ snapZone, viewportWidth, viewportHeight }: SnapPreviewProps) {
  if (!snapZone) return null;

  const rect = getSnapRect(snapZone, viewportWidth, viewportHeight);

  return (
    <div
      className="absolute rounded-md pointer-events-none"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: 'rgba(74, 222, 128, 0.08)',
        border: '2px solid rgba(74, 222, 128, 0.25)',
        zIndex: 9999,
        transition: 'left 150ms ease, top 150ms ease, width 150ms ease, height 150ms ease, opacity 150ms ease',
      }}
    />
  );
}
