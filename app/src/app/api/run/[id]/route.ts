import { NextRequest, NextResponse } from 'next/server';
import { getTestRunBySlug, getTestRunById } from '@/lib/db/schema';
import { getEndpointAnalytics, getRawRequestData } from '@/lib/analytics';
import { parseEndpoints, parseTestRun } from '@/lib/db/jsonb';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    let run = await getTestRunBySlug(id);
    if (!run) {
      run = await getTestRunById(id);
    }

    if (!run) {
      return NextResponse.json(
        { success: false, message: 'Run not found' },
        { status: 404 }
      );
    }

    const analytics = await getEndpointAnalytics(run.id);
    const rawData = await getRawRequestData({ runId: run.id });

    return NextResponse.json({
      success: true,
      run: parseTestRun(run),
      results: analytics,
      rawData,
    });
  } catch (error) {
    console.error('Error fetching run:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch run' },
      { status: 500 }
    );
  }
}