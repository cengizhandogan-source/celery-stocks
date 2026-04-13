import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = request.nextUrl.searchParams.get('userId') ?? user.id;

    const { data, error } = await supabase
      .from('net_worth_snapshots')
      .select('date, total_usd')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ snapshots: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch net worth history' },
      { status: 500 }
    );
  }
}
