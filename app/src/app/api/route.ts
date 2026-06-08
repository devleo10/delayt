import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    routes: [
      { method: 'GET', path: '/api/health', description: 'Health check' },
      { method: 'POST', path: '/api/run', description: 'Start a new test run' },
      { method: 'GET', path: '/api/run/:id', description: 'Get run status and results by ID or slug' },
      { method: 'POST', path: '/api/run/:id/stop', description: 'Stop a running test run' },
      { method: 'GET', path: '/api/runs', description: 'Get recent test runs' },
      { method: 'POST', path: '/api/runs/import', description: 'Import a completed CLI run' },
      { method: 'GET', path: '/api/results', description: 'Get analytics results (legacy)' },
      { method: 'GET', path: '/api/raw', description: 'Get raw request data (legacy)' },
      { method: 'GET', path: '/api/histogram', description: 'Get latency histogram (legacy)' },
      { method: 'GET', path: '/r/:slug', description: 'Shareable run results page' },
    ],
  });
}