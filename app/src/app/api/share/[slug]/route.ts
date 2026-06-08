import { NextRequest, NextResponse } from 'next/server';
import { getTestRunBySlug } from '@/lib/db/schema';
import { getEndpointAnalytics, getRawRequestData, getLatencyHistogram } from '@/lib/analytics';
import { parseTestRun } from '@/lib/db/jsonb';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  try {
    const run = await getTestRunBySlug(slug);

    if (!run) {
      return NextResponse.json(
        { success: false, message: 'Run not found' },
        { status: 404 }
      );
    }

    const analytics = await getEndpointAnalytics(run.id);
    const rawData = await getRawRequestData({ runId: run.id });
    const histogram = await getLatencyHistogram(run.id);

    return NextResponse.json({
      success: true,
      run: parseTestRun(run),
      results: analytics,
      rawData,
      histogram,
      shareUrl: `/r/${slug}`,
    });
  } catch (error) {
    console.error('Error fetching shared run:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load shared run' },
      { status: 500 }
    );
  }
}