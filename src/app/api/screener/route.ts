import { NextRequest, NextResponse } from 'next/server';
import { getScreener } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  const scrId = req.nextUrl.searchParams.get('scrId') || 'most_actives';
  try {
    const results = await getScreener(scrId);
    return NextResponse.json(results, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
