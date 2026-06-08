import { NextRequest, NextResponse } from 'next/server';
import { getLatencyHistogram } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const runId = searchParams.get('runId') || undefined;

  try {
    const histogram = await getLatencyHistogram(runId);
    return NextResponse.json({ success: true, histogram });
  } catch (error) {
    console.error('Error fetching histogram:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch histogram' },
      { status: 500 }
    );
  }
}