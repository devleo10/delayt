import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PercentileStats, PayloadBucket } from './types';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

interface AnalyticsResponse {
  percentileStats: PercentileStats[];
  payloadBuckets: PayloadBucket[];
}

function App() {
  const [endpoints, setEndpoints] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get<AnalyticsResponse>(`${API_URL}/api/analytics`);
      setAnalytics(response.data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Parse endpoints from textarea (one per line)
      const endpointLines = endpoints
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const parsedEndpoints = endpointLines.map(line => {
        const parts = line.split(/\s+/);
        const method = parts[0].toUpperCase();
        const url = parts.slice(1).join(' ');
        
        if (method !== 'GET' && method !== 'POST') {
          throw new Error(`Invalid method: ${method}. Use GET or POST`);
        }

        return {
          url,
          method: method as 'GET' | 'POST',
          ...(method === 'POST' && parts[2] ? { payload: JSON.parse(parts[2]) } : {}),
        };
      });

      await axios.post(`${API_URL}/api/test`, { endpoints: parsedEndpoints });
      await loadAnalytics();
      setEndpoints('');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to run tests');
    } finally {
      setLoading(false);
    }
  };

  const getSlowEndpointThreshold = (stats: PercentileStats[]) => {
    if (stats.length === 0) return 0;
    // Consider endpoints with p95 > 1000ms as slow
    return 1000;
  };

  const isSlowEndpoint = (p95: number, threshold: number) => {
    return p95 > threshold;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>API Latency Visualizer</h1>
      </header>

      <main className="App-main">
        <section className="input-section">
          <h2>Add API Endpoints</h2>
          <p>Enter endpoints, one per line. Format: METHOD URL [PAYLOAD for POST]</p>
          <p className="example">Example: GET https://api.github.com/users/octocat</p>
          <p className="example">Example: POST https://jsonplaceholder.typicode.com/posts {"{"}"title": "test"{"}"}</p>
          
          <form onSubmit={handleSubmit}>
            <textarea
              value={endpoints}
              onChange={(e) => setEndpoints(e.target.value)}
              placeholder="GET https://api.github.com/users/octocat&#10;POST https://jsonplaceholder.typicode.com/posts"
              rows={6}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !endpoints.trim()}>
              {loading ? 'Running Tests...' : 'Run Tests (50 requests per endpoint)'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}
        </section>

        {analytics && analytics.percentileStats.length > 0 && (
          <section className="results-section">
            <h2>Analytics</h2>
            
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Method</th>
                    <th>P50 (ms)</th>
                    <th>P95 (ms)</th>
                    <th>P99 (ms)</th>
                    <th>Avg Payload (bytes)</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.percentileStats.map((stat, idx) => {
                    const threshold = getSlowEndpointThreshold(analytics.percentileStats);
                    const isSlow = isSlowEndpoint(stat.p95, threshold);
                    return (
                      <tr key={idx} className={isSlow ? 'slow-endpoint' : ''}>
                        <td className="endpoint-cell">{stat.endpoint}</td>
                        <td>{stat.method}</td>
                        <td>{stat.p50.toFixed(2)}</td>
                        <td className={isSlow ? 'highlight' : ''}>{stat.p95.toFixed(2)}</td>
                        <td>{stat.p99.toFixed(2)}</td>
                        <td>{stat.avg_payload_size}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {analytics.payloadBuckets.length > 0 && (
              <div className="chart-container">
                <h3>Payload Size vs Latency (P95)</h3>
                <PayloadChart buckets={analytics.payloadBuckets} />
              </div>
            )}
          </section>
        )}

        {analytics && analytics.percentileStats.length === 0 && (
          <div className="no-data">No test data available. Run some tests first.</div>
        )}
      </main>
    </div>
  );
}

function PayloadChart({ buckets }: { buckets: PayloadBucket[] }) {

  const data = buckets.map(bucket => ({
    payloadSize: bucket.bucket_max === -1 ? bucket.bucket_min + 1000 : (bucket.bucket_min + bucket.bucket_max) / 2,
    latency: bucket.p95,
    count: bucket.count,
    label: bucket.bucket_max === -1 
      ? `${bucket.bucket_min}+ bytes`
      : `${bucket.bucket_min}-${bucket.bucket_max} bytes`,
  }));

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          type="number" 
          dataKey="payloadSize" 
          name="Payload Size (bytes)"
          label={{ value: 'Payload Size (bytes)', position: 'insideBottom', offset: -5 }}
        />
        <YAxis 
          type="number" 
          dataKey="latency" 
          name="Latency (ms)"
          label={{ value: 'P95 Latency (ms)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value: any, name: string) => {
            if (name === 'latency') return [`${value.toFixed(2)} ms`, 'P95 Latency'];
            if (name === 'payloadSize') return [value, 'Payload Size'];
            return value;
          }}
          labelFormatter={(label) => `Bucket: ${data.find(d => d.payloadSize === label)?.label || label}`}
        />
        <Scatter name="Payload vs Latency" data={data} fill="#8884d8">
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export default App;
