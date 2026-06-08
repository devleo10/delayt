import { NextRequest, NextResponse } from 'next/server';
import { getRecentTestRuns, getTestRunsBySlugs } from '@/lib/db/schema';
import { parseTestRun } from '@/lib/db/jsonb';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slugsParam = searchParams.get('slugs');
  const limitParam = searchParams.get('limit');

  try {
    if (slugsParam) {
      const slugs = slugsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (slugs.length > 50) {
        return NextResponse.json(
          { success: false, message: 'Maximum 50 slugs' },
          { status: 400 }
        );
      }
      const runs = await getTestRunsBySlugs(slugs);
      return NextResponse.json({
        success: true,
        runs: runs.map(parseTestRun),
      });
    }

    const limit = Math.min(Math.max(parseInt(limitParam || '10', 10) || 10, 1), 50);
    const runs = await getRecentTestRuns(limit);
    return NextResponse.json({
      success: true,
      runs: runs.map(parseTestRun),
    });
  } catch (error) {
    console.error('Error fetching runs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch runs' },
      { status: 500 }
    );
  }
}