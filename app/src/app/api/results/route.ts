import { NextRequest, NextResponse } from 'next/server';
import { getEndpointAnalytics } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const runId = searchParams.get('runId') || undefined;

  try {
    const results = await getEndpointAnalytics(runId);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}