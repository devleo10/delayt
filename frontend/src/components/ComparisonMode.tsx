import React, { useState } from 'react';
import { AnalyticsResult, formatLatency } from '@delayr/shared';
import './ComparisonMode.css';

interface ComparisonModeProps {
  currentResults: AnalyticsResult[];
}

interface PreviousResults {
  results: AnalyticsResult[];
  url: string;
  timestamp: string;
}

const ComparisonMode: React.FC<ComparisonModeProps> = ({ currentResults }) => {
  const [showComparison, setShowComparison] = useState(false);
  const [previousUrl, setPreviousUrl] = useState('');
  const [previousResults, setPreviousResults] = useState<PreviousResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreviousResults = async () => {
    if (!previousUrl.trim()) {
      setError('Please enter a URL or share link');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Extract slug from share URL if needed
      let slug = previousUrl;
      const match = previousUrl.match(/\/r\/([a-z0-9]+)/);
      if (match) {
        slug = match[1];
      }

      const response = await fetch(`${window.location.origin}/r/${slug}`);
      if (!response.ok) throw new Error('Failed to load results');

      const data = await response.json();
      setPreviousResults({
        results: data.results,
        url: previousUrl,
        timestamp: new Date().toLocaleString(),
      });
      setShowComparison(true);
    } catch (err) {
      setError('Could not load results. Check the URL or share link.');
    } finally {
      setLoading(false);
    }
  };

  const calculateImprovement = (oldVal: number, newVal: number): { percent: string; improved: boolean } => {
    if (oldVal === 0) return { percent: '—', improved: newVal < oldVal };
    const percent = ((oldVal - newVal) / oldVal) * 100;
    return { percent: percent.toFixed(1), improved: percent > 0 };
  };

  const compareEndpoint = (prevResult: AnalyticsResult, currResult: AnalyticsResult) => {
    const p50Improvement = calculateImprovement(prevResult.p50, currResult.p50);
    const p95Improvement = calculateImprovement(prevResult.p95, currResult.p95);
    const p99Improvement = calculateImprovement(prevResult.p99, currResult.p99);

    return { p50Improvement, p95Improvement, p99Improvement };
  };

  return (
    <div className="comparison-mode">
      <div className="comparison-header">
        <h3>📊 Compare Results (Before/After Optimization)</h3>
        <p>Load a previous test to see your improvements</p>
      </div>

      {!showComparison && !previousResults && (
        <div className="comparison-input">
          <input
            type="text"
            placeholder="Paste previous share link (e.g., /r/abc123 or full URL)"
            value={previousUrl}
            onChange={(e) => setPreviousUrl(e.target.value)}
            disabled={loading}
            className="comparison-input-field"
          />
          <button onClick={loadPreviousResults} disabled={loading} className="comparison-button">
            {loading ? 'Loading...' : 'Load Previous'}
          </button>
          {error && <div className="comparison-error">{error}</div>}
        </div>
      )}

      {showComparison && previousResults && (
        <div className="comparison-results">
          <div className="comparison-timeline">
            <div className="timeline-item">
              <div className="timeline-label">Before</div>
              <div className="timeline-date">{previousResults.timestamp}</div>
            </div>
            <div className="timeline-arrow">→</div>
            <div className="timeline-item current">
              <div className="timeline-label">Now</div>
              <div className="timeline-date">{new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="comparison-table">
            <div className="comparison-row header">
              <div className="col endpoint">Endpoint</div>
              <div className="col metric">Metric</div>
              <div className="col value before">Before</div>
              <div className="col value after">After</div>
              <div className="col improvement">Improvement</div>
            </div>

            {previousResults.results.map((prevResult, idx) => {
              const currResult = currentResults[idx];
              if (!currResult) return null;

              const { p50Improvement, p95Improvement, p99Improvement } = compareEndpoint(prevResult, currResult);

              return (
                <React.Fragment key={idx}>
                  <div className="comparison-row main">
                    <div className="col endpoint">{prevResult.name || prevResult.endpoint}</div>
                    <div className="col metric">p50</div>
                    <div className="col value before">{formatLatency(prevResult.p50)}</div>
                    <div className="col value after">{formatLatency(currResult.p50)}</div>
                    <div className={`col improvement ${p50Improvement.improved ? 'improved' : 'regressed'}`}>
                      {p50Improvement.improved ? '✅' : '⚠️'} {p50Improvement.percent}%
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="col endpoint" />
                    <div className="col metric">p95</div>
                    <div className="col value before">{formatLatency(prevResult.p95)}</div>
                    <div className="col value after">{formatLatency(currResult.p95)}</div>
                    <div className={`col improvement ${p95Improvement.improved ? 'improved' : 'regressed'}`}>
                      {p95Improvement.improved ? '✅' : '⚠️'} {p95Improvement.percent}%
                    </div>
                  </div>
                  <div className="comparison-row">
                    <div className="col endpoint" />
                    <div className="col metric">p99</div>
                    <div className="col value before">{formatLatency(prevResult.p99)}</div>
                    <div className="col value after">{formatLatency(currResult.p99)}</div>
                    <div className={`col improvement ${p99Improvement.improved ? 'improved' : 'regressed'}`}>
                      {p99Improvement.improved ? '✅' : '⚠️'} {p99Improvement.percent}%
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <button
            onClick={() => setShowComparison(false)}
            className="comparison-close-button"
          >
            Close Comparison
          </button>
        </div>
      )}
    </div>
  );
};

export default ComparisonMode;
