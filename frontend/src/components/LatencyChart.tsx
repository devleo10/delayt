import { useEffect, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
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
  runId?: string;
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

interface HistogramData {
  bucket: string;
  count: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Dark theme colors
const COLORS = {
  GET: '#3fb950',
  POST: '#58a6ff',
  PUT: '#d29922',
  PATCH: '#a371f7',
  DELETE: '#f85149',
  bar: '#667eea',
};

const LatencyChart: React.FC<LatencyChartProps> = ({ results, runId }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [histogramData, setHistogramData] = useState<HistogramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scatter' | 'histogram' | 'comparison'>('scatter');

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

        // Fetch raw data
        const rawUrl = runId 
          ? `${API_BASE_URL}/api/raw?runId=${runId}`
          : `${API_BASE_URL}/api/raw`;
        const response = await axios.get(rawUrl);
        const allRawData = response.data.data;

        // Create a map of endpoint+method to analytics for quick lookup
        const analyticsMap = new Map<string, AnalyticsResult>();
        results.forEach(r => {
          analyticsMap.set(`${r.endpoint}::${r.method}`, r);
        });

        // Filter and create data points only for endpoints in current results
        for (const point of allRawData) {
          const key = `${point.endpoint}::${point.method}`;
          
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

        // Fetch histogram data
        const histogramUrl = runId 
          ? `${API_BASE_URL}/api/histogram?runId=${runId}`
          : `${API_BASE_URL}/api/histogram`;
        const histResponse = await axios.get(histogramUrl);
        setHistogramData(histResponse.data.histogram || []);
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
      setHistogramData([]);
      setLoading(false);
    }
  }, [results, runId]);

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
            p50: {data.p50.toFixed(2)}ms | p95: {data.p95.toFixed(2)}ms | p99: {data.p99.toFixed(2)}ms
          </p>
        </div>
      );
    }
    return null;
  };

  const HistogramTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <p><strong>{payload[0].payload.bucket}</strong></p>
          <p>{payload[0].value} requests</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="chart-loading">Loading chart data...</div>;
  }

  if (chartData.length === 0 && histogramData.length === 0) {
    return (
      <div className="chart-empty">No data available for chart visualization</div>
    );
  }

  // Group data by method for scatter chart
  const dataByMethod: Record<string, ChartDataPoint[]> = {};
  chartData.forEach(d => {
    if (!dataByMethod[d.method]) {
      dataByMethod[d.method] = [];
    }
    dataByMethod[d.method].push(d);
  });

  // Calculate axis domains
  const allPayloadSizes = chartData.map(d => d.payloadSize);
  const allLatencies = chartData.map(d => d.latency);
  const maxPayload = Math.max(...allPayloadSizes, 0);
  const maxLatency = Math.max(...allLatencies, 0);
  const xDomain = [0, maxPayload * 1.1 || 100];
  const yDomain = [0, maxLatency * 1.1 || 100];

  // Comparison chart data (p50, p95, p99 by endpoint)
  const comparisonData = results.map(r => ({
    name: r.endpoint.split('/').pop() || r.endpoint,
    fullEndpoint: r.endpoint,
    method: r.method,
    p50: r.p50,
    p95: r.p95,
    p99: r.p99,
  }));

  return (
    <div className="latency-chart-container">
      {/* Tabs */}
      <div className="chart-tabs">
        <button 
          className={`chart-tab ${activeTab === 'scatter' ? 'active' : ''}`}
          onClick={() => setActiveTab('scatter')}
        >
          📍 Scatter Plot
        </button>
        <button 
          className={`chart-tab ${activeTab === 'histogram' ? 'active' : ''}`}
          onClick={() => setActiveTab('histogram')}
        >
          Histogram
        </button>
        <button 
          className={`chart-tab ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Comparison
        </button>
      </div>

      <div className="chart-wrapper">
        {activeTab === 'scatter' && (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis
                  type="number"
                  dataKey="payloadSize"
                  name="Payload Size"
                  unit=" bytes"
                  domain={xDomain}
                  stroke="#8b949e"
                  tick={{ fill: '#8b949e' }}
                  label={{ value: 'Payload Size (bytes)', position: 'insideBottom', offset: -5, fill: '#8b949e' }}
                />
                <YAxis
                  type="number"
                  dataKey="latency"
                  name="Latency"
                  unit=" ms"
                  domain={yDomain}
                  stroke="#8b949e"
                  tick={{ fill: '#8b949e' }}
                  label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#8b949e' }}
                />
                <Tooltip content={<CustomTooltip />} />
                {Object.entries(dataByMethod).map(([method, data]) => (
                  <Scatter
                    key={method}
                    name={`${method} Requests`}
                    data={data}
                    fill={COLORS[method as keyof typeof COLORS] || '#8b949e'}
                  >
                    {data.map((_, index) => (
                      <Cell 
                        key={`${method}-${index}`} 
                        fill={COLORS[method as keyof typeof COLORS] || '#8b949e'} 
                      />
                    ))}
                  </Scatter>
                ))}
              </ScatterChart>
            </ResponsiveContainer>
            <div className="chart-legend">
              {Object.keys(dataByMethod).map(method => (
                <div key={method} className="legend-item">
                  <span className={`legend-dot ${method.toLowerCase()}`}></span>
                  <span>{method}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'histogram' && histogramData.length > 0 && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={histogramData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis 
                dataKey="bucket" 
                stroke="#8b949e"
                tick={{ fill: '#8b949e' }}
                label={{ value: 'Latency Range', position: 'insideBottom', offset: -5, fill: '#8b949e' }}
              />
              <YAxis 
                stroke="#8b949e"
                tick={{ fill: '#8b949e' }}
                label={{ value: 'Request Count', angle: -90, position: 'insideLeft', fill: '#8b949e' }}
              />
              <Tooltip content={<HistogramTooltip />} />
              <Bar dataKey="count" fill={COLORS.bar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'comparison' && (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={comparisonData} margin={{ top: 20, right: 20, bottom: 80, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis 
                dataKey="name" 
                stroke="#8b949e"
                tick={{ fill: '#8b949e', transform: 'rotate(-45)', textAnchor: 'end' }}
                height={80}
              />
              <YAxis 
                stroke="#8b949e"
                tick={{ fill: '#8b949e' }}
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', fill: '#8b949e' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#161b22', 
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#e6edf3'
                }}
              />
              <Bar dataKey="p50" name="p50" fill="#3fb950" radius={[2, 2, 0, 0]} />
              <Bar dataKey="p95" name="p95" fill="#d29922" radius={[2, 2, 0, 0]} />
              <Bar dataKey="p99" name="p99" fill="#f85149" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default LatencyChart;

