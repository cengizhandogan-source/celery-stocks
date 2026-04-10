'use client';

import { useState, useEffect } from 'react';
import { isMarketOpen } from '@/lib/formatters';

export default function StatusBar() {
  const [time, setTime] = useState('');
  const [marketOpen, setMarketOpen] = useState(false);

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
      setMarketOpen(isMarketOpen());
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between h-7 px-4 bg-terminal-panel border-t border-terminal-border shrink-0">
      <div className="flex items-center gap-2 text-xxs font-mono">
        <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-up' : 'bg-down'}`} />
        <span className={marketOpen ? 'text-up' : 'text-down'}>
          {marketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
        </span>
      </div>
      <span className="text-xxs font-mono text-text-secondary">{time}</span>
      <span className="flex items-center gap-1.5 text-xxs font-mono text-text-muted tracking-widest">
        <img src="/celery-logo.png" alt="" width={16} height={16} className="opacity-60" />
        CELERY STOCKS
      </span>
    </div>
  );
}
