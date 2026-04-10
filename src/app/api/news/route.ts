import { NextRequest, NextResponse } from 'next/server';
import { getNews } from '@/lib/yahoo';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || 'market';

    const articles = await getNews(q.trim());
    return NextResponse.json({ articles }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch news' },
      { status: 500 }
    );
  }
}
