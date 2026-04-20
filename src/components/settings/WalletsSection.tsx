'use client';

import { useState } from 'react';
import { useWalletConnections } from '@/hooks/useWalletConnections';
import { useWalletSync } from '@/hooks/useWalletSync';
import { EXCHANGE_METADATA } from '@/lib/constants';
import { timeAgo } from '@/lib/formatters';
import ConnectExchangeModal from '@/components/wallet/ConnectExchangeModal';
import type { ExchangeName } from '@/lib/types';

export default function WalletsSection() {
  const { connections, loading, addConnection, removeConnection } = useWalletConnections();
  const { syncing, lastSyncedAt, triggerSync } = useWalletSync();
  const [showConnect, setShowConnect] = useState(false);

  if (loading) {
    return <div className="px-4 py-6 text-xs font-mono text-text-muted">Loading wallets...</div>;
  }

  if (showConnect) {
    return (
      <div className="p-4">
        <ConnectExchangeModal
          onConnect={addConnection}
          onClose={() => setShowConnect(false)}
        />
      </div>
    );
  }

  const latestSync = connections.reduce((latest, c) => {
    if (!c.last_synced_at) return latest;
    const t = new Date(c.last_synced_at).getTime();
    return t > latest ? t : latest;
  }, 0);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Sync status */}
      <div className="flex items-center justify-between">
        <p className="text-xxs font-mono text-text-muted">
          {lastSyncedAt
            ? `Last synced ${timeAgo(lastSyncedAt.toISOString())}`
            : latestSync > 0
              ? `Last synced ${timeAgo(new Date(latestSync).toISOString())}`
              : 'Not synced yet'}
        </p>
        <button
          onClick={triggerSync}
          disabled={syncing || connections.length === 0}
          className="text-xxs font-mono text-info hover:text-info/80 disabled:opacity-40 transition-colors"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {/* Connections list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xxs font-mono text-text-muted uppercase tracking-wider">Exchange Connections</span>
          <button
            onClick={() => setShowConnect(true)}
            className="text-xxs font-mono text-info hover:text-info/80 transition-colors"
          >
            + Add
          </button>
        </div>

        {connections.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs font-mono text-text-muted mb-3">No exchanges connected</p>
            <button
              onClick={() => setShowConnect(true)}
              className="text-xs font-mono text-info border border-info/30 hover:bg-info/10 px-4 py-2 rounded transition-colors"
            >
              Connect Exchange
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between py-2 px-2 rounded hover:bg-hover transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono text-text-primary font-medium">
                    {EXCHANGE_METADATA[conn.exchange as ExchangeName]?.displayName ?? conn.exchange}
                  </span>
                  {conn.label && (
                    <span className="text-xxs font-mono text-text-muted truncate">{conn.label}</span>
                  )}
                  {!conn.is_valid && (
                    <span className="text-xxs font-mono text-loss">Invalid</span>
                  )}
                </div>
                <button
                  onClick={() => removeConnection(conn.id)}
                  className="text-xxs font-mono text-text-muted hover:text-loss opacity-0 group-hover:opacity-100 transition-all"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
