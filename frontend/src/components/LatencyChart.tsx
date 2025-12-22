import React, { useEffect, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import axios from 'axios';
import './LatencyChart.css';

interface AnalyticsResult {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  avg_payload_size: number;
  request_count: number;
}

interface LatencyChartProps {
  results: AnalyticsResult[];
}

interface ChartDataPoint {
  endpoint: string;
  method: string;
  payloadSize: number;
  latency: number;
  p50: number;
  p95: number;
  p99: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const LatencyChart: React.FC<LatencyChartProps> = ({ results }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      const dataPoints: ChartDataPoint[] = [];

      try {
        // Create a set of endpoint+method combinations from results for filtering
        const endpointSet = new Set<string>();
        results.forEach(r => {
          endpointSet.add(`${r.endpoint}::${r.method}`);
        });

        // Fetch all raw data at once (more reliable than per-endpoint)
        const response = await axios.get(`${API_BASE_URL}/api/raw`);
        const allRawData = response.data.data;

        // Create a map of endpoint+method to analytics for quick lookup
        const analyticsMap = new Map<string, AnalyticsResult>();
        results.forEach(r => {
          analyticsMap.set(`${r.endpoint}::${r.method}`, r);
        });

        // Filter and create data points only for endpoints in current results
        for (const point of allRawData) {
          const key = `${point.endpoint}::${point.method}`;
          
          // Only include data points that match the current results
          if (endpointSet.has(key)) {
            const analytics = analyticsMap.get(key);
            
            if (analytics) {
              dataPoints.push({
                endpoint: point.endpoint,
                method: point.method,
                payloadSize: point.request_size_bytes,
                latency: Number(point.latency_ms),
                p50: analytics.p50,
                p95: analytics.p95,
                p99: analytics.p99,
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }

      setChartData(dataPoints);
      setLoading(false);
    };

    if (results.length > 0) {
      fetchChartData();
    } else {
      setChartData([]);
      setLoading(false);
    }
  }, [results]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-endpoint">{data.endpoint}</p>
          <p className="tooltip-method">Method: {data.method}</p>
          <p>Payload: {data.payloadSize} bytes</p>
          <p>Latency: {data.latency.toFixed(2)}ms</p>
          <p className="tooltip-stats">
            p50: {data.p50.toFixed(2)}ms | p95: {data.p95.toFixed(2)}ms | p99:{' '}
            {data.p99.toFixed(2)}ms
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  if (chartData.length === 0) {
    return (
      <div className="chart-empty">No data available for chart visualization</div>
    );
  }

  // Separate data by method for different colors
  const getData = chartData.filter((d) => d.method === 'GET');
  const postData = chartData.filter((d) => d.method === 'POST');

  // Calculate axis domains for better visibility
  const allPayloadSizes = chartData.map(d => d.payloadSize);
  const allLatencies = chartData.map(d => d.latency);
  const maxPayload = Math.max(...allPayloadSizes, 0);
  const maxLatency = Math.max(...allLatencies, 0);
  
  // Add padding to domains
  const xDomain = [Math.max(0, -maxPayload * 0.1), maxPayload * 1.1 || 100];
  const yDomain = [0, maxLatency * 1.1 || 100];

  return (
    <div className="latency-chart-container">
      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="payloadSize"
            name="Payload Size"
            unit=" bytes"
            domain={xDomain}
            label={{ value: 'Payload Size (bytes)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            type="number"
            dataKey="latency"
            name="Latency"
            unit=" ms"
            domain={yDomain}
            label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {getData.length > 0 && (
            <Scatter
              name="GET Requests"
              data={getData}
              fill="#4caf50"
            >
              {getData.map((entry, index) => (
                <Cell key={`get-${index}`} fill="#4caf50" />
              ))}
            </Scatter>
          )}
          {postData.length > 0 && (
            <Scatter
              name="POST Requests"
              data={postData}
              fill="#2196f3"
            >
              {postData.map((entry, index) => (
                <Cell key={`post-${index}`} fill="#2196f3" />
              ))}
            </Scatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div className="chart-note">
        <p>
          Each point represents a single request. X-axis shows payload size
          (request body size for POST, 0 for GET), Y-axis shows latency in
          milliseconds.
        </p>
      </div>
    </div>
  );
};

export default LatencyChart;

