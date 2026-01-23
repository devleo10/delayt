import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { EndpointConfig, AnalyticsResult, TestRun } from '../../packages/shared/src';
import EndpointForm from './components/EndpointForm';
import ResultsTable from './components/ResultsTable';
import LatencyChart from './components/LatencyChart';
import ErrorBoundary from './components/ErrorBoundary';
import ProgressIndicator from './components/ProgressIndicator';
import './components/ErrorBoundary.css';
import './components/ProgressIndicator.css';
import './App.css';

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
  const [clipboardError, setClipboardError] = useState<string | null>(null);
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
        endpoints: endpointList,
        status: 'running',
        requestCount: reqCount,
        startedAt: new Date(),
        createdAt: new Date(),
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
      const response = await axios.get(`${API_BASE_URL}/api/run/${currentRun.id}`, {
        timeout: 10000 // 10 second timeout
      });
      const { run, results: runResults } = response.data;
      
      setResults(runResults);
      setCurrentRun(run);
      
      if (run.status === 'completed' || run.status === 'failed') {
        setPolling(false);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error polling results:', err);
      // Only stop polling on 404 (run not found)
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setPolling(false);
        setLoading(false);
        setError('Test run not found. The run may have expired.');
      }
    }
  }, [currentRun]);

  useEffect(() => {
    if (!polling) return;

    const pollInterval = setInterval(pollResults, 2000);
    return () => clearInterval(pollInterval);
  }, [polling, pollResults]);

  const copyShareUrl = async () => {
    if (shareUrl) {
      setClipboardError(null);
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        setClipboardError((err as Error)?.message || 'Failed to copy to clipboard');
        setCopied(false);
        setTimeout(() => setClipboardError(null), 4000);
      }
    }
  };

  const getProgressPercentage = () => {
    if (!currentRun || results.length === 0) return 0;
    const totalExpected = endpoints.length * requestCount;
    const completed = results.reduce((sum, r) => sum + r.request_count, 0);
    return Math.round((completed / totalExpected) * 100);
  };

  return (
    <ErrorBoundary>
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
            <ProgressIndicator
              percentage={getProgressPercentage()}
              message={`Running tests on ${endpoints.length} endpoint${endpoints.length > 1 ? 's' : ''}...`}
              status={currentRun.status === 'failed' ? 'failed' : 'running'}
              showSteps={true}
              currentStep={results.length}
              totalSteps={endpoints.length}
            />
          )}
          
          {shareUrl && (
            <div className="share-box">
              <span className="share-box-label">Share results:</span>
              <span className="share-box-url">{shareUrl}</span>
              <button className="share-box-button" onClick={copyShareUrl}>
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              {clipboardError && (
                <div className="share-error" role="status">
                  Copy failed: {clipboardError}
                </div>
              )}
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
    </ErrorBoundary>
  );
}

export default App;

