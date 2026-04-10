'use client';

import dynamic from 'next/dynamic';
import { WindowConfig } from '@/lib/types';
import { useAppStore } from '@/stores/appStore';

const ChartPanel = dynamic(() => import('@/components/panels/ChartPanel'), { ssr: false });
const WatchlistPanel = dynamic(() => import('@/components/panels/WatchlistPanel'));
const NewsPanel = dynamic(() => import('@/components/panels/NewsPanel'));
const PortfolioPanel = dynamic(() => import('@/components/panels/PortfolioPanel'));
const MarketOverviewPanel = dynamic(() => import('@/components/panels/MarketOverviewPanel'));
const StockDetailPanel = dynamic(() => import('@/components/panels/StockDetailPanel'));
const QuoteMonitorPanel = dynamic(() => import('@/components/panels/QuoteMonitorPanel'));

export default function WindowRenderer({ config }: { config: WindowConfig }) {
  const activeSymbol = useAppStore((s) => s.activeSymbol);
  const symbol = config.symbol || activeSymbol;

  switch (config.type) {
    case 'chart':
      return <ChartPanel symbol={symbol} />;
    case 'watchlist':
      return <WatchlistPanel />;
    case 'news':
      return <NewsPanel query={config.symbol} />;
    case 'portfolio':
      return <PortfolioPanel />;
    case 'market-overview':
      return <MarketOverviewPanel />;
    case 'stock-detail':
      return <StockDetailPanel symbol={symbol} />;
    case 'quote-monitor':
      return <QuoteMonitorPanel />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
          {config.type}
        </div>
      );
  }
}
