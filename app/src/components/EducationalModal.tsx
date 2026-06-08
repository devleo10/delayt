'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { AnalyticsResult, formatLatency } from '@delayt/shared';
import { CLI_RECOMMENDED_REQUEST_COUNT } from '@/lib/limits';

interface EducationalModalProps {
  results: AnalyticsResult[];
  onClose: () => void;
}

function barBlocks(ms: number, maxMs: number, maxBlocks = 18): string {
  return '▮'.repeat(Math.max(1, Math.round((ms / maxMs) * maxBlocks)));
}

function truncateMiddle(text: string, max = 52): string {
  if (text.length <= max) return text;
  const head = Math.ceil((max - 1) / 2);
  const tail = Math.floor((max - 1) / 2);
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

const EducationalModal: React.FC<EducationalModalProps> = ({ results, onClose }) => {
  const [step, setStep] = useState(0);

  const firstResult = results[0];
  const endpointLabel = firstResult?.name || firstResult?.endpoint || '';
  const maxMs = firstResult
    ? Math.max(firstResult.p50, firstResult.p95, firstResult.p99, 1)
    : 1;

  const steps = useMemo(() => {
    if (!firstResult) return [];

    return [
      {
        code: '01',
        label: 'capture',
        title: 'Run logged',
        content: (
          <div className="edu-step">
            <div className="edu-run-meta">
              <span className="edu-method">{firstResult.method}</span>
              <span className="edu-run-url" title={endpointLabel}>
                {truncateMiddle(endpointLabel)}
              </span>
            </div>
            <div className="edu-run-stats">
              <span>{firstResult.request_count} req</span>
              <span>{firstResult.success_rate?.toFixed(0) ?? '100'}% ok</span>
            </div>

            <div className="edu-metric-grid">
              {[
                { key: 'p50', ms: firstResult.p50, tone: 'primary', note: 'median' },
                { key: 'p95', ms: firstResult.p95, tone: 'warn', note: '1 in 20' },
                { key: 'p99', ms: firstResult.p99, tone: 'critical', note: 'worst 1%' },
              ].map((m) => (
                <div key={m.key} className={`edu-metric tone-${m.tone}`}>
                  <div className="edu-metric-head">
                    <span>{m.key}</span>
                    <strong>{formatLatency(m.ms)}</strong>
                  </div>
                  <div className="edu-metric-bars">{barBlocks(m.ms, maxMs)}</div>
                  <span className="edu-metric-note">{m.note}</span>
                </div>
              ))}
            </div>

            <p className="edu-lede">
              Sequential smoke test complete. These numbers are percentiles, not averages.
              The dashboard below has the full breakdown.
            </p>
          </div>
        ),
      },
      {
        code: '02',
        label: 'p95',
        title: 'Watch p95, not avg',
        content: (
          <div className="edu-step">
            <div className="edu-metric-hero tone-warn">
              <span className="edu-metric-hero-label">p95</span>
              <span className="edu-metric-hero-value">{formatLatency(firstResult.p95)}</span>
              <div className="edu-metric-bars">{barBlocks(firstResult.p95, maxMs, 28)}</div>
            </div>
            <p className="edu-copy">
              <strong>95% of requests finished faster than this.</strong> The other 5% is where tail
              latency shows up: timeouts, cold starts, queue spikes.
            </p>
            <div className="edu-aside">
              <span className="edu-aside-tag">// why not average?</span>
              <p>
                One 8s outlier hidden in 14 fast requests still looks fine on average. p95 surfaces
                the tail you ship to production.
              </p>
            </div>
          </div>
        ),
      },
      {
        code: '03',
        label: 'spread',
        title: 'p50 vs p99',
        content: (
          <div className="edu-step">
            <div className="edu-spread">
              <div className="edu-spread-row">
                <span className="edu-spread-key">p50</span>
                <span className="edu-spread-val tone-primary">
                  {formatLatency(firstResult.p50)}
                </span>
                <span className="edu-spread-desc">typical request</span>
              </div>
              <div className="edu-spread-row highlight">
                <span className="edu-spread-key">p95</span>
                <span className="edu-spread-val tone-warn">
                  {formatLatency(firstResult.p95)}
                </span>
                <span className="edu-spread-desc">SLO / regression line</span>
              </div>
              <div className="edu-spread-row">
                <span className="edu-spread-key">p99</span>
                <span className="edu-spread-val tone-critical">
                  {formatLatency(firstResult.p99)}
                </span>
                <span className="edu-spread-desc">rare bad path</span>
              </div>
            </div>
            <p className="edu-copy">
              Wide gap between p50 and p99 usually means inconsistent backends: GC, N+1 queries,
              or upstream variance. Tighten p99 before chasing median.
            </p>
          </div>
        ),
      },
      {
        code: '04',
        label: 'next',
        title: 'Keep measuring',
        content: (
          <div className="edu-step">
            <ul className="edu-checklist">
              <li>
                <span className="edu-check-key">share</span>
                <span>Copy the `/r/slug` link. Results stay readable without an account.</span>
              </li>
              <li>
                <span className="edu-check-key">compare</span>
                <span>Re-run after a deploy. Delta beats a single snapshot.</span>
              </li>
              <li>
                <span className="edu-check-key">cli</span>
                <span>
                  Web caps at {firstResult.request_count} req. For {CLI_RECOMMENDED_REQUEST_COUNT}+,
                  use <code>npx @delayt/cli run</code> in CI.
                </span>
              </li>
            </ul>
            <p className="edu-footnote">
              This walkthrough shows once. Dismiss with Esc anytime.
            </p>
          </div>
        ),
      },
    ];
  }, [firstResult, endpointLabel, maxMs]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && step < steps.length - 1) setStep(step + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [step, steps.length, onClose]);

  if (!firstResult) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="educational-modal-overlay" onClick={onClose}>
      <div className="educational-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="edu-chrome">
          <span className="edu-chrome-tag">delayt</span>
          <span className="edu-chrome-sep">·</span>
          <span className="edu-chrome-step">
            {current.code} {current.label}
          </span>
          <button className="edu-close" onClick={onClose} aria-label="Close">
            esc
          </button>
        </div>

        <div className="edu-header">
          <h2 className="font-display">{current.title}</h2>
        </div>

        <div className="edu-content">{current.content}</div>

        <div className="edu-footer">
          <div className="edu-progress" aria-hidden="true">
            {steps.map((s, i) => (
              <button
                key={s.code}
                type="button"
                className={`edu-progress-mark ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${s.code}: ${s.label}`}
              />
            ))}
          </div>

          <div className="edu-nav">
            <button
              type="button"
              className="edu-nav-btn"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              ← back
            </button>
            <span className="edu-nav-count">
              {current.code} / {steps[steps.length - 1].code}
            </span>
            {isLast ? (
              <button type="button" className="edu-nav-btn edu-nav-btn--primary" onClick={onClose}>
                view results
              </button>
            ) : (
              <button
                type="button"
                className="edu-nav-btn edu-nav-btn--primary"
                onClick={() => setStep(step + 1)}
              >
                next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationalModal;
