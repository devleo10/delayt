'use client';
import React, { useMemo } from 'react';
import { AnalyticsResult, formatLatency } from '@delayt/shared';

interface PerformanceInsightsProps {
  results: AnalyticsResult[];
}

type Severity = 'ok' | 'warn' | 'err';

interface Signal {
  severity: Severity;
  code: string;
  detail: string;
  note: string;
  rank: number;
}

function buildSignals(results: AnalyticsResult[]): Signal[] {
  if (results.length === 0) return [];

  const avgP50 = results.reduce((sum, r) => sum + r.p50, 0) / results.length;
  const avgP95 = results.reduce((sum, r) => sum + r.p95, 0) / results.length;
  const avgP99 = results.reduce((sum, r) => sum + r.p99, 0) / results.length;
  const avgSuccessRate =
    results.reduce((sum, r) => sum + (r.success_rate ?? 100), 0) / results.length;
  const avgErrorRate =
    results.reduce((sum, r) => sum + (r.error_rate ?? 0), 0) / results.length;

  const signals: Signal[] = [];

  if (avgSuccessRate < 0.5) {
    return [
      {
        severity: 'err',
        code: '2xx',
        detail: '0%',
        note: 'No successful responses — fix Authorization / headers, re-run',
        rank: 0,
      },
    ];
  }

  if (avgSuccessRate < 50) {
    signals.push({
      severity: 'err',
      code: '2xx',
      detail: `${avgSuccessRate.toFixed(0)}%`,
      note: 'Mostly failing — percentiles reflect error responses',
      rank: 0,
    });
  } else if (avgSuccessRate < 95) {
    signals.push({
      severity: 'err',
      code: '2xx',
      detail: `${avgSuccessRate.toFixed(1)}%`,
      note: 'Low success rate — check auth, headers, status codes',
      rank: 1,
    });
  } else if (avgSuccessRate < 99.5) {
    signals.push({
      severity: 'warn',
      code: '2xx',
      detail: `${avgSuccessRate.toFixed(1)}%`,
      note: 'Some non-2xx responses in this sample',
      rank: 2,
    });
  }

  if (avgErrorRate > 0 && avgSuccessRate >= 50) {
    signals.push({
      severity: avgErrorRate > 5 ? 'err' : 'warn',
      code: 'err',
      detail: `${avgErrorRate.toFixed(1)}%`,
      note: '4xx / 5xx / timeout share of responses',
      rank: 1,
    });
  }

  const mostlyFailed = avgSuccessRate < 50;

  if (!mostlyFailed) {
    if (avgP95 > 500) {
      signals.push({
        severity: 'err',
        code: 'p95',
        detail: formatLatency(avgP95),
        note: 'Over 500ms — tail is hurting UX',
        rank: 0,
      });
    } else if (avgP95 > 200) {
      signals.push({
        severity: 'warn',
        code: 'p95',
        detail: formatLatency(avgP95),
        note: 'Over 200ms — track before deploy',
        rank: 2,
      });
    }

    const spread = avgP50 > 0 ? avgP95 / avgP50 : 1;
    if (spread >= 3 && avgP95 > 100) {
      signals.push({
        severity: spread >= 5 ? 'warn' : 'ok',
        code: 'spread',
        detail: `${formatLatency(avgP50)} → ${formatLatency(avgP95)}`,
        note: `${spread.toFixed(1)}× gap — slow tail, not slow median`,
        rank: 3,
      });
    }

    if (avgP99 - avgP95 > 400) {
      signals.push({
        severity: 'warn',
        code: 'p99',
        detail: formatLatency(avgP99),
        note: `+${formatLatency(avgP99 - avgP95)} above p95 — rare outliers`,
        rank: 3,
      });
    }
  }

  if (results.length > 1 && !mostlyFailed) {
    const slowest = results.reduce((a, b) => (b.p95 > a.p95 ? b : a));
    signals.push({
      severity: 'ok',
      code: 'slowest',
      detail: formatLatency(slowest.p95),
      note: `${slowest.name || slowest.endpoint} — highest p95 this run`,
      rank: 4,
    });
  }

  if (signals.length === 0) {
    signals.push({
      severity: 'ok',
      code: 'clear',
      detail: formatLatency(avgP95),
      note: 'p95 under 200ms, no flags',
      rank: 5,
    });
  }

  const severityOrder: Record<Severity, number> = { err: 0, warn: 1, ok: 2 };

  return signals
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.rank - b.rank)
    .slice(0, 4);
}

const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({ results }) => {
  const summary = useMemo(() => {
    if (results.length === 0) return null;

    const avgP50 = results.reduce((sum, r) => sum + r.p50, 0) / results.length;
    const avgP95 = results.reduce((sum, r) => sum + r.p95, 0) / results.length;
    const avgP99 = results.reduce((sum, r) => sum + r.p99, 0) / results.length;
    const avgOk =
      results.reduce((sum, r) => sum + (r.success_rate ?? 100), 0) / results.length;

    return { avgP50, avgP95, avgP99, avgOk };
  }, [results]);

  const signals = useMemo(() => buildSignals(results), [results]);

  if (!summary || signals.length === 0) return null;

  return (
    <div className="performance-insights">
      <div className="insights-header">
        <h3>// insights</h3>
      </div>

      <div className="insights-summary">
        <div className="insights-stat">
          <span className="insights-stat-key">p50</span>
          <span className="insights-stat-val">{formatLatency(summary.avgP50)}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-key">p95</span>
          <span className="insights-stat-val tone-warn">{formatLatency(summary.avgP95)}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-key">p99</span>
          <span className="insights-stat-val tone-critical">{formatLatency(summary.avgP99)}</span>
        </div>
        <div className="insights-stat">
          <span className="insights-stat-key">2xx</span>
          <span className="insights-stat-val tone-ok">{summary.avgOk.toFixed(0)}%</span>
        </div>
      </div>

      <table className="insights-signals">
        <thead>
          <tr>
            <th scope="col">sig</th>
            <th scope="col">code</th>
            <th scope="col">value</th>
            <th scope="col">note</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((signal, index) => (
            <tr key={`${signal.code}-${index}`} className={`sig-${signal.severity}`}>
              <td className="sig-tag">{signal.severity}</td>
              <td className="sig-code">{signal.code}</td>
              <td className="sig-detail">{signal.detail}</td>
              <td className="sig-note">{signal.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PerformanceInsights;
