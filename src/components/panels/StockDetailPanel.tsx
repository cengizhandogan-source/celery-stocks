'use client';

import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { useProfile } from '@/hooks/useProfile';
import { useKeyStats } from '@/hooks/useKeyStats';
import { useQuote } from '@/hooks/useQuote';
import { formatAssetPrice, formatMarketCap, formatVolume, isCryptoSymbol } from '@/lib/formatters';
import PriceChange from '@/components/ui/PriceChange';
import Spinner from '@/components/ui/Spinner';
import TickerLogo from '@/components/ui/TickerLogo';

interface StockDetailPanelProps {
  symbol?: string;
}

export default function StockDetailPanel({ symbol: propSymbol }: StockDetailPanelProps) {
  const activeSymbol = useAppStore((s) => s.activeSymbol);
  const symbol = propSymbol || activeSymbol;
  const { profile, loading: profileLoading } = useProfile(symbol);
  const { stats, loading: statsLoading } = useKeyStats(symbol);
  const { quote } = useQuote(symbol);
  const [expanded, setExpanded] = useState(false);

  if (!symbol) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
        Select a ticker
      </div>
    );
  }

  if (profileLoading && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="md" />
      </div>
    );
  }

  const statRows: [string, string][] = [];
  if (stats) {
    if (stats.marketCap) statRows.push(['Market Cap', formatMarketCap(stats.marketCap)]);
    if (stats.pe) statRows.push(['P/E Ratio', stats.pe.toFixed(2)]);
    if (stats.forwardPe) statRows.push(['Forward P/E', stats.forwardPe.toFixed(2)]);
    if (stats.eps) statRows.push(['EPS', `$${stats.eps.toFixed(2)}`]);
    if (stats.fiftyTwoWeekHigh) statRows.push(['52W High', `$${formatAssetPrice(stats.fiftyTwoWeekHigh, symbol)}`]);
    if (stats.fiftyTwoWeekLow) statRows.push(['52W Low', `$${formatAssetPrice(stats.fiftyTwoWeekLow, symbol)}`]);
    if (stats.dividendYield) statRows.push(['Div Yield', `${(stats.dividendYield * 100).toFixed(2)}%`]);
    if (stats.beta) statRows.push(['Beta', stats.beta.toFixed(2)]);
    if (stats.avgVolume) statRows.push(['Avg Volume', formatVolume(stats.avgVolume)]);
    if (stats.priceToBook) statRows.push(['P/B', stats.priceToBook.toFixed(2)]);
  }

  return (
    <div className="flex flex-col h-full w-full overflow-y-auto" data-scrollable>
      {/* Company header */}
      <div className="px-3 py-2 border-b border-terminal-border">
        <div className="flex items-center gap-2">
          <TickerLogo symbol={symbol} website={profile?.website} size={36} />
          <div className="text-lg text-text-primary font-medium">{profile?.name || symbol}</div>
        </div>
        <div className="text-xxs text-text-muted uppercase tracking-wider font-mono">
          {profile?.exchange}
          {isCryptoSymbol(symbol)
            ? ' \u00B7 Cryptocurrency'
            : profile?.industry ? ` \u00B7 ${profile.industry}` : ''}
        </div>
        {quote && (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-mono text-text-primary">${formatAssetPrice(quote.price, symbol)}</span>
            <PriceChange change={quote.change} changePercent={quote.changePercent} />
          </div>
        )}
      </div>

      {/* Key stats grid */}
      {statsLoading && !stats ? (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-3 py-3 border-b border-terminal-border">
          {statRows.map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-xxs text-text-muted uppercase font-mono">{label}</span>
              <span className="text-data font-mono text-text-primary">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {profile?.description && (
        <div className="px-3 py-3">
          <p className={`text-xs text-text-secondary leading-relaxed ${!expanded ? 'line-clamp-4' : ''}`}>
            {profile.description}
          </p>
          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-1 text-xxs text-cyan hover:text-cyan/80 font-mono transition-colors"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
    </div>
  );
}
