import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAdapter } from '@/lib/exchanges';
import { ExchangeAuthError } from '@/lib/exchanges/types';
import { decryptBundle } from '@/lib/exchanges/decrypt';

const STABLECOINS = new Set(['USDT', 'USDC', 'USD', 'BUSD', 'DAI', 'TUSD', 'USDP', 'FDUSD', 'EUR', 'GBP']);

export async function POST() {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: connections, error: connError } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_valid', true);

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ message: 'No connections to sync' });
    }

    let totalTradeCount = 0;
    let syncedCount = 0;

    for (const conn of connections) {
      // Rate limit: skip if last synced < 5 minutes ago
      if (conn.last_synced_at && Date.now() - new Date(conn.last_synced_at).getTime() < 300_000) {
        continue;
      }

      try {
        const adapter = getAdapter(conn.exchange);
        const apiKey = decryptBundle(conn.api_key_enc);
        const apiSecret = decryptBundle(conn.api_secret_enc);
        const passphrase = conn.passphrase_enc
          ? decryptBundle(conn.passphrase_enc)
          : undefined;

        // Determine symbols from cached holdings for this connection
        const { data: holdings } = await supabase
          .from('cached_holdings')
          .select('asset')
          .eq('connection_id', conn.id);

        const symbols = (holdings ?? [])
          .map((h: { asset: string }) => h.asset.toUpperCase())
          .filter((a: string) => !STABLECOINS.has(a));

        // Determine since: latest trade for this connection, or 30 days ago
        const { data: latestTrade } = await supabase
          .from('cached_trades')
          .select('executed_at')
          .eq('connection_id', conn.id)
          .order('executed_at', { ascending: false })
          .limit(1)
          .single();

        const since = latestTrade
          ? new Date(latestTrade.executed_at)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const trades = await adapter.fetchTrades(apiKey, apiSecret, passphrase, symbols, since);

        if (trades.length > 0) {
          const rows = trades.map((t) => ({
            connection_id: conn.id,
            user_id: user.id,
            exchange_trade_id: t.tradeId,
            symbol: t.symbol,
            base_asset: t.baseAsset.toUpperCase(),
            quote_asset: t.quoteAsset.toUpperCase(),
            side: t.side,
            quantity: t.quantity,
            price: t.price,
            quote_qty: t.quoteQty,
            fee: t.fee,
            fee_asset: t.feeAsset,
            executed_at: t.executedAt.toISOString(),
            synced_at: new Date().toISOString(),
          }));

          // Upsert in batches of 100
          for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            await supabase
              .from('cached_trades')
              .upsert(batch, { onConflict: 'connection_id,exchange_trade_id' });
          }

          totalTradeCount += trades.length;
        }

        syncedCount++;
      } catch (err) {
        if (err instanceof ExchangeAuthError) {
          await supabase
            .from('exchange_connections')
            .update({ is_valid: false, updated_at: new Date().toISOString() })
            .eq('id', conn.id);
        } else {
          console.error('[trade-sync] connection sync failed:', conn.id, err);
        }
      }
    }

    return NextResponse.json({ synced: syncedCount, tradeCount: totalTradeCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Trade sync failed' },
      { status: 500 },
    );
  }
}
