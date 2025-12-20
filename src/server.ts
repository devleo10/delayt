import express from 'express';
import cors from 'cors';
import { ApiRunner } from './runner';
import { Storage } from './storage';
import { Analytics } from './analytics';
import { ApiEndpoint } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const runner = new ApiRunner();
const storage = new Storage();
const analytics = new Analytics();

/**
 * POST /api/test
 * Accepts a list of API endpoints and runs 50 sequential requests for each.
 */
app.post('/api/test', async (req, res) => {
  try {
    const endpoints: ApiEndpoint[] = req.body.endpoints;
    
    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return res.status(400).json({ error: 'endpoints array is required' });
    }

    console.log(`Received ${endpoints.length} endpoints to test`);

    // Run all endpoints sequentially
    for (const endpoint of endpoints) {
      const results = await runner.runEndpoint(endpoint);
      await storage.saveResults(results);
    }

    res.json({ success: true, message: 'Tests completed' });
  } catch (error: any) {
    console.error('Error running tests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics
 * Returns percentile statistics and payload bucket analysis.
 */
app.get('/api/analytics', async (req, res) => {
  try {
    const results = await storage.getAllResults();
    const percentileStats = analytics.computePercentiles(results);
    const payloadBuckets = analytics.computePayloadBuckets(results);

    res.json({
      percentileStats,
      payloadBuckets,
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

