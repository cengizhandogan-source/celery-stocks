'use client';

import { useEffect } from 'react';

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  deps: unknown[] = [],
  options: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {}
) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (options.meta && !e.metaKey) return;
      if (options.ctrl && !e.ctrlKey) return;
      if (options.shift && !e.shiftKey) return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    }

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);
}
