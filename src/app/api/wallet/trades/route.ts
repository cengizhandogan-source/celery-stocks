import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10);
    const offset = parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10);

    const { data, error } = await supabase
      .from('cached_trades')
      .select('*')
      .eq('user_id', user.id)
      .order('executed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ trades: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch trades' },
      { status: 500 },
    );
  }
}
