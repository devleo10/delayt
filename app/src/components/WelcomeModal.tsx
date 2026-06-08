'use client';
import React, { useEffect, useState } from 'react';

interface WelcomeModalProps {
  onClose: () => void;
  onLoadExample: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onLoadExample }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Why percentiles matter',
      content: (
        <div className="welcome-step">
          <h3>Averages hide slow requests</h3>
          <div className="example-scenario">
            <div className="scenario">
              <div className="label">API A - Average:</div>
              <div className="value">50ms</div>
              <div className="label">API B - Average:</div>
              <div className="value">60ms</div>
              <p className="note">Average alone suggests API A is faster</p>
            </div>
            <div className="divider">BUT</div>
            <div className="scenario truth">
              <div className="label">API A - p95:</div>
              <div className="value danger">100ms</div>
              <div className="label">API B - p95:</div>
              <div className="value">500ms</div>
              <p className="note">API B has a much slower tail on p95</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Reading p50 / p95 / p99',
      content: (
        <div className="welcome-step">
          <div className="metric-explainer">
            <div className="metric">
              <div className="metric-name">p50</div>
              <div className="metric-desc">50% of requests finished faster than this</div>
            </div>
            <div className="metric">
              <div className="metric-name p95">p95</div>
              <div className="metric-desc">95% of requests finished faster than this</div>
            </div>
            <div className="metric">
              <div className="metric-name">p99</div>
              <div className="metric-desc">99% of requests finished faster than this</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'CLI or web UI',
      content: (
        <div className="welcome-step">
          <p>CLI for longer runs and CI:</p>
          <div className="code-block">
            npx @delayt/cli run -u https://api.example.com/health -n 50
          </div>
          <p>Or use this UI to:</p>
          <ul className="feature-list">
            <li>Test multiple endpoints</li>
            <li>Add custom headers and auth</li>
            <li>Send POST/PUT request bodies</li>
            <li>Share results with teammates</li>
            <li>Export commands for CI/CD</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Ready to test?',
      content: (
        <div className="welcome-step">
          <p>Start with a public example:</p>
          <button className="example-cta" onClick={onLoadExample}>
            Load example
          </button>
          <p className="small-text">
            Uses httpbin.org so you can see real percentile output.
          </p>
          <p className="skip-text">
            Then point it at your own API and set your own --assert-* thresholds.
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
    <div className="welcome-modal-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose} aria-label="Close welcome modal">
          ✕
        </button>

        <div className="welcome-header">
          <h2>{steps[step].title}</h2>
        </div>

        <div className="welcome-content">{steps[step].content}</div>

        <div className="welcome-footer">
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

          <div className="welcome-buttons">
            <button
              className="nav-button prev"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              aria-label="Previous step"
            >
              Back
            </button>

            {step === steps.length - 1 ? (
              <button className="nav-button next primary" onClick={onClose}>
                Get started
              </button>
            ) : (
              <button
                className="nav-button next"
                onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
                aria-label="Next step"
              >
                Next
              </button>
            )}
          </div>

          <p className="keyboard-hint">Use arrow keys to navigate</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
