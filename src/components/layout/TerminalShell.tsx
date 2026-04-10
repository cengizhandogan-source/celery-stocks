'use client';

import { useState, useCallback, useMemo } from 'react';
import { GridLayout, useContainerWidth, verticalCompactor, type Layout } from 'react-grid-layout';
import { useLayoutStore, useLayoutHydrated } from '@/stores/layoutStore';
import CommandBar from '@/components/command/CommandBar';
import StatusBar from '@/components/layout/StatusBar';
import EmptyState from '@/components/layout/EmptyState';
import PanelHeader from '@/components/layout/PanelHeader';
import WindowRenderer from '@/components/layout/WindowRenderer';
import AddWindowMenu from '@/components/layout/AddWindowMenu';

export default function TerminalShell() {
  const hydrated = useLayoutHydrated();
  const { windows, layouts, removeWindow, updateLayout } = useLayoutStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const { width, containerRef } = useContainerWidth();

  const handleLayoutChange = useCallback((newLayout: Layout) => {
    updateLayout([...newLayout]);
  }, [updateLayout]);

  const gridConfig = useMemo(() => ({
    cols: 12,
    rowHeight: 80,
    margin: [4, 4] as const,
    containerPadding: [4, 4] as const,
  }), []);

  const dragConfig = useMemo(() => ({
    enabled: true,
    handle: '.drag-handle',
  }), []);

  const resizeConfig = useMemo(() => ({
    enabled: true,
  }), []);

  if (!hydrated) {
    return <div className="flex flex-col h-screen bg-terminal-bg" />;
  }

  return (
    <div className="flex flex-col h-screen bg-terminal-bg">
      {/* Top bar */}
      <div className="flex items-stretch shrink-0">
        <CommandBar />
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-10 h-10 bg-terminal-panel border-b border-l border-terminal-border flex items-center justify-center text-text-muted hover:text-up hover:border-up/30 transition-colors text-lg font-mono cursor-pointer"
          >
            +
          </button>
          {menuOpen && <AddWindowMenu onClose={() => setMenuOpen(false)} />}
        </div>
      </div>

      {/* Workspace */}
      <div ref={containerRef} className="flex-1 overflow-auto">
        {windows.length === 0 ? (
          <EmptyState />
        ) : width > 0 ? (
          <GridLayout
            layout={layouts}
            width={width}
            gridConfig={gridConfig}
            dragConfig={dragConfig}
            resizeConfig={resizeConfig}
            compactor={verticalCompactor}
            onLayoutChange={handleLayoutChange}
          >
            {windows.map((win) => (
              <div
                key={win.id}
                className="bg-terminal-panel rounded-md border border-terminal-border overflow-hidden flex flex-col"
              >
                <PanelHeader
                  title={win.title}
                  windowId={win.id}
                  symbol={win.symbol}
                  onClose={() => removeWindow(win.id)}
                />
                <div className="flex-1 overflow-hidden">
                  <WindowRenderer config={win} />
                </div>
              </div>
            ))}
          </GridLayout>
        ) : null}
      </div>

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
