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
      <table className="results-table">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Method</th>
            <th>p50</th>
            <th>p95</th>
            <th>p99</th>
            {results.some(r => r.min !== undefined) && <th>Min/Max</th>}
            <th>Success</th>
            <th>Requests</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isSlow = result.p95 > avgP95;
            const successRate = result.success_rate ?? 100;
            
            return (
              <tr key={`${result.endpoint}-${result.method}-${index}`} className={isSlow ? 'slow-endpoint' : ''}>
                <td className="endpoint-cell">
                  {result.name && <span className="endpoint-name">{result.name}</span>}
                  {result.endpoint}
                </td>
                <td>
                  <span className={`method-badge method-${result.method.toLowerCase()}`}>
                    {result.method}
                  </span>
                </td>
                <td className={`latency-cell ${getLatencyClass(result.p50)}`}>
                  {formatLatency(result.p50)}
                </td>
                <td className={`latency-cell p95-cell ${getLatencyClass(result.p95)}`}>
                  {formatLatency(result.p95)}
                </td>
                <td className={`latency-cell ${getLatencyClass(result.p99)}`}>
                  {formatLatency(result.p99)}
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
            <p className="slow-note">
              Rows highlighted have p95 above average
            </p>
          )}
        </div>
        <div>
          <button className="copy-markdown-button" onClick={copyAsMarkdown}>
            {copied ? 'Copied!' : 'Copy as Markdown'}
          </button>
          {copyError && <div className="copy-error" role="status">Copy failed: {copyError}</div>}
        </div>
      </div>
    </div>
  );
};

export default ResultsTable;


