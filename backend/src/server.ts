import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { initializeSchema, getTestRunBySlug, getTestRunById, getRecentTestRuns } from './db/schema';
import { createAndStartRun } from './runner';
import { getEndpointAnalytics, getRawRequestData, getLatencyHistogram } from './analytics';
import { EndpointConfig, HttpMethod } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10);
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour

function rateLimit(req: Request, res: Response, next: Function) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return next();
  }
  
  if (record.count >= RATE_LIMIT_REQUESTS) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: `Maximum ${RATE_LIMIT_REQUESTS} test runs per hour. Please try again later.`,
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }
  
  record.count++;
  return next();
}

// Initialize database schema on startup
initializeSchema().catch((error) => {
  console.error('Failed to initialize database schema:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', version: '2.0.0' });
});

// ============================================
// POST /api/run - Start a new test run
// ============================================
app.post('/api/run', rateLimit, async (req: Request, res: Response) => {
  try {
    const { endpoints, requestCount = 50 } = req.body;

    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Expected { endpoints: Array<{url: string, method: string, headers?: object, payload?: object}>, requestCount?: number }' 
      });
    }

    if (endpoints.length > 10) {
      return res.status(400).json({
        error: 'Too many endpoints',
        message: 'Maximum 10 endpoints per test run'
      });
    }

    if (requestCount < 1 || requestCount > 200) {
      return res.status(400).json({
        error: 'Invalid request count',
        message: 'Request count must be between 1 and 200'
      });
    }

    const validMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    // Validate endpoint format
    for (const endpoint of endpoints) {
      if (!endpoint.url || typeof endpoint.url !== 'string') {
        return res.status(400).json({ error: 'Each endpoint must have a valid url string' });
      }
      
      // Validate URL format
      try {
        new URL(endpoint.url);
      } catch {
        return res.status(400).json({ error: `Invalid URL: ${endpoint.url}` });
      }
      
      if (!endpoint.method || !validMethods.includes(endpoint.method)) {
        return res.status(400).json({ 
          error: `Each endpoint must have method: ${validMethods.join(', ')}` 
        });
      }
      
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && 
          endpoint.payload && typeof endpoint.payload !== 'object') {
        return res.status(400).json({ error: 'Payload must be a valid object' });
      }
      
      if (endpoint.headers && typeof endpoint.headers !== 'object') {
        return res.status(400).json({ error: 'Headers must be a valid object' });
      }
    }

    // Create and start the run
    const { runId, slug } = await createAndStartRun(
      endpoints as EndpointConfig[],
      requestCount
    );

    const shareUrl = `${BASE_URL}/r/${slug}`;

    res.json({ 
      success: true,
      runId, 
      slug,
      shareUrl,
      message: 'Tests started successfully'
    });
  } catch (error) {
    console.error('Error in /api/run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /api/run/:id - Get run status and results
// ============================================
app.get('/api/run/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Try to find by slug first, then by ID
    let run = await getTestRunBySlug(id);
    if (!run) {
      run = await getTestRunById(id);
    }
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const analytics = await getEndpointAnalytics(run.id);
    const rawData = await getRawRequestData({ runId: run.id });

    res.json({
      success: true,
      run: {
        id: run.id,
        slug: run.slug,
        endpoints: JSON.parse(run.endpoints),
        requestCount: run.request_count,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        createdAt: run.created_at,
      },
      results: analytics,
      rawData,
    });
  } catch (error) {
    console.error('Error in /api/run/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /r/:slug - Shareable link redirect/data
// ============================================
app.get('/r/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const run = await getTestRunBySlug(slug);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const analytics = await getEndpointAnalytics(run.id);
    const histogram = await getLatencyHistogram(run.id);

    res.json({
      success: true,
      run: {
        id: run.id,
        slug: run.slug,
        endpoints: JSON.parse(run.endpoints),
        requestCount: run.request_count,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        createdAt: run.created_at,
      },
      results: analytics,
      histogram,
      shareUrl: `${BASE_URL}/r/${slug}`,
    });
  } catch (error) {
    console.error('Error in /r/:slug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// GET /api/runs - Get recent test runs (history)
// ============================================
app.get('/api/runs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const runs = await getRecentTestRuns(limit);
    
    res.json({
      success: true,
      runs: runs.map(run => ({
        id: run.id,
        slug: run.slug,
        endpoints: JSON.parse(run.endpoints),
        requestCount: run.request_count,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        createdAt: run.created_at,
        shareUrl: `${BASE_URL}/r/${run.slug}`,
      })),
    });
  } catch (error) {
    console.error('Error in /api/runs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// Legacy endpoints for backward compatibility
// ============================================

// GET /api/results - Get analytics results (legacy)
app.get('/api/results', async (req: Request, res: Response) => {
  try {
    const runId = req.query.runId as string | undefined;
    const analytics = await getEndpointAnalytics(runId);
    res.json({ success: true, results: analytics });
  } catch (error) {
    console.error('Error in /api/results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/raw - Get raw request data (legacy)
app.get('/api/raw/:endpoint?', async (req: Request, res: Response) => {
  try {
    const endpoint = req.params.endpoint ? decodeURIComponent(req.params.endpoint) : undefined;
    const runId = req.query.runId as string | undefined;
    const rawData = await getRawRequestData({ endpoint, runId });
    res.json({ success: true, data: rawData });
  } catch (error) {
    console.error('Error in /api/raw:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/histogram - Get latency histogram
app.get('/api/histogram', async (req: Request, res: Response) => {
  try {
    const runId = req.query.runId as string | undefined;
    const histogram = await getLatencyHistogram(runId);
    res.json({ success: true, histogram });
  } catch (error) {
    console.error('Error in /api/histogram:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Delayr API server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   API docs: http://localhost:${PORT}/api`);
});

