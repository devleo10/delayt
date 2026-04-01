import React, { useState, useEffect } from 'react';
import { AnalyticsResult, formatLatency } from '@delayr/shared';
import './EducationalModal.css';

interface EducationalModalProps {
  results: AnalyticsResult[];
  onClose: () => void;
}

const EducationalModal: React.FC<EducationalModalProps> = ({ results, onClose }) => {
  const [step, setStep] = useState(0);

  const firstResult = results[0];
  if (!firstResult) return null;

  const steps = [
    {
      title: '🎉 Your First Test Complete!',
      content: (
        <div className="edu-step">
          <p>Congratulations! Your API is now measured with real percentiles.</p>
          <div className="result-highlight">
            <div className="result-item">
              <div className="result-label">Endpoint:</div>
              <div className="result-value">{firstResult.name || firstResult.endpoint}</div>
            </div>
            <div className="result-item">
              <div className="result-label">Method:</div>
              <div className="result-value">{firstResult.method}</div>
            </div>
            <div className="result-item">
              <div className="result-label">Requests:</div>
              <div className="result-value">{firstResult.request_count}</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '📊 Understanding p50 (Median)',
      content: (
        <div className="edu-step">
          <div className="metric-explanation">
            <div className="metric-big-value" style={{ color: '#3b82f6' }}>
              {formatLatency(firstResult.p50)}
            </div>
            <p>
              <strong>p50</strong> means 50% of your requests are faster than this.
            </p>
            <div className="explanation-box">
              <p>📈 Think of it as your "median experience"</p>
              <p>If you have 100 requests:</p>
              <ul>
                <li>50 requests are faster than {formatLatency(firstResult.p50)}</li>
                <li>50 requests are slower than {formatLatency(firstResult.p50)}</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '⭐ Understanding p95 (THE IMPORTANT ONE)',
      content: (
        <div className="edu-step">
          <div className="metric-explanation highlighted">
            <div className="metric-big-value" style={{ color: '#fbbf24' }}>
              {formatLatency(firstResult.p95)}
            </div>
            <p>
              <strong>p95</strong> means 95% of your requests are faster than this.
            </p>
            <div className="explanation-box important">
              <p>🎯 THIS IS THE METRIC THAT MATTERS MOST</p>
              <p>If you have 100 requests:</p>
              <ul>
                <li>95 requests are faster than {formatLatency(firstResult.p95)}</li>
                <li>5 requests are slower (the "tail")</li>
              </ul>
              <p style={{ marginTop: '12px' }}>
                <strong>Why p95?</strong> Because those other 5% are your users' worst experience. Even small
                improvements here make huge differences in user satisfaction.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '🚨 Understanding p99 (Worst Case)',
      content: (
        <div className="edu-step">
          <div className="metric-explanation">
            <div className="metric-big-value" style={{ color: '#ef4444' }}>
              {formatLatency(firstResult.p99)}
            </div>
            <p>
              <strong>p99</strong> means 99% of your requests are faster than this.
            </p>
            <div className="explanation-box">
              <p>⚠️ Only 1% of requests are slower (your absolute worst case)</p>
              <p>If you have 1000 requests:</p>
              <ul>
                <li>990 requests are faster than {formatLatency(firstResult.p99)}</li>
                <li>10 requests are slower (rare, but they happen)</li>
              </ul>
              <p style={{ marginTop: '12px' }}>
                These are your crisis scenarios. They might be caused by GC pauses, slow queries, or external API
                timeouts.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '✅ What Now?',
      content: (
        <div className="edu-step">
          <p>You now understand your API's real performance!</p>
          <div className="next-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <strong>Compare:</strong> Test again after changes to see improvements
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <strong>Share:</strong> Use the shareable link to show results to your team
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <strong>Automate:</strong> Use the CLI to add latency gates in your CI/CD
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <strong>Optimize:</strong> Focus on improving p95. Everything else follows.
              </div>
            </div>
          </div>
          <p className="pro-tip">
            💡 <strong>Pro Tip:</strong> "Stop measuring averages, start measuring percentiles." Percentiles tell you
            what users actually experience.
          </p>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && step < steps.length - 1) setStep(step + 1);
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [step, steps.length, onClose]);

  return (
    <div className="educational-modal-overlay" onClick={onClose}>
      <div className="educational-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close educational modal">
          ✕
        </button>

        <div className="edu-header">
          <h2>{steps[step].title}</h2>
        </div>

        <div className="edu-content">{steps[step].content}</div>

        <div className="edu-footer">
          <div className="step-indicators">
            {steps.map((_, i) => (
              <button
                key={i}
                className={`step-dot ${i === step ? 'active' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="edu-buttons">
            <button
              className="nav-button prev"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              aria-label="Previous step"
            >
              ← Back
            </button>

            {step === steps.length - 1 ? (
              <button className="nav-button next primary" onClick={onClose}>
                Let's Go! →
              </button>
            ) : (
              <button
                className="nav-button next"
                onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                aria-label="Next step"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationalModal;
