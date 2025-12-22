import React from 'react';
import './ResultsTable.css';

interface AnalyticsResult {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  avg_payload_size: number;
  request_count: number;
}

interface ResultsTableProps {
  results: AnalyticsResult[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  // Calculate average p95 across all endpoints for highlighting
  const avgP95 =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.p95, 0) / results.length
      : 0;

  const formatLatency = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(3)}ms`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
  };

  return (
    <div className="results-table-container">
      <table className="results-table">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Method</th>
            <th>p50 (ms)</th>
            <th>p95 (ms)</th>
            <th>p99 (ms)</th>
            <th>Avg Payload Size</th>
            <th>Requests</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => {
            const isSlow = result.p95 > avgP95;
            return (
              <tr key={`${result.endpoint}-${result.method}-${index}`} className={isSlow ? 'slow-endpoint' : ''}>
                <td className="endpoint-cell">{result.endpoint}</td>
                <td>
                  <span className={`method-badge method-${result.method.toLowerCase()}`}>
                    {result.method}
                  </span>
                </td>
                <td className="latency-cell">{formatLatency(result.p50)}</td>
                <td className="latency-cell p95-cell">{formatLatency(result.p95)}</td>
                <td className="latency-cell">{formatLatency(result.p99)}</td>
                <td>{formatBytes(result.avg_payload_size)}</td>
                <td>{result.request_count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {avgP95 > 0 && (
        <div className="table-footer">
          <p>
            Average p95 latency: <strong>{formatLatency(avgP95)}</strong>
          </p>
          <p className="slow-note">
            Rows highlighted in red have p95 latency above the average
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;


