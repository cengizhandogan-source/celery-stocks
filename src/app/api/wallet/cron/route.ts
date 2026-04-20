import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getAdapter } from '@/lib/exchanges';
import { ExchangeAuthError } from '@/lib/exchanges/types';
import { decrypt } from '@/lib/exchanges/encryption';
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

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role client to bypass RLS
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    // Find connections that haven't been synced in 5+ minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();

    const { data: connections, error } = await supabase
      .from('exchange_connections')
      .select('*')
      .eq('is_valid', true)
      .or(`last_synced_at.is.null,last_synced_at.lt.${fiveMinAgo}`)
      .order('last_synced_at', { ascending: true, nullsFirst: true })
      .limit(50); // batch size to avoid timeout

    if (error) throw error;
    if (!connections || connections.length === 0) {
      return NextResponse.json({ synced: 0 });
    }

    let syncedCount = 0;

    // Group connections by user for efficient processing
    const byUser = new Map<string, typeof connections>();
    for (const conn of connections) {
      const list = byUser.get(conn.user_id) ?? [];
      list.push(conn);
      byUser.set(conn.user_id, list);
    }

    for (const [userId, userConns] of byUser) {
      const allAssets = new Set<string>();
      const connectionBalances: { connectionId: string; balances: { asset: string; free: number; locked: number }[] }[] = [];

      for (const conn of userConns) {
        let markInvalid = false;
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
          syncedCount++;
        } catch (err) {
          if (err instanceof ExchangeAuthError) {
            markInvalid = true;
          } else {
            console.error('[wallet-cron] connection sync failed:', conn.id, err);
          }
        }

        const now = new Date().toISOString();
        await supabase
          .from('exchange_connections')
          .update(
            markInvalid
              ? { is_valid: false, last_synced_at: now, updated_at: now }
              : { last_synced_at: now, updated_at: now }
          )
          .eq('id', conn.id);
      }

      // Get prices (fallback to empty if CoinGecko fails)
      let prices: Record<string, number> = {};
      if (allAssets.size > 0) {
        try {
          prices = await getPrices([...allAssets]);
        } catch (err) {
          console.error('[wallet-cron] price fetch failed, storing with $0:', err);
        }
      }

      for (const { connectionId, balances } of connectionBalances) {
        await supabase.from('cached_holdings').delete().eq('connection_id', connectionId);

        const holdings = balances
          .filter((b) => b.free > 0 || b.locked > 0)
          .map((b) => {
            const asset = b.asset.toUpperCase();
            const price = prices[asset] ?? 0;
            return {
              connection_id: connectionId,
              user_id: userId,
              asset,
              free_balance: b.free,
              locked_balance: b.locked,
              usd_value: (b.free + b.locked) * price,
              price_at_sync: price,
              synced_at: new Date().toISOString(),
            };
          });

        if (holdings.length > 0) {
          await supabase.from('cached_holdings').insert(holdings);
        }
      }

      // Snapshot
      const { data: profile } = await supabase
        .from('profiles')
        .select('crypto_net_worth')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.crypto_net_worth != null) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('net_worth_snapshots')
          .upsert(
            { user_id: userId, date: today, total_usd: profile.crypto_net_worth },
            { onConflict: 'user_id,date' }
          );
      }
    }

    return NextResponse.json({ synced: syncedCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron sync failed' },
      { status: 500 }
    );
  }
}
