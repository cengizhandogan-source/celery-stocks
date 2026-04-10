'use client';

import { useAppStore } from '@/stores/appStore';
import { useQuote } from '@/hooks/useQuote';
import { formatPrice, formatChange, formatPercent } from '@/lib/formatters';
import Spinner from '@/components/ui/Spinner';
import TickerLogo from '@/components/ui/TickerLogo';

export default function FocusPanel({ symbol: propSymbol }: { symbol?: string }) {
  const activeSymbol = useAppStore((s) => s.activeSymbol);
  const symbol = propSymbol || activeSymbol;
  const { quote, loading } = useQuote(symbol);

  if (loading && !quote) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="sm" />
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
    <div className="flex flex-col items-center justify-center h-full px-3">
      <TickerLogo symbol={symbol} size={48} className="mb-2" />
      <div className="text-xxs text-text-muted uppercase tracking-widest mb-1 font-mono">
        {symbol}
      </div>
      <div className="text-5xl font-mono font-bold text-text-primary leading-none">
        ${formatPrice(quote.price)}
      </div>
      <div className={`text-lg font-mono mt-2 ${color}`}>
        {formatChange(quote.change)} ({formatPercent(quote.changePercent)})
      </div>
    </div>
  );
}
