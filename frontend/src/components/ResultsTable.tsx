import { useState } from 'react';
import './ResultsTable.css';
import { AnalyticsResult, formatLatency } from '../../../packages/shared/src';

interface ResultsTableProps {
  results: AnalyticsResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Calculate average p95 across all endpoints for highlighting
  const avgP95 =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.p95, 0) / results.length
      : 0;

  // Use shared formatLatency from packages/shared for consistent formatting

  // `formatBytes` removed because it was unused; keep `formatLatency` for display.

  const getLatencyClass = (ms: number): string => {
    if (ms < 100) return 'fast';
    if (ms < 500) return 'medium';
    return 'slow';
  };

  const getSuccessClass = (rate: number): string => {
    if (rate >= 99) return 'success';
    if (rate >= 95) return 'warning';
    return 'danger';
  };

  const copyAsMarkdown = async () => {
    setCopyError(null);
    const header = '| Endpoint | Method | p50 | p95 | p99 | Success Rate | Requests |';
    const separator = '|----------|--------|-----|-----|-----|--------------|----------|';
    const rows = results.map(r =>
      `| ${r.name || r.endpoint} | ${r.method} | ${formatLatency(r.p50)} | ${formatLatency(r.p95)} | ${formatLatency(r.p99)} | ${(r.success_rate ?? 100).toFixed(1)}% | ${r.request_count} |`
    );

    const markdown = [header, separator, ...rows].join('\n');
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError((err as Error)?.message || 'Failed to copy to clipboard');
      setCopied(false);
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  return (
    <div className="results-table-container">
      <table className="results-table" role="table" aria-label="API latency test results">
        <caption className="sr-only">
          Performance metrics for {results.length} API endpoints showing latency percentiles and success rates
        </caption>
        <thead>
          <tr>
            <th scope="col">Endpoint</th>
            <th scope="col">Method</th>
            <th scope="col">p50 (median)</th>
            <th scope="col">p95</th>
            <th scope="col">p99</th>
            {results.some(r => r.min !== undefined) && <th scope="col">Min/Max</th>}
            <th scope="col">Success Rate</th>
            <th scope="col">Total Requests</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isSlow = result.p95 > avgP95;
            const successRate = result.success_rate ?? 100;
            
            return (
              <tr 
                key={`${result.endpoint}-${result.method}-${index}`} 
                className={isSlow ? 'slow-endpoint' : ''}
                aria-describedby={isSlow ? 'slow-note' : undefined}
              >
                <td className="endpoint-cell" role="gridcell">
                  {result.name && (
                    <span className="endpoint-name" aria-label="Endpoint name">
                      {result.name}
                    </span>
                  )}
                  <span className="endpoint-url" aria-label="Endpoint URL">
                    {result.endpoint}
                  </span>
                </td>
                <td role="gridcell">
                  <span 
                    className={`method-badge method-${result.method.toLowerCase()}`}
                    aria-label={`HTTP ${result.method} method`}
                  >
                    {result.method}
                  </span>
                </td>
                <td className={`latency-cell ${getLatencyClass(result.p50)}`} role="gridcell">
                  <span aria-label={`p50 latency: ${formatLatency(result.p50)}`}>
                    {formatLatency(result.p50)}
                  </span>
                </td>
                <td className={`latency-cell p95-cell ${getLatencyClass(result.p95)}`} role="gridcell">
                  <span aria-label={`p95 latency: ${formatLatency(result.p95)}`}>
                    {formatLatency(result.p95)}
                  </span>
                </td>
                <td className={`latency-cell ${getLatencyClass(result.p99)}`} role="gridcell">
                  <span aria-label={`p99 latency: ${formatLatency(result.p99)}`}>
                    {formatLatency(result.p99)}
                  </span>
                </td>
                {results.some(r => r.min !== undefined) && (
                  <td className="stats-cell">
                    {result.min !== undefined && result.max !== undefined
                      ? `${formatLatency(result.min)} / ${formatLatency(result.max)}`
                      : '-'
                    }
                  </td>
                )}
                <td>
                  <span className={`success-badge ${getSuccessClass(successRate)}`}>
                    {successRate.toFixed(1)}%
                  </span>
                </td>
                <td>{result.request_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="table-footer">
        <div>
          <p>
            Average p95: <strong>{formatLatency(avgP95)}</strong>
          </p>
          {results.some(r => r.p95 > avgP95) && (
            <p className="slow-note" id="slow-note">
              Rows highlighted have p95 above average
            </p>
          )}
        </div>
        <div>
          <button 
            className="copy-markdown-button" 
            onClick={copyAsMarkdown}
            aria-label="Copy results table as markdown to clipboard"
            aria-describedby="copy-status"
          >
            {copied ? 'Copied!' : 'Copy as Markdown'}
          </button>
          <div id="copy-status" aria-live="polite">
            {copyError && (
              <div className="copy-error" role="alert">
                Copy failed: {copyError}
              </div>
            )}
            {copied && (
              <span className="sr-only">Table copied to clipboard successfully</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;


