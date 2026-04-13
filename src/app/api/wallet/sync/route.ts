import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAdapter, decrypt } from '@/lib/exchanges';
import { ExchangeAuthError } from '@/lib/exchanges/types';
import { getPrices } from '@/lib/coingecko';

const IV_LENGTH = 12;

function decodeBytea(value: string): Buffer {
  const hex = value.startsWith('\\x') ? value.slice(2) : value;
  return Buffer.from(hex, 'hex');
}

function decryptBundle(raw: string): string {
  const bundle = decodeBytea(raw);
  const iv = bundle.subarray(0, IV_LENGTH);
  const ciphertext = bundle.subarray(IV_LENGTH);
  return decrypt(ciphertext, iv);
}

export async function POST() {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all connections for this user
    const { data: connections, error: connError } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_valid', true);

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ message: 'No connections to sync' });
    }

    // Check rate limit: skip if last synced < 1 minute ago
    const recentlySynced = connections.every(
      (c) => c.last_synced_at && Date.now() - new Date(c.last_synced_at).getTime() < 60_000
    );
    if (recentlySynced) {
      return NextResponse.json({ message: 'Recently synced, skipping' });
    }

    // Fetch balances from each exchange
    const allAssets = new Set<string>();
    const connectionBalances: { connectionId: string; balances: { asset: string; free: number; locked: number }[] }[] = [];

    for (const conn of connections) {
      // Skip if synced less than 1 minute ago
      if (conn.last_synced_at && Date.now() - new Date(conn.last_synced_at).getTime() < 60_000) {
        continue;
      }

      try {
        const adapter = getAdapter(conn.exchange);
        const apiKey = decryptBundle(conn.api_key_enc);
        const apiSecret = decryptBundle(conn.api_secret_enc);
        const passphrase = conn.passphrase_enc
          ? decryptBundle(conn.passphrase_enc)
          : undefined;

        const balances = await adapter.fetchBalances(apiKey, apiSecret, passphrase);
        connectionBalances.push({ connectionId: conn.id, balances });
        balances.forEach((b) => allAssets.add(b.asset.toUpperCase()));

        // Update last_synced_at
        await supabase
          .from('exchange_connections')
          .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', conn.id);
      } catch (err) {
        if (err instanceof ExchangeAuthError) {
          await supabase
            .from('exchange_connections')
            .update({ is_valid: false, updated_at: new Date().toISOString() })
            .eq('id', conn.id);
        } else {
          console.error('[wallet-sync] connection sync failed:', conn.id, err);
        }
      }
    }

    // Get prices for all assets (fallback to empty if CoinGecko fails)
    let prices: Record<string, number> = {};
    if (allAssets.size > 0) {
      try {
        prices = await getPrices([...allAssets]);
      } catch (err) {
        console.error('[wallet-sync] price fetch failed, storing with $0:', err);
      }
    }

    // Upsert holdings for each connection
    for (const { connectionId, balances } of connectionBalances) {
      // Delete old holdings for this connection
      await supabase
        .from('cached_holdings')
        .delete()
        .eq('connection_id', connectionId);

      // Insert new holdings
      const holdings = balances
        .filter((b) => b.free > 0 || b.locked > 0)
        .map((b) => {
          const asset = b.asset.toUpperCase();
          const price = prices[asset] ?? 0;
          const totalAmount = b.free + b.locked;
          return {
            connection_id: connectionId,
            user_id: user.id,
            asset,
            free_balance: b.free,
            locked_balance: b.locked,
            usd_value: totalAmount * price,
            price_at_sync: price,
            synced_at: new Date().toISOString(),
          };
        });

      if (holdings.length > 0) {
        await supabase.from('cached_holdings').insert(holdings);
      }
    }

    // Upsert net worth snapshot for today
    const { data: profile } = await supabase
      .from('profiles')
      .select('crypto_net_worth')
      .eq('id', user.id)
      .single();

    if (profile?.crypto_net_worth != null) {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('net_worth_snapshots')
        .upsert(
          { user_id: user.id, date: today, total_usd: profile.crypto_net_worth },
          { onConflict: 'user_id,date' }
        );
    }

    return NextResponse.json({
      synced: connectionBalances.length,
      totalNetWorth: profile?.crypto_net_worth ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
