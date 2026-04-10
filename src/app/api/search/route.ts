import { NextRequest, NextResponse } from 'next/server';
import { searchTickers } from '@/lib/yahoo';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';

    if (!q.trim()) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchTickers(q.trim());
    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search' },
      { status: 500 }
    );
  }
}
