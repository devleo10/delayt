import React, { useRef, useState } from 'react';
import { AnalyticsResult, formatLatency } from '@delayt/shared';
import './ShareCard.css';

interface ShareCardProps {
  results: AnalyticsResult[];
  runId: string;
  shareUrl: string;
}

const ShareCard: React.FC<ShareCardProps> = ({ results, runId, shareUrl }) => {
  const [downloaded, setDownloaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const worstP95 = Math.max(...results.map((r) => r.p95));
  const avgSuccessRate =
    results.reduce((sum, r) => sum + (r.success_rate ?? 100), 0) / results.length;

  const getStatus = (): { label: string; tone: 'good' | 'fair' | 'slow' | 'critical' } => {
    if (avgSuccessRate < 0.5) return { label: 'Failed', tone: 'critical' };
    if (avgSuccessRate < 95) return { label: 'Errors', tone: 'critical' };
    if (worstP95 < 100) return { label: 'Good', tone: 'good' };
    if (worstP95 < 200) return { label: 'Fair', tone: 'fair' };
    if (worstP95 < 500) return { label: 'Slow', tone: 'slow' };
    return { label: 'Critical', tone: 'critical' };
  };

  const status = getStatus();

  const downloadAsImage = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;

      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#111827',
          scale: 2,
          logging: false,
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `delayt-report-${runId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      }
    } catch (err) {
      console.error('Failed to download image:', err);
      alert('Install html2canvas or try taking a screenshot instead');
    }
  };

  const shareOnTwitter = () => {
    const text = `Just tested my API with Delayt.

p50: ${formatLatency(results[0].p50)}
p95: ${formatLatency(worstP95)}
p99: ${formatLatency(Math.max(...results.map((r) => r.p99)))}

Stop measuring averages. Start measuring percentiles.

`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="share-card-container">
      <div className="share-card-header">
        <h3>// share · export card</h3>
        <p>Receipt-style report for Slack, X, or your team chat.</p>
      </div>

      <div className="share-card" ref={cardRef}>
        <div className="card-header">
          <div className="card-logo">Delayt</div>
          <div className={`card-status status-${status.tone}`}>{status.label}</div>
        </div>

        <div className="card-title">API Performance Report</div>

        <div className="card-metrics">
          {results.slice(0, 3).map((result) => (
            <div key={result.endpoint} className="metric-item">
              <div className="metric-endpoint">{result.name || result.endpoint}</div>
              <div className="metric-values">
                <div className="value-group">
                  <div className="value-label">p50</div>
                  <div className="value">{formatLatency(result.p50)}</div>
                </div>
                <div className="value-group">
                  <div className="value-label">p95</div>
                  <div className="value highlight">{formatLatency(result.p95)}</div>
                </div>
                <div className="value-group">
                  <div className="value-label">p99</div>
                  <div className="value">{formatLatency(result.p99)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card-stats">
          <div className="stat">
            <div className="stat-value">{avgSuccessRate.toFixed(1)}%</div>
            <div className="stat-label">Success Rate</div>
          </div>
          <div className="stat">
            <div className="stat-value">{results.length}</div>
            <div className="stat-label">Endpoints</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {results.reduce((sum, r) => sum + r.request_count, 0)}
            </div>
            <div className="stat-label">Requests</div>
          </div>
        </div>

        <div className="card-footer">
          <div className="card-tagline">Stop measuring averages. Start measuring percentiles.</div>
          <div className="card-url">{shareUrl}</div>
          <div className="card-powered">Tested with Delayt</div>
        </div>
      </div>

      <div className="share-actions">
        <button className="share-button twitter" onClick={shareOnTwitter} aria-label="Share on Twitter">
          Share on X
        </button>
        <button className="share-button download" onClick={downloadAsImage} aria-label="Download as PNG">
          {downloaded ? 'Downloaded' : 'Download PNG'}
        </button>
        <button
          className="share-button copy"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            alert('Link copied!');
          }}
          aria-label="Copy share link"
        >
          Copy link
        </button>
      </div>
    </div>
  );
};

export default ShareCard;
