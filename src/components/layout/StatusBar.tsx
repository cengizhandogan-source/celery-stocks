'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMarketStatus, getMarketStatusColor, getNextMarketEvent, type Exchange, type MarketStatus } from '@/lib/formatters';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/utils/supabase/client';
import { useChatStore } from '@/stores/chatStore';
import { useLayoutStore } from '@/stores/layoutStore';

export default function StatusBar() {
  const [time, setTime] = useState('');
  const [markets, setMarkets] = useState<Record<Exchange, { status: MarketStatus; event: string }>>({
    NYSE: { status: 'closed', event: '' },
    NASDAQ: { status: 'closed', event: '' },
    EURO: { status: 'closed', event: '' },
    JPX: { status: 'closed', event: '' },
    CRYPTO: { status: 'closed', event: '' },
  });
  const { user } = useUser();
  const router = useRouter();
  const unreadDmCount = useChatStore((s) => s.unreadDmCount);
  const canvasOffset = useLayoutStore((s) => s.canvasOffset);
  const canvasScale = useLayoutStore((s) => s.canvasScale);
  const setCanvasScale = useLayoutStore((s) => s.setCanvasScale);
  const setCanvasOffset = useLayoutStore((s) => s.setCanvasOffset);
  const resetCanvasOffset = useLayoutStore((s) => s.resetCanvasOffset);
  const isPanned = canvasOffset.x !== 0 || canvasOffset.y !== 0;
  const isZoomed = canvasScale !== 1;
  const zoomPct = Math.round(canvasScale * 100);

  useEffect(() => {
    function update() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' ET'
      );
      setMarkets({
        NYSE: { status: getMarketStatus('NYSE'), event: getNextMarketEvent('NYSE') },
        NASDAQ: { status: getMarketStatus('NASDAQ'), event: getNextMarketEvent('NASDAQ') },
        EURO: { status: getMarketStatus('EURO'), event: getNextMarketEvent('EURO') },
        JPX: { status: getMarketStatus('JPX'), event: getNextMarketEvent('JPX') },
        CRYPTO: { status: getMarketStatus('CRYPTO'), event: getNextMarketEvent('CRYPTO') },
      });
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <div className="relative flex items-center justify-between h-7 px-4 bg-terminal-panel border-t border-terminal-border shrink-0">
      <div className="flex items-center gap-3 text-xxs font-mono">
        {([['NYSE', 'NYSE'], ['NASDAQ', 'NDQ'], ['EURO', 'EU'], ['JPX', 'JPX']] as [Exchange, string][]).map(([ex, label]) => {
          const { dot, text } = getMarketStatusColor(markets[ex].status);
          return (
            <span key={ex} className="relative group flex items-center gap-1 cursor-default">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <span className={text}>{label}</span>
              <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-terminal-panel border border-terminal-border-strong px-2 py-0.5 text-xxs text-text-primary whitespace-nowrap rounded-sm z-50">
                {markets[ex].event}
              </span>
            </span>
          );
        })}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        {(isPanned || isZoomed) && (
          <button
            onClick={resetCanvasOffset}
            className="text-xxs font-mono text-text-muted hover:text-up transition-colors uppercase tracking-wider cursor-pointer"
          >
            RESET VIEW
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const state = useLayoutStore.getState();
              const oldScale = state.canvasScale;
              const newScale = Math.max(0.25, oldScale / 1.2);
              const { viewportSize, canvasOffset: off } = state;
              const cx = (viewportSize.width / 2 - off.x) / oldScale;
              const cy = (viewportSize.height / 2 - off.y) / oldScale;
              setCanvasScale(newScale);
              setCanvasOffset({
                x: viewportSize.width / 2 - cx * newScale,
                y: viewportSize.height / 2 - cy * newScale,
              });
            }}
            className="text-xxs font-mono text-text-muted hover:text-up transition-colors cursor-pointer px-0.5"
          >
            −
          </button>
          <span className="text-xxs font-mono text-text-secondary w-8 text-center">{zoomPct}%</span>
          <button
            onClick={() => {
              const state = useLayoutStore.getState();
              const oldScale = state.canvasScale;
              const newScale = Math.min(2, oldScale * 1.2);
              const { viewportSize, canvasOffset: off } = state;
              const cx = (viewportSize.width / 2 - off.x) / oldScale;
              const cy = (viewportSize.height / 2 - off.y) / oldScale;
              setCanvasScale(newScale);
              setCanvasOffset({
                x: viewportSize.width / 2 - cx * newScale,
                y: viewportSize.height / 2 - cy * newScale,
              });
            }}
            className="text-xxs font-mono text-text-muted hover:text-up transition-colors cursor-pointer px-0.5"
          >
            +
          </button>
        </div>
        <span className="text-xxs font-mono text-text-secondary">{time}</span>
      </div>
      <div className="flex items-center gap-3 text-xxs font-mono">
        {user && (
          <>
            <span className="text-text-secondary">{user.email}</span>
            {unreadDmCount > 0 && (
              <span className="text-xxs font-mono bg-up text-terminal-bg rounded-full px-1.5 py-0.5 leading-none">
                {unreadDmCount} DM
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="text-text-muted hover:text-down transition-colors uppercase tracking-wider"
            >
              Sign Out
            </button>
          </>
        )}
        <span className="flex items-center gap-1.5 text-text-muted tracking-widest">
          <img src="/celery-logo.png" alt="" width={16} height={16} className="opacity-60" />
          CELERY STOCKS
        </span>
      </div>
    </div>
  );
}
