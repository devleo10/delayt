import { NextRequest, NextResponse } from 'next/server';
import { getRawRequestData } from '@/lib/analytics';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const runId = searchParams.get('runId') || undefined;
  const endpoint = searchParams.get('endpoint') || undefined;

  try {
    const data = await getRawRequestData({ runId, endpoint });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching raw data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch raw data' },
      { status: 500 }
    );
  }
}