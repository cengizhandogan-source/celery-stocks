'use client';

import { useAppStore } from '@/stores/appStore';
import { useQuote } from '@/hooks/useQuote';
import { formatAssetPrice, formatChange, formatPercent, formatVolume } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';
import TickerLogo from '@/components/ui/TickerLogo';

export default function QuoteMonitorPanel({ symbol: propSymbol }: { symbol?: string }) {
  const activeSymbol = useAppStore((s) => s.activeSymbol);
  const symbol = propSymbol || activeSymbol;
  const { quote, loading } = useQuote(symbol);

  if (loading && !quote) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        No data
      </div>
    );
  }

  const change = quote.change;
  const color = change > 0 ? 'text-up' : change < 0 ? 'text-down' : 'text-text-secondary';

  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <TickerLogo symbol={symbol} size={28} className="mb-1" />
      <div className="text-xxs text-text-muted uppercase tracking-widest mb-1 font-mono">
        {symbol}
      </div>
      <div className="text-4xl font-mono font-bold text-text-primary">
        ${formatAssetPrice(quote.price, symbol)}
      </div>
      <div className={`text-lg font-mono mt-1 ${color}`}>
        {formatChange(quote.change)} ({formatPercent(quote.changePercent)})
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-4">
        <div className="text-right">
          <span className="text-xxs text-text-muted font-mono">Open</span>
        </div>
        <div className="text-data font-mono text-text-primary">{formatAssetPrice(quote.open, symbol)}</div>
        <div className="text-right">
          <span className="text-xxs text-text-muted font-mono">High</span>
        </div>
        <div className="text-data font-mono text-text-primary">{formatAssetPrice(quote.high, symbol)}</div>
        <div className="text-right">
          <span className="text-xxs text-text-muted font-mono">Low</span>
        </div>
        <div className="text-data font-mono text-text-primary">{formatAssetPrice(quote.low, symbol)}</div>
        <div className="text-right">
          <span className="text-xxs text-text-muted font-mono">Prev</span>
        </div>
        <div className="text-data font-mono text-text-primary">{formatAssetPrice(quote.previousClose, symbol)}</div>
      </div>
      <div className="mt-3 text-data font-mono text-text-muted">
        Vol: {formatVolume(quote.volume)}
      </div>
    </div>
  );
}
