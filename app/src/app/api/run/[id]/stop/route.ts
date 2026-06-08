import { NextRequest, NextResponse } from 'next/server';
import { getTestRunBySlug, getTestRunById, updateTestRunStatus } from '@/lib/db/schema';
import { cancelRun } from '@/lib/runner';

export async function POST(
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

    if (run.status !== 'running' && run.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Run is not currently running' },
        { status: 400 }
      );
    }

    cancelRun(run.id);
    await updateTestRunStatus(run.id, 'failed');

    return NextResponse.json({
      success: true,
      message: 'Run stopped successfully',
    });
  } catch (error) {
    console.error('Error stopping run:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to stop run' },
      { status: 500 }
    );
  }
}