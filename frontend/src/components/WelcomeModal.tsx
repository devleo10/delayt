import React, { useEffect, useState } from 'react';
import './WelcomeModal.css';

interface WelcomeModalProps {
  onClose: () => void;
  onLoadExample: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose, onLoadExample }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Why Percentiles Matter ⚡',
      content: (
        <div className="welcome-step">
          <h3>Your Average Latency is Lying to You</h3>
          <div className="example-scenario">
            <div className="scenario">
              <div className="label">API A - Average:</div>
              <div className="value">50ms</div>
              <div className="label">API B - Average:</div>
              <div className="value">60ms</div>
              <p className="note">→ Looks like API A is faster</p>
            </div>
            <div className="divider">BUT</div>
            <div className="scenario truth">
              <div className="label">API A - p95:</div>
              <div className="value danger">100ms</div>
              <div className="label">API B - p95:</div>
              <div className="value">500ms</div>
              <p className="note">→ API B is actually 5x worse!</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Meet Your New Metrics',
      content: (
        <div className="welcome-step">
          <div className="metric-explainer">
            <div className="metric">
              <div className="metric-name">p50</div>
              <div className="metric-desc">50% of requests faster than this</div>
              <div className="metric-emoji">50% 🏃</div>
            </div>
            <div className="metric">
              <div className="metric-name p95">p95</div>
              <div className="metric-desc">⭐ THE MOST IMPORTANT</div>
              <div className="metric-emoji">95% of users experience</div>
            </div>
            <div className="metric">
              <div className="metric-name">p99</div>
              <div className="metric-desc">99% of requests faster than this</div>
              <div className="metric-emoji">Your worst 1%</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'One Command. That\'s It.',
      content: (
        <div className="welcome-step">
          <p>CLI for developers:</p>
          <div className="code-block">
            delayr https://api.example.com/users
          </div>
          <p>Or use this beautiful UI to:</p>
          <ul className="feature-list">
            <li>✅ Test multiple endpoints</li>
            <li>✅ Add custom headers & auth</li>
            <li>✅ Send POST/PUT request bodies</li>
            <li>✅ Share results with teammates</li>
            <li>✅ Export to CI/CD pipelines</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Ready to Test?',
      content: (
        <div className="welcome-step">
          <p>Let's start with a working example:</p>
          <button className="example-cta" onClick={onLoadExample}>
            🚀 Try Example First
          </button>
          <p className="small-text">
            This tests httpbin.org (a free public API) so you can see what real results look like.
          </p>
          <p className="skip-text">
            After, you'll test YOUR API and understand exactly what the numbers mean.
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

          <p className="keyboard-hint">💡 Use arrow keys to navigate</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
