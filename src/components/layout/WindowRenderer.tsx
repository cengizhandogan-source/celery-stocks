'use client';

import dynamic from 'next/dynamic';
import { WindowConfig } from '@/lib/types';
import { useAppStore } from '@/stores/appStore';

const ChartPanel = dynamic(() => import('@/components/panels/ChartPanel'), { ssr: false });
const WatchlistPanel = dynamic(() => import('@/components/panels/WatchlistPanel'), { ssr: false });
const NewsPanel = dynamic(() => import('@/components/panels/NewsPanel'), { ssr: false });
const MarketOverviewPanel = dynamic(() => import('@/components/panels/MarketOverviewPanel'), { ssr: false });
const StockDetailPanel = dynamic(() => import('@/components/panels/StockDetailPanel'), { ssr: false });
const QuoteMonitorPanel = dynamic(() => import('@/components/panels/QuoteMonitorPanel'), { ssr: false });
const FocusPanel = dynamic(() => import('@/components/panels/FocusPanel'), { ssr: false });
const MostActivePanel = dynamic(() => import('@/components/panels/MostActivePanel'), { ssr: false });
const FinancialsPanel = dynamic(() => import('@/components/panels/FinancialsPanel'), { ssr: false });
const HoldersPanel = dynamic(() => import('@/components/panels/HoldersPanel'), { ssr: false });
const FilingsPanel = dynamic(() => import('@/components/panels/FilingsPanel'), { ssr: false });
const CryptoOverviewPanel = dynamic(() => import('@/components/panels/CryptoOverviewPanel'), { ssr: false });
const ChatroomPanel = dynamic(() => import('@/components/panels/ChatroomPanel'), { ssr: false });
const DirectMessagesPanel = dynamic(() => import('@/components/panels/DirectMessagesPanel'), { ssr: false });
const FeedPanel = dynamic(() => import('@/components/panels/FeedPanel'), { ssr: false });
const StrategyEditorPanel = dynamic(() => import('@/components/panels/StrategyEditorPanel'), { ssr: false });
const StrategySignalsPanel = dynamic(() => import('@/components/panels/StrategySignalsPanel'), { ssr: false });
const WalletPanel = dynamic(() => import('@/components/panels/WalletPanel'), { ssr: false });
const SettingsPanel = dynamic(() => import('@/components/panels/SettingsPanel'), { ssr: false });

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
    case 'market-overview':
      return <MarketOverviewPanel symbols={config.symbols} windowId={config.id} />;
    case 'stock-detail':
      return <StockDetailPanel symbol={symbol} />;
    case 'quote-monitor':
      return <QuoteMonitorPanel symbol={symbol} />;
    case 'focus':
      return <FocusPanel symbol={symbol} />;
    case 'most-active':
      return <MostActivePanel />;
    case 'financials':
      return <FinancialsPanel symbol={symbol} />;
    case 'holders':
      return <HoldersPanel symbol={symbol} />;
    case 'filings':
      return <FilingsPanel symbol={symbol} />;
    case 'crypto-overview':
      return <CryptoOverviewPanel symbols={config.symbols} windowId={config.id} />;
    case 'chatroom':
      return <ChatroomPanel chatroomId={config.chatroomId} />;
    case 'direct-messages':
      return <DirectMessagesPanel />;
    case 'feed':
      return <FeedPanel />;
    case 'strategy-editor':
      return <StrategyEditorPanel strategyId={config.strategyId} />;
    case 'strategy-signals':
      return <StrategySignalsPanel />;
    case 'crypto-wallet':
      return <WalletPanel />;
    case 'settings':
      return <SettingsPanel />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-text-muted text-sm font-mono">
          {config.type}
        </div>
      );
  }
}
