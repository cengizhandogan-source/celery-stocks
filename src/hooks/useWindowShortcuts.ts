'use client';

import { useEffect } from 'react';
import { useLayoutStore, getViewportCenterPosition } from '@/stores/layoutStore';
import { useAppStore } from '@/stores/appStore';
import { WINDOW_SHORTCUTS, WindowShortcut } from '@/lib/shortcuts';

export function useWindowShortcuts() {
  const addWindow = useLayoutStore((s) => s.addWindow);
  const activeSymbol = useAppStore((s) => s.activeSymbol);

  useEffect(() => {
    const numberMap = new Map<string, WindowShortcut>();
    const letterMap = new Map<string, WindowShortcut>();

    for (const shortcut of WINDOW_SHORTCUTS) {
      if (shortcut.numberKey) {
        numberMap.set(shortcut.numberKey, shortcut);
      }
      letterMap.set(shortcut.letterKey, shortcut);
    }

    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      let matched: WindowShortcut | undefined;

      if (e.ctrlKey && !e.shiftKey && !e.metaKey) {
        matched = numberMap.get(e.key);
      }

      if (e.ctrlKey && e.shiftKey && !e.metaKey) {
        matched = letterMap.get(e.key.toLowerCase());
      }

      if (matched) {
        e.preventDefault();
        const symbol = matched.needsSymbol ? activeSymbol : undefined;
        addWindow(matched.type, symbol, getViewportCenterPosition());
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addWindow, activeSymbol]);
}
