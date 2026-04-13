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
const FocusPanel = dynamic(() => import('@/components/panels/FocusPanel'));
const MostActivePanel = dynamic(() => import('@/components/panels/MostActivePanel'));
const FinancialsPanel = dynamic(() => import('@/components/panels/FinancialsPanel'));
const HoldersPanel = dynamic(() => import('@/components/panels/HoldersPanel'));
const FilingsPanel = dynamic(() => import('@/components/panels/FilingsPanel'));
const CryptoOverviewPanel = dynamic(() => import('@/components/panels/CryptoOverviewPanel'));
const ChatroomPanel = dynamic(() => import('@/components/panels/ChatroomPanel'));
const DirectMessagesPanel = dynamic(() => import('@/components/panels/DirectMessagesPanel'));
const FeedPanel = dynamic(() => import('@/components/panels/FeedPanel'));
const TextNotePanel = dynamic(() => import('@/components/panels/TextNotePanel'));
const StrategyEditorPanel = dynamic(() => import('@/components/panels/StrategyEditorPanel'), { ssr: false });
const StrategySignalsPanel = dynamic(() => import('@/components/panels/StrategySignalsPanel'));
const WalletPanel = dynamic(() => import('@/components/panels/WalletPanel'));
const SettingsPanel = dynamic(() => import('@/components/panels/SettingsPanel'));

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
    case 'text-note':
      return <TextNotePanel windowId={config.id} content={config.content} />;
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
