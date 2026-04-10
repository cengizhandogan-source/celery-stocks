'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WindowType } from '@/lib/types';
import { WINDOW_TYPE_LABELS } from '@/lib/constants';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAppStore } from '@/stores/appStore';

const windowTypes = Object.keys(WINDOW_TYPE_LABELS) as WindowType[];

interface AddWindowMenuProps {
  onClose: () => void;
}

export default function AddWindowMenu({ onClose }: AddWindowMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const addWindow = useLayoutStore((s) => s.addWindow);
  const toggleCommandBar = useAppStore((s) => s.toggleCommandBar);

  const handleSelect = useCallback((type: WindowType) => {
    addWindow(type);
    onClose();
    if (type === 'chart' || type === 'stock-detail') {
      toggleCommandBar();
    }
  }, [addWindow, onClose, toggleCommandBar]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % windowTypes.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + windowTypes.length) % windowTypes.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSelect(windowTypes[selectedIndex]);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedIndex, onClose, handleSelect]);

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-1 w-56 bg-terminal-panel border border-terminal-border-strong rounded-md shadow-2xl z-50 py-1 overflow-hidden"
    >
      {windowTypes.map((type, i) => (
        <button
          key={type}
          onClick={() => handleSelect(type)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm font-mono transition-colors ${
            i === selectedIndex ? 'bg-terminal-hover text-text-primary' : 'text-text-secondary hover:bg-terminal-hover hover:text-text-primary'
          }`}
        >
          <span className="w-5 h-5 flex items-center justify-center text-xxs bg-white/5 rounded text-text-muted">
            {WINDOW_TYPE_LABELS[type][0]}
          </span>
          <span>{WINDOW_TYPE_LABELS[type]}</span>
        </button>
      ))}
    </div>
  );
}
