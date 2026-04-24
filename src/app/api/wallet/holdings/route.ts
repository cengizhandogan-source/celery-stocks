import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = request.nextUrl.searchParams.get('userId') ?? user.id;

    // RLS handles privacy: if userId != current user and show_holdings is false,
    // the query returns empty results
    const { data, error } = await supabase
      .from('cached_holdings')
      .select('id, connection_id, user_id, asset, free_balance, locked_balance, usd_value, price_at_sync, synced_at')
      .eq('user_id', userId)
      .order('usd_value', { ascending: false });

    if (error) throw error;

    // Compute total
    const totalNetWorth = (data ?? []).reduce((sum, h) => sum + (h.usd_value ?? 0), 0);

    return NextResponse.json(
      { holdings: data ?? [], totalNetWorth },
      {
        headers: { 'Cache-Control': 'private, s-maxage=0, max-age=30, stale-while-revalidate=60' },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch holdings' },
      { status: 500 }
    );
  }
}
