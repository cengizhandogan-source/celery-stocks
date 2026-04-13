import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { getAdapter, encrypt } from '@/lib/exchanges';

export async function GET() {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('exchange_connections')
      .select('id, user_id, exchange, label, is_valid, last_synced_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ connections: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { exchange, apiKey, apiSecret, passphrase, label } = body as {
      exchange: string;
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
      label?: string;
    };

    if (!exchange || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'exchange, apiKey, and apiSecret are required' }, { status: 400 });
    }

    // Validate credentials with the exchange
    const adapter = getAdapter(exchange);
    const isValid = await adapter.validateCredentials(apiKey, apiSecret, passphrase);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid API credentials. Check your key, secret, and permissions.' }, { status: 400 });
    }

    // Encrypt credentials
    const keyEnc = encrypt(apiKey);
    const secretEnc = encrypt(apiSecret);

    const insertData: Record<string, unknown> = {
      user_id: user.id,
      exchange,
      label: label ?? '',
      api_key_enc: keyEnc.ciphertext,
      api_secret_enc: secretEnc.ciphertext,
      iv: keyEnc.iv, // same iv works since each encrypt() generates its own
    };

    // Store passphrase if provided
    if (passphrase) {
      const ppEnc = encrypt(passphrase);
      insertData.passphrase_enc = ppEnc.ciphertext;
      // Note: passphrase uses its own iv embedded in the ciphertext auth tag.
      // For simplicity we store a single iv column. In practice each field
      // needs its own iv. Let's store them all with the same iv by re-encrypting.
    }

    // Actually, each encrypt() call generates a unique IV. We need separate IVs.
    // Let's restructure: store iv per field by concatenating iv+ciphertext.
    // Simpler approach: use the same IV for all fields in one connection row.
    // Re-encrypt with a shared IV approach:

    // For correctness, let's store each encrypted field as iv(12) + ciphertext + authTag
    // This way the iv column is not needed separately.

    // Rethink: store iv as the IV from the key encryption. Store secret with its own IV
    // prepended to the ciphertext. This is getting complex - let's just store
    // iv + ciphertext as a single buffer for each field.

    // Simplest correct approach: each encrypted column stores iv(12) || ciphertext || authTag
    // Encode as hex (\x...) for PostgreSQL bytea input via PostgREST
    const keyBundle = Buffer.concat([keyEnc.iv, keyEnc.ciphertext]);
    const secretBundle = Buffer.concat([secretEnc.iv, secretEnc.ciphertext]);

    const row: Record<string, unknown> = {
      user_id: user.id,
      exchange,
      label: label ?? '',
      api_key_enc: '\\x' + keyBundle.toString('hex'),
      api_secret_enc: '\\x' + secretBundle.toString('hex'),
      iv: '\\x' + keyEnc.iv.toString('hex'), // kept for schema compatibility
    };

    if (passphrase) {
      const ppEnc = encrypt(passphrase);
      row.passphrase_enc = '\\x' + Buffer.concat([ppEnc.iv, ppEnc.ciphertext]).toString('hex');
    }

    const { data, error } = await supabase
      .from('exchange_connections')
      .insert(row)
      .select('id, user_id, exchange, label, is_valid, last_synced_at, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This exchange connection already exists' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add connection' },
      { status: 500 }
    );
  }
}
