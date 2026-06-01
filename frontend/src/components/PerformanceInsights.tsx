import React from 'react';
import { AnalyticsResult, formatLatency } from '@delayt/shared';
import './PerformanceInsights.css';

interface PerformanceInsightsProps {
  results: AnalyticsResult[];
}

interface Insight {
  type: 'good' | 'warning' | 'critical' | 'tip';
  title: string;
  message: string;
  recommendation?: string;
}

const PerformanceInsights: React.FC<PerformanceInsightsProps> = ({ results }) => {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];

    if (results.length === 0) return insights;

    const avgP50 = results.reduce((sum, r) => sum + r.p50, 0) / results.length;
    const avgP95 = results.reduce((sum, r) => sum + r.p95, 0) / results.length;
    const avgP99 = results.reduce((sum, r) => sum + r.p99, 0) / results.length;
    const avgSuccessRate =
      results.reduce((sum, r) => sum + (r.success_rate ?? 100), 0) / results.length;
    const avgErrorRate =
      results.reduce((sum, r) => sum + (r.error_rate ?? 0), 0) / results.length;
    const allRequestsFailed = avgSuccessRate < 0.5;
    const mostlyFailed = avgSuccessRate < 50;

    // Auth / config first when almost every response was 4xx/5xx
    if (allRequestsFailed) {
      insights.push({
        type: 'critical',
        title: 'No successful responses',
        message: `0% of requests returned HTTP 2xx. Latency numbers below are for error responses (often 401/403), not your API at full access.`,
        recommendation:
          'Add your Bearer token under Authorization and any required headers (API keys, User-Agent, etc.) in the composer, then run again. See Docs → Auth & headers.',
      });
      return insights;
    }

    if (mostlyFailed) {
      insights.push({
        type: 'critical',
        title: 'Most requests failed',
        message: `Only ${avgSuccessRate.toFixed(1)}% succeeded. Percentiles may reflect error responses, not normal traffic.`,
        recommendation:
          'Confirm Authorization and Headers match what works in Postman or curl, then re-run.',
      });
    }

    // Good insights
    if (avgP95 < 100) {
      insights.push({
        type: 'good',
        title: 'Excellent p95 Performance',
        message: `Your p95 latency is ${formatLatency(avgP95)}, which is outstanding.`,
        recommendation: 'Maintain this performance level in future updates.',
      });
    }

    if (avgSuccessRate > 99.5) {
      insights.push({
        type: 'good',
        title: 'Exceptional Reliability',
        message: `Your API has a ${avgSuccessRate.toFixed(2)}% success rate.`,
        recommendation: 'Your users are experiencing excellent reliability.',
      });
    }

    // Warnings (skip latency advice when failures dominate)
    if (!mostlyFailed && avgP95 > 200 && avgP95 < 500) {
      insights.push({
        type: 'warning',
        title: 'p95 Latency Moderate',
        message: `Your p95 is ${formatLatency(avgP95)}. Users are experiencing noticeable delays.`,
        recommendation:
          'Consider profiling your slowest requests and optimizing database queries or external API calls.',
      });
    }

    if (!mostlyFailed && avgP99 - avgP95 > 1000) {
      insights.push({
        type: 'warning',
        title: 'High p99 Latency Spread',
        message: `Your p99 (${formatLatency(avgP99)}) is much higher than p95 (${formatLatency(avgP95)}).`,
        recommendation:
          'This suggests tail latencies. Check for occasional slowdowns like garbage collection or cache misses.',
      });
    }

    // Critical
    if (!mostlyFailed && avgP95 > 500) {
      insights.push({
        type: 'critical',
        title: 'Critical: p95 Latency Too High',
        message: `Your p95 is ${formatLatency(avgP95)}. Most users are experiencing long waits.`,
        recommendation:
          'This is a major user experience issue. Profile your hotspots, add caching, or optimize queries immediately.',
      });
    }

    if (!mostlyFailed && avgErrorRate > 0) {
      insights.push({
        type: 'critical',
        title: 'API Errors Detected',
        message: `${avgErrorRate.toFixed(1)}% of responses were HTTP errors (4xx/5xx or timeouts).`,
        recommendation:
          'Investigate error logs to identify failure patterns. Monitor error rates in production.',
      });
    }

    if (!mostlyFailed && avgSuccessRate < 95) {
      insights.push({
        type: 'critical',
        title: 'Low Success Rate',
        message: `Only ${avgSuccessRate.toFixed(1)}% of requests succeeded.`,
        recommendation:
          'Review failed status codes. If you expected 2xx, check auth and headers in the composer.',
      });
    }

    // Tips
    if (results.length > 1) {
      insights.push({
        type: 'tip',
        title: 'Compare Endpoints',
        message: 'You tested multiple endpoints. Look for performance differences.',
        recommendation: 'Slower endpoints might need different optimization strategies.',
      });
    }

    if (avgP50 < avgP95 * 0.3) {
      insights.push({
        type: 'tip',
        title: 'Watch Your P95',
        message: `Your median (p50: ${formatLatency(avgP50)}) is much faster than your p95 (${formatLatency(avgP95)}).`,
        recommendation:
          'Focus on preventing the slowest 5% of requests. Even small improvements at p95 dramatically improve user experience.',
      });
    }

    return insights;
  };

  const insights = generateInsights();
  const avgSuccessRate =
    results.length > 0
      ? results.reduce((sum, r) => sum + (r.success_rate ?? 100), 0) / results.length
      : 100;
  const allFailed = avgSuccessRate < 0.5;

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="performance-insights">
      <div className="insights-header">
        <h3>// insights</h3>
      </div>

      <div className="insights-list">
        {insights.map((insight, index) => (
          <div key={index} className={`insight-card insight-${insight.type}`}>
            <div className="insight-icon" aria-hidden="true">
              {insight.type === 'good' && 'OK'}
              {insight.type === 'warning' && '!'}
              {insight.type === 'critical' && '!!'}
              {insight.type === 'tip' && 'Tip'}
            </div>
            <div className="insight-content">
              <div className="insight-title">{insight.title}</div>
              <div className="insight-message">{insight.message}</div>
              {insight.recommendation && (
                <div className="insight-recommendation">
                  <strong>{insight.recommendation}</strong>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="insights-footer">
        <p>
          {allFailed ? (
            <>
              <strong>Key takeaway:</strong> Fix auth and headers first, then re-run. Latency percentiles
              only matter for successful (2xx) responses.
            </>
          ) : (
            <>
              <strong>Key takeaway:</strong> Focus on improving your p95 latency. That is where most users
              live. Even small improvements at p95 noticeably improve satisfaction.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default PerformanceInsights;
