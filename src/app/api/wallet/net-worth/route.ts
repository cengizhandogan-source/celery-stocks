import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const RANGE_DAYS: Record<string, number | null> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '1y': 365,
  'all': null,
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = request.nextUrl.searchParams.get('userId') ?? user.id;
    const rangeParam = request.nextUrl.searchParams.get('range') ?? '1y';
    const days = rangeParam in RANGE_DAYS ? RANGE_DAYS[rangeParam] : 365;

    let query = supabase
      .from('net_worth_snapshots')
      .select('date, total_usd')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (days != null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.gte('date', cutoff.toISOString().split('T')[0]);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(
      { snapshots: data ?? [] },
      {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch net worth history' },
      { status: 500 }
    );
  }
}
