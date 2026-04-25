'use client';

import { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';

export default function SocialTopBar({
  title,
  left,
  right,
}: {
  title: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <>
      <div className="fixed top-0 left-0 md:left-[240px] right-0 z-40 h-[56px] bg-black/85 backdrop-blur-md border-b border-border">
        <div className="relative h-full flex items-center">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open menu"
            className="md:hidden absolute left-4 p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
          {left && (
            <div className="absolute left-14 md:left-4 flex items-center">
              {left}
            </div>
          )}
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl font-sans font-semibold text-text-primary tracking-tight max-w-[50vw] md:max-w-none truncate">
            {title}
          </h1>
          {right && <div className="absolute right-4 flex items-center">{right}</div>}
        </div>
      </div>
      <div className="h-[56px]" aria-hidden />
    </>
  );
}
