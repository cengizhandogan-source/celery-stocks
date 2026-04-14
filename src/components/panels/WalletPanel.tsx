'use client';

import { useState } from 'react';
import { useWalletConnections } from '@/hooks/useWalletConnections';
import { useCryptoHoldings } from '@/hooks/useCryptoHoldings';
import { useWalletSync } from '@/hooks/useWalletSync';
import { EXCHANGE_METADATA } from '@/lib/constants';
import { formatNetWorth } from '@/lib/formatters';
import { timeAgo } from '@/lib/formatters';
import HoldingsTable from '@/components/wallet/HoldingsTable';
import ConnectExchangeModal from '@/components/wallet/ConnectExchangeModal';
import NetWorthChart from '@/components/wallet/NetWorthChart';
import { useNetWorthHistory } from '@/hooks/useNetWorthHistory';
import type { ExchangeName } from '@/lib/types';

export default function WalletPanel() {
  const { connections, loading: connLoading, addConnection, removeConnection } = useWalletConnections();
  const { holdings, totalNetWorth, loading: holdingsLoading, refetch } = useCryptoHoldings();
  const { syncing, lastSyncedAt, triggerSync } = useWalletSync();
  const { snapshots } = useNetWorthHistory();
  const [showConnect, setShowConnect] = useState(false);

  const loading = connLoading || holdingsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-xs font-mono">
        Loading wallet...
      </div>
    );
  }

  // Empty state: no connections
  if (connections.length === 0 && !showConnect) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
        <p className="text-xs font-mono text-text-muted text-center">
          Connect a crypto exchange to track your portfolio
        </p>
        <button
          onClick={() => setShowConnect(true)}
          className="text-xs font-mono text-cyan border border-cyan/30 hover:bg-cyan/10 px-4 py-2 rounded transition-colors"
        >
          Connect Exchange
        </button>
      </div>
    );
  }

  if (showConnect) {
    return (
      <div className="p-3 h-full overflow-y-auto">
        <ConnectExchangeModal
          onConnect={async (params) => {
            const result = await addConnection(params);
            if (result.success) {
              const syncResult = await triggerSync();
              if (syncResult.success) refetch();
            }
            return result;
          }}
          onClose={() => setShowConnect(false)}
        />
      </div>
    );
  }

  // Find the latest sync time across all connections
  const latestSync = connections.reduce((latest, c) => {
    if (!c.last_synced_at) return latest;
    const t = new Date(c.last_synced_at).getTime();
    return t > latest ? t : latest;
  }, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: net worth + sync */}
      <div className="px-3 py-2 border-b border-terminal-border shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-base font-mono font-bold text-amber-400">
            {formatNetWorth(totalNetWorth)}
          </span>
          <button
            onClick={async () => {
              const result = await triggerSync();
              if (result.success) refetch();
            }}
            disabled={syncing}
            className="text-xxs font-mono text-cyan hover:text-cyan/80 disabled:opacity-40 transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
        <p className="text-xxs font-mono text-text-muted mt-0.5">
          {lastSyncedAt
            ? `Synced ${timeAgo(lastSyncedAt.toISOString())}`
            : latestSync > 0
              ? `Synced ${timeAgo(new Date(latestSync).toISOString())}`
              : 'Not synced yet'}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Net Worth Chart */}
        {snapshots.length >= 2 && (
          <div className="px-3 py-2 border-b border-terminal-border">
            <NetWorthChart snapshots={snapshots} currentValue={totalNetWorth} />
          </div>
        )}

        {/* Connections */}
        <div className="px-3 py-2 border-b border-terminal-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">Connections</span>
            <button
              onClick={() => setShowConnect(true)}
              className="text-xxs font-mono text-cyan hover:text-cyan/80 transition-colors"
            >
              + Add
            </button>
          </div>
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between py-1.5 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xxs font-mono text-text-primary font-medium">
                  {EXCHANGE_METADATA[conn.exchange as ExchangeName]?.displayName ?? conn.exchange}
                </span>
                {conn.label && (
                  <span className="text-xxs font-mono text-text-muted truncate">
                    {conn.label}
                  </span>
                )}
                {!conn.is_valid && (
                  <span className="text-xxs font-mono text-down">Invalid</span>
                )}
              </div>
              <button
                onClick={() => removeConnection(conn.id)}
                className="text-xxs font-mono text-text-muted hover:text-down opacity-0 group-hover:opacity-100 transition-all"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Holdings */}
        <div className="px-1 py-2">
          <div className="px-2 mb-2">
            <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">Holdings</span>
          </div>
          {holdings.length > 0 ? (
            <HoldingsTable holdings={holdings} totalNetWorth={totalNetWorth} />
          ) : (
            <p className="text-xxs font-mono text-text-muted px-2">
              {syncing ? 'Syncing holdings...' : 'No holdings found. Try syncing.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
