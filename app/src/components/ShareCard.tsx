'use client';
import React, { useRef, useState } from 'react';
import { AnalyticsResult, formatLatency } from '@delayt/shared';
import { captureNodeAsPng } from '@/utils/captureNode';

interface ShareCardProps {
  results: AnalyticsResult[];
  runId: string;
  shareUrl: string;
}

const ShareCard: React.FC<ShareCardProps> = ({ results, runId, shareUrl }) => {
  const [downloaded, setDownloaded] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const worstP95 = Math.max(...results.map((r) => r.p95));
  const avgSuccessRate =
    results.reduce((sum, r) => sum + (r.success_rate ?? 100), 0) / results.length;

  const getStatus = (): { label: string; tone: 'good' | 'fair' | 'slow' | 'critical' } => {
    if (avgSuccessRate < 50) return { label: 'Failed', tone: 'critical' };
    if (avgSuccessRate < 95) return { label: 'Errors', tone: 'critical' };
    if (worstP95 < 100) return { label: 'Fast', tone: 'good' };
    if (worstP95 < 200) return { label: 'OK', tone: 'fair' };
    if (worstP95 < 500) return { label: 'Slow', tone: 'slow' };
    return { label: 'Tail', tone: 'critical' };
  };

  const status = getStatus();
  const primaryName = results[0]?.name || results[0]?.endpoint || 'run';

  const downloadAsImage = async () => {
    if (!cardRef.current || downloading) return;

    setDownloadError(null);
    setDownloading(true);

    try {
      await captureNodeAsPng(cardRef.current, `delayt-report-${runId}.png`);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error('Failed to download image:', err);
      setDownloadError('Could not generate PNG. Try a screenshot, or copy the share link.');
    } finally {
      setDownloading(false);
    }
  };

  const shareOnTwitter = () => {
    const text = `Latency run: ${primaryName}
p50 ${formatLatency(results[0].p50)} · p95 ${formatLatency(worstP95)} · p99 ${formatLatency(Math.max(...results.map((r) => r.p99)))}

`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank');
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setDownloadError('Could not copy link. Select and copy manually.');
      setTimeout(() => setDownloadError(null), 4000);
    }
  };

  return (
    <div className="share-card-container">
      <div className="share-card-header">
        <h3>// share · export card</h3>
        <p>Receipt-style summary for Slack, X, or your team chat. Labels use rough defaults, not your SLO.</p>
      </div>

      <div className="share-card" ref={cardRef}>
        <div className="card-header">
          <div className="card-logo">Delayt</div>
          <div className={`card-status status-${status.tone}`}>{status.label}</div>
        </div>

        <div className="card-title">Latency run · {primaryName}</div>

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
          <div className="card-tagline">Sequential sample · not a load test</div>
          <div className="card-url">{shareUrl}</div>
          <div className="card-powered">delayt</div>
        </div>
      </div>

      <div className="share-actions">
        <button className="share-button twitter" onClick={shareOnTwitter} aria-label="Share on Twitter">
          Share on X
        </button>
        <button
          className="share-button download"
          onClick={downloadAsImage}
          disabled={downloading}
          aria-label="Download as PNG"
        >
          {downloading ? 'Generating…' : downloaded ? 'Downloaded' : 'Download PNG'}
        </button>
        <button
          className="share-button copy"
          onClick={copyShareLink}
          aria-label="Copy share link"
        >
          {linkCopied ? 'Copied' : 'Copy link'}
        </button>
      </div>

      {downloadError && <p className="share-download-error">{downloadError}</p>}
    </div>
  );
};

export default ShareCard;
