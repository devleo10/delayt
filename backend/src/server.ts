import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { initializeSchema } from './db/schema';
import { runEndpointTests } from './runner';
import { getEndpointAnalytics, getRawRequestData } from './analytics';
import { EndpointConfig } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database schema on startup
initializeSchema().catch((error) => {
  console.error('Failed to initialize database schema:', error);
  process.exit(1);
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// POST /api/run - Accept endpoints and trigger runner
app.post('/api/run', async (req: Request, res: Response) => {
  try {
    const { endpoints } = req.body;

    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request. Expected { endpoints: Array<{url: string, method: "GET"|"POST", payload?: object}> }' 
      });
    }

    // Validate endpoint format
    for (const endpoint of endpoints) {
      if (!endpoint.url || typeof endpoint.url !== 'string') {
        return res.status(400).json({ error: 'Each endpoint must have a valid url string' });
      }
      if (!endpoint.method || !['GET', 'POST'].includes(endpoint.method)) {
        return res.status(400).json({ error: 'Each endpoint must have method "GET" or "POST"' });
      }
      if (endpoint.method === 'POST' && endpoint.payload && typeof endpoint.payload !== 'object') {
        return res.status(400).json({ error: 'POST endpoints must have a valid payload object' });
      }
    }

    // Run tests asynchronously (don't wait for completion)
    runEndpointTests(endpoints as EndpointConfig[]).catch((error) => {
      console.error('Error running endpoint tests:', error);
    });

    // Return immediately with a job ID (simple implementation)
    const jobId = `job_${Date.now()}`;
    res.json({ jobId, message: 'Tests started' });
  } catch (error) {
    console.error('Error in /api/run:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/results - Get analytics results
app.get('/api/results', async (req: Request, res: Response) => {
  try {
    const analytics = await getEndpointAnalytics();
    res.json({ results: analytics });
  } catch (error) {
    console.error('Error in /api/results:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/raw/:endpoint? - Get raw request data
app.get('/api/raw/:endpoint?', async (req: Request, res: Response) => {
  try {
    const endpoint = req.params.endpoint ? decodeURIComponent(req.params.endpoint) : undefined;
    const rawData = await getRawRequestData(endpoint);
    res.json({ data: rawData });
  } catch (error) {
    console.error('Error in /api/raw:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

