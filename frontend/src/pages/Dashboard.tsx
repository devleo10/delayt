import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { EndpointConfig, AnalyticsResult, TestRun } from '@delayt/shared';
import { API_BASE_URL, buildShareUrl } from '../config';
import { addRunSlugToCookie } from '../utils/runCookies';
import TopNav from '../components/TopNav';
import RunHistory from '../components/RunHistory';
import EndpointForm from '../components/EndpointForm';
import MetricCards from '../components/MetricCards';
import ResultsTable from '../components/ResultsTable';
import LatencyChart from '../components/LatencyChart';
import ErrorBoundary from '../components/ErrorBoundary';
import ProgressIndicator from '../components/ProgressIndicator';
import CliExport from '../components/CliExport';
import ShareCard from '../components/ShareCard';
import PerformanceInsights from '../components/PerformanceInsights';
import ComparisonMode from '../components/ComparisonMode';
import EducationalModal from '../components/EducationalModal';
import '../components/ErrorBoundary.css';
import '../components/ProgressIndicator.css';
import '../components/TopNav.css';
import '../components/RunHistory.css';
import '../components/MetricCards.css';
import '../App.css';

type ResultsTab = 'results' | 'histogram' | 'scatter' | 'compare';

interface DashboardProps {
  onNavigate: (path: string) => void;
  initialSlug?: string;
}

function Dashboard({ onNavigate, initialSlug }: DashboardProps) {
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
  const [completedRequests, setCompletedRequests] = useState(0);
  const [showEducational, setShowEducational] = useState(false);
  const [resultsTab, setResultsTab] = useState<ResultsTab>('results');
  const [activeSlug, setActiveSlug] = useState<string | null>(initialSlug ?? null);
  const [historyKey, setHistoryKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('delayt_sidebar_open') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      const next = !open;
      try {
        localStorage.setItem('delayt_sidebar_open', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const loadSharedRun = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    setActiveSlug(slug);
    try {
      const response = await axios.get(`${API_BASE_URL}/r/${slug}`);
      const { run, results: runResults } = response.data;

      setCurrentRun(run);
      setResults(runResults);
      setEndpoints(run.endpoints);
      setRequestCount(run.requestCount);
      setShareUrl(buildShareUrl(slug));
      setResultsTab('results');

      addRunSlugToCookie(slug);

      if (run.status === 'running' || run.status === 'pending') {
        setPolling(true);
      }
      setHistoryKey((k) => k + 1);
    } catch (err) {
      console.error('Error loading shared run:', err);
      setError('Failed to load shared results. The link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialSlug) {
      loadSharedRun(initialSlug);
    }
  }, [initialSlug, loadSharedRun]);

  const handleSubmit = async (endpointList: EndpointConfig[], reqCount: number) => {
    setEndpoints(endpointList);
    setRequestCount(reqCount);
    setLoading(true);
    setError(null);
    setResults([]);
    setShareUrl(null);
    setCurrentRun(null);
    setCompletedRequests(0);
    setResultsTab('results');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/run`, {
        endpoints: endpointList,
        requestCount: reqCount,
      });

      const { runId, slug } = response.data;

      setActiveSlug(slug);
      setCurrentRun({
        id: runId,
        slug,
        endpoints: endpointList,
        status: 'running',
        requestCount: reqCount,
        startedAt: new Date(),
        createdAt: new Date(),
      });
      setShareUrl(buildShareUrl(slug));

      addRunSlugToCookie(slug);

      onNavigate(`/r/${slug}`);
      setPolling(true);
      setHistoryKey((k) => k + 1);
    } catch (err: unknown) {
      console.error('Error starting tests:', err);
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setError(
          (err.response.data as { message?: string })?.message ||
            'Rate limit exceeded. Please try again later.'
        );
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
        timeout: 10000,
      });
      const { run, results: runResults, rawData } = response.data;

      setResults(runResults);
      setCurrentRun(run);
      setCompletedRequests(Array.isArray(rawData) ? rawData.length : 0);

      if (run.status === 'completed' || run.status === 'failed') {
        setPolling(false);
        setLoading(false);
        setHistoryKey((k) => k + 1);
      }
    } catch (err) {
      console.error('Error polling results:', err);
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setPolling(false);
        setLoading(false);
        setError('Test run not found. The run may have expired.');
      }
    }
  }, [currentRun]);

  useEffect(() => {
    if (!polling) return;

    pollResults();
    const pollInterval = setInterval(pollResults, 2000);
    return () => clearInterval(pollInterval);
  }, [polling, pollResults]);

  useEffect(() => {
    if (results.length > 0 && !loading) {
      const hasSeenEducational = localStorage.getItem('delayt_seen_educational');
      if (!hasSeenEducational) {
        setShowEducational(true);
        localStorage.setItem('delayt_seen_educational', 'true');
      }
    }
  }, [results.length, loading]);

  const loadExample = () => {
    handleSubmit(
      [
        {
          url: 'https://httpbin.org/delay/0.1',
          method: 'GET',
          name: 'HTTPBin Example (Public API)',
        },
      ],
      50
    );
  };

  const startNewRun = () => {
    setResults([]);
    setCurrentRun(null);
    setShareUrl(null);
    setActiveSlug(null);
    setError(null);
    setEndpoints([]);
    onNavigate('/app');
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
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
  };

  const totalExpectedRequests = endpoints.length * requestCount;

  const progressPercentage = useMemo(() => {
    if (!currentRun || totalExpectedRequests === 0) return 0;
    return Math.min(100, Math.round((completedRequests / totalExpectedRequests) * 100));
  }, [currentRun, totalExpectedRequests, completedRequests]);

  const summaryLine = useMemo(() => {
    if (endpoints.length === 0) return '';
    let host = '';
    try {
      host = new URL(endpoints[0].url).host;
    } catch {
      host = endpoints[0].url;
    }
    const parts = endpoints.map((e) => {
      let path = '';
      try {
        path = new URL(e.url).pathname;
      } catch {
        path = e.url;
      }
      return `${e.method} ${path}`;
    });
    return `${host}, ${parts.join(' + ')}, ${requestCount} req each`;
  }, [endpoints, requestCount]);

  const runDuration = useMemo(() => {
    if (!currentRun?.startedAt || !currentRun?.completedAt) return null;
    const ms =
      new Date(currentRun.completedAt).getTime() - new Date(currentRun.startedAt).getTime();
    if (Number.isNaN(ms) || ms <= 0) return null;
    return `${(ms / 1000).toFixed(1)}s`;
  }, [currentRun]);

  const shareDisplay = shareUrl ? shareUrl.replace(/^https?:\/\//, '') : '';
  const hasResults = results.length > 0;

  const tabs: { id: ResultsTab; label: string }[] = [
    { id: 'results', label: 'Results' },
    { id: 'histogram', label: 'Histogram' },
    { id: 'scatter', label: 'Scatter' },
    { id: 'compare', label: 'Compare' },
  ];

  return (
    <ErrorBoundary>
      <div className="app">
        <TopNav
          variant="app"
          onNavigate={onNavigate}
          onNewRun={startNewRun}
          onGoHome={() => onNavigate('/')}
        />

        {showEducational && hasResults && (
          <EducationalModal results={results} onClose={() => setShowEducational(false)} />
        )}

        <div className={`layout ${sidebarOpen ? '' : 'layout-sidebar-collapsed'}`}>
          <RunHistory
            onOpenRun={(slug) => {
              onNavigate(`/r/${slug}`);
              loadSharedRun(slug);
            }}
            activeSlug={activeSlug}
            reloadKey={historyKey}
            collapsed={!sidebarOpen}
            onToggleCollapsed={toggleSidebar}
          />

          <main className="main">
            <section className="dashboard-header">
              <div className="dashboard-eyebrow">// composer</div>
              <h1 className="dashboard-title font-display">
                Fire real HTTP.
                <br />
                Read the <span style={{ color: 'var(--primary)' }}>truth</span>.
              </h1>
              <p className="dashboard-sub">
                Add endpoints, run sequential requests, get p50 / p95 / p99. Share with{' '}
                <code>/r/slug</code>.
              </p>
            </section>

            <section className="composer-panel">
              <div className="panel-label">
                // endpoint · <span>configure run</span>
              </div>
              <EndpointForm
                onSubmit={handleSubmit}
                disabled={loading}
                initialRequestCount={requestCount}
                onLoadExample={loadExample}
              />

              {error && <div className="app-error">{error}</div>}

              {loading && currentRun && (
                <ProgressIndicator
                  percentage={progressPercentage}
                  message={`Running tests on ${endpoints.length} endpoint${
                    endpoints.length > 1 ? 's' : ''
                  }…`}
                  status={currentRun.status === 'failed' ? 'failed' : 'running'}
                  showSteps
                  currentStep={completedRequests}
                  totalSteps={totalExpectedRequests}
                />
              )}
            </section>

            {hasResults && (
              <section className="results-panel">
                <div className="panel-label">
                  // receipt · <span>{activeSlug ? `run_${activeSlug}` : 'results'}</span>
                </div>
                <div className="results-tabbar">
                  <div className="results-tabs" role="tablist">
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        role="tab"
                        aria-selected={resultsTab === t.id}
                        className={`results-tab ${resultsTab === t.id ? 'active' : ''}`}
                        onClick={() => setResultsTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="results-status">
                    <span className="results-check">Done</span>
                    {completedRequests || results.reduce((s, r) => s + r.request_count, 0)}{' '}
                    requests completed
                    {runDuration ? `, ${runDuration}` : ''}
                  </div>
                </div>

                <div className="results-summary">
                  <span className="results-summary-text">{summaryLine}</span>
                  {shareUrl && (
                    <div className="share-pill">
                      <span className="share-pill-url">{shareDisplay}</span>
                      <button className="share-pill-btn" onClick={copyShareUrl}>
                        {copied ? 'Copied' : 'Copy link'}
                      </button>
                    </div>
                  )}
                </div>
                {clipboardError && (
                  <div className="app-error subtle">Copy failed: {clipboardError}</div>
                )}

                <div className="results-body">
                  {resultsTab === 'results' && (
                    <div className="results-grid">
                      <MetricCards results={results} />
                      <div className="results-detail">
                        <ResultsTable results={results} />
                        <PerformanceInsights results={results} />
                      </div>
                    </div>
                  )}

                  {resultsTab === 'histogram' && (
                    <LatencyChart
                      results={results}
                      runId={currentRun?.id}
                      view="histogram"
                      hideTabs
                    />
                  )}

                  {resultsTab === 'scatter' && (
                    <LatencyChart
                      results={results}
                      runId={currentRun?.id}
                      view="scatter"
                      hideTabs
                    />
                  )}

                  {resultsTab === 'compare' && <ComparisonMode currentResults={results} />}
                </div>
              </section>
            )}

            {hasResults && (
              <section className="extras">
                {shareUrl && (
                  <ShareCard results={results} runId={currentRun?.id || ''} shareUrl={shareUrl} />
                )}
                <CliExport endpoints={endpoints} requestCount={requestCount} />
              </section>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Dashboard;
