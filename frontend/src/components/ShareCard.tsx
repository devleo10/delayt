import React, { useRef, useState } from 'react';
import { AnalyticsResult, formatLatency } from '@delayr/shared';
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

  const getStatusEmoji = () => {
    if (worstP95 < 100) return '🟢';
    if (worstP95 < 200) return '🟡';
    if (worstP95 < 500) return '🟠';
    return '🔴';
  };

  const downloadAsImage = async () => {
    try {
      // Dynamically import html2canvas
      const html2canvas = (await import('html2canvas')).default;

      if (cardRef.current) {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: '#111827',
          scale: 2,
          logging: false,
        });

        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `delayr-report-${runId}.png`;
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
    const text = `Just tested my API with @delayr_app ⚡

p50: ${formatLatency(results[0].p50)}
p95: ${formatLatency(worstP95)}
p99: ${formatLatency(Math.max(...results.map((r) => r.p99)))}

Stop measuring averages. Start measuring percentiles 📊

`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="share-card-container">
      <div className="share-card-header">
        <h3>📊 Share Your Results</h3>
        <p>Beautiful card for Twitter, Slack, and more</p>
      </div>

      <div className="share-card" ref={cardRef}>
        <div className="card-header">
          <div className="card-logo">⚡ Delayr</div>
          <div className="card-status">{getStatusEmoji()}</div>
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
          <div className="card-powered">Tested with Delayr ⚡</div>
        </div>
      </div>

      <div className="share-actions">
        <button className="share-button twitter" onClick={shareOnTwitter} aria-label="Share on Twitter">
          🐦 Share on Twitter
        </button>
        <button className="share-button download" onClick={downloadAsImage} aria-label="Download as PNG">
          {downloaded ? '✓ Downloaded' : '📥 Download PNG'}
        </button>
        <button
          className="share-button copy"
          onClick={() => {
            navigator.clipboard.writeText(shareUrl);
            alert('Link copied!');
          }}
          aria-label="Copy share link"
        >
          🔗 Copy Link
        </button>
      </div>
    </div>
  );
};

export default ShareCard;
