import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EndpointForm from './components/EndpointForm';
import ResultsTable from './components/ResultsTable';
import LatencyChart from './components/LatencyChart';
import './App.css';

interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: object;
  headers?: Record<string, string>;
  name?: string;
}

interface AnalyticsResult {
  endpoint: string;
  method: string;
  name?: string;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  stdDev: number;
  avg_payload_size: number;
  request_count: number;
  error_count: number;
  error_rate: number;
  success_rate: number;
}

interface TestRun {
  id: string;
  slug: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  requestCount: number;
  startedAt?: string;
  completedAt?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([]);
  const [results, setResults] = useState<AnalyticsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [requestCount, setRequestCount] = useState(50);

  // Check for shared run in URL
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/r\/([a-z0-9]+)/);
    if (match) {
      loadSharedRun(match[1]);
    }
  }, []);

  const loadSharedRun = async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE_URL}/r/${slug}`);
      const { run, results: runResults } = response.data;
      
      setCurrentRun(run);
      setResults(runResults);
      setEndpoints(run.endpoints);
      setShareUrl(`${window.location.origin}/r/${slug}`);
      
      if (run.status === 'running' || run.status === 'pending') {
        setPolling(true);
      }
    } catch (err) {
      console.error('Error loading shared run:', err);
      setError('Failed to load shared results. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (endpointList: EndpointConfig[], reqCount: number) => {
    setEndpoints(endpointList);
    setRequestCount(reqCount);
    setLoading(true);
    setError(null);
    setResults([]);
    setShareUrl(null);
    setCurrentRun(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/run`, {
        endpoints: endpointList,
        requestCount: reqCount,
      });

      const { runId, slug, shareUrl: url } = response.data;
      
      setCurrentRun({
        id: runId,
        slug,
        status: 'running',
        requestCount: reqCount,
      });
      setShareUrl(url);
      
      // Update URL without reload
      window.history.pushState({}, '', `/r/${slug}`);
      
      // Start polling for results
      setPolling(true);
    } catch (err: any) {
      console.error('Error starting tests:', err);
      if (err.response?.status === 429) {
        setError(err.response.data.message || 'Rate limit exceeded. Please try again later.');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to start tests. Make sure the backend is running.'
        );
      }
      setLoading(false);
    }
  };

  const pollResults = useCallback(async () => {
    if (!currentRun) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/run/${currentRun.id}`);
      const { run, results: runResults } = response.data;
      
      setResults(runResults);
      setCurrentRun(run);
      
      if (run.status === 'completed' || run.status === 'failed') {
        setPolling(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error polling results:', err);
    }
  }, [currentRun]);

  useEffect(() => {
    if (!polling) return;

    const pollInterval = setInterval(pollResults, 2000);
    return () => clearInterval(pollInterval);
  }, [polling, pollResults]);

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getProgressPercentage = () => {
    if (!currentRun || results.length === 0) return 0;
    const totalExpected = endpoints.length * requestCount;
    const completed = results.reduce((sum, r) => sum + r.request_count, 0);
    return Math.round((completed / totalExpected) * 100);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Delayr</h1>
        <p>API latency testing with percentile analysis (p50, p95, p99)</p>
        <span className="header-badge">v2.0</span>
      </header>

      <main className="app-main">
        <section className="form-section">
          <EndpointForm 
            onSubmit={handleSubmit} 
            disabled={loading}
            initialRequestCount={requestCount}
          />
          
          {error && <div className="error-message">{error}</div>}
          
          {loading && currentRun && (
            <div className="loading-message">
              Running tests ({getProgressPercentage()}% complete)... 
              {currentRun.status === 'running' && ' Results will appear below.'}
            </div>
          )}
          
          {shareUrl && (
            <div className="share-box">
              <span className="share-box-label">Share results:</span>
              <span className="share-box-url">{shareUrl}</span>
              <button className="share-box-button" onClick={copyShareUrl}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          )}
        </section>

        {results.length > 0 && (
          <>
            {/* Stats Summary */}
            <div className="stats-summary">
              <div className="stat-card">
                <div className="stat-card-value">
                  {results.reduce((sum, r) => sum + r.request_count, 0)}
                </div>
                <div className="stat-card-label">Total Requests</div>
              </div>
              <div className="stat-card">
                <div className={`stat-card-value ${
                  Math.max(...results.map(r => r.p95)) < 200 ? 'success' : 
                  Math.max(...results.map(r => r.p95)) < 500 ? 'warning' : 'danger'
                }`}>
                  {Math.max(...results.map(r => r.p95)).toFixed(0)}ms
                </div>
                <div className="stat-card-label">Worst p95</div>
              </div>
              <div className="stat-card">
                <div className={`stat-card-value ${
                  results.every(r => r.error_rate === 0) ? 'success' : 'danger'
                }`}>
                  {(results.reduce((sum, r) => sum + r.success_rate, 0) / results.length).toFixed(1)}%
                </div>
                <div className="stat-card-label">Avg Success Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-value">
                  {results.length}
                </div>
                <div className="stat-card-label">Endpoints Tested</div>
              </div>
            </div>

            <section className="results-section">
              <h2>Results</h2>
              <ResultsTable results={results} />
            </section>

            <section className="chart-section">
                <h2>Latency Distribution</h2>
              <LatencyChart results={results} runId={currentRun?.id} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;

