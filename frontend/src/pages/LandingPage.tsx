import TopNav from '../components/TopNav';
import { GITHUB_REPO_URL } from '../config';
import './LandingPage.css';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="landing">
      <TopNav
        variant="landing"
        onNavigate={onNavigate}
        onOpenApp={() => onNavigate('/app')}
      />

      <main className="landing-main">
        {/* Hero */}
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">✦ API latency testing</p>
            <h1 className="landing-title">
              Stop measuring <strong>averages.</strong>
              <br />
              Start measuring what matters.
            </h1>
            <p className="landing-lead">
              Delayt runs real HTTP requests against your endpoints and surfaces p50, p95, and
              p99 — the percentiles that reflect what users actually experience.
            </p>
            <div className="landing-cta-row">
              <button type="button" className="landing-cta primary" onClick={() => onNavigate('/app')}>
                Start testing <span aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                className="landing-cta secondary"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See how it works
              </button>
            </div>
            <p className="landing-note">
              No signup · Local-first · Share results with <code>/r/your-slug</code>
            </p>
          </div>

          {/* Product preview mock */}
          <div className="landing-preview" aria-hidden="true">
            <div className="preview-chrome">
              <span className="preview-dot red" />
              <span className="preview-dot yellow" />
              <span className="preview-dot green" />
              <span className="preview-url">delayt · live results</span>
            </div>
            <div className="preview-body">
              <div className="preview-row">
                <span className="preview-method get">GET</span>
                <span className="preview-path">api.stripe.com/v1/charges</span>
              </div>
              <div className="preview-row">
                <span className="preview-method post">POST</span>
                <span className="preview-path">api.stripe.com/v1/payment_intents</span>
              </div>
              <div className="preview-metrics">
                <div className="preview-metric">
                  <span className="preview-metric-label">p50</span>
                  <span className="preview-metric-value">143<small>ms</small></span>
                </div>
                <div className="preview-metric warn">
                  <span className="preview-metric-label">p95</span>
                  <span className="preview-metric-value">812<small>ms</small></span>
                </div>
                <div className="preview-metric bad">
                  <span className="preview-metric-label">p99</span>
                  <span className="preview-metric-value">2.3<small>s</small></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="landing-section">
          <h2 className="landing-section-title">Averages hide the pain</h2>
          <div className="landing-problem-grid">
            <div className="landing-problem-card">
              <div className="problem-label">What averages say</div>
              <div className="problem-value good">50ms avg</div>
              <p>99 requests at 10ms + 1 at 10 seconds still looks fine on paper.</p>
            </div>
            <div className="landing-problem-card highlight">
              <div className="problem-label">What p95 reveals</div>
              <div className="problem-value warn">500ms p95</div>
              <p>5% of your users wait half a second or longer. That is the number to optimize.</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="landing-section" id="features">
          <h2 className="landing-section-title">Built for developers who ship</h2>
          <div className="landing-features">
            {[
              {
                title: 'Percentile analysis',
                desc: 'p50, p95, and p99 computed from every request — not just a mean that lies.',
              },
              {
                title: 'Multi-endpoint runs',
                desc: 'Test up to 10 URLs in one run. GET, POST, custom headers, JSON bodies.',
              },
              {
                title: 'Shareable links',
                desc: 'Every run gets a slug. Send /r/abc123 to your team or drop it in a PR.',
              },
              {
                title: 'Run history',
                desc: 'Recent tests stay in Postgres. Compare before and after optimizations.',
              },
              {
                title: 'CLI for CI/CD',
                desc: 'Run locally with assertions. Fail the build when p95 crosses your threshold.',
              },
              {
                title: 'Terminal-grade UI',
                desc: 'Dark, data-dense interface designed for engineers — not dashboard tourists.',
              },
            ].map((f) => (
              <article key={f.title} className="landing-feature">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="landing-section" id="how-it-works">
          <h2 className="landing-section-title">How it works</h2>
          <ol className="landing-steps">
            <li>
              <span className="step-num">1</span>
              <div>
                <strong>Add endpoints</strong>
                <p>Paste URLs, pick methods, set request count (1–200 per endpoint).</p>
              </div>
            </li>
            <li>
              <span className="step-num">2</span>
              <div>
                <strong>Run the test</strong>
                <p>Delayt fires sequential requests with high-resolution timing and stores every result.</p>
              </div>
            </li>
            <li>
              <span className="step-num">3</span>
              <div>
                <strong>Read the percentiles</strong>
                <p>Focus on p95 first. Share the link or export a CLI command for your pipeline.</p>
              </div>
            </li>
          </ol>
        </section>

        {/* CLI */}
        <section className="landing-section landing-cli">
          <h2 className="landing-section-title">Gate deployments on latency</h2>
          <p className="landing-cli-lead">
            The CLI runs without a database. Use it in GitHub Actions, GitLab CI, or locally before
            you merge.
          </p>
          <pre className="landing-code">
            <code>{`cd backend && npm run build
node dist/cli/index.js \\
  -u https://api.example.com/health \\
  -c 50 \\
  --assert-p95=200 \\
  --output json`}</code>
          </pre>
          <p className="landing-cli-exit">
            Exit <code>0</code> pass · <code>1</code> assertion failed · <code>2</code> error
          </p>
        </section>

        {/* Final CTA */}
        <section className="landing-final-cta">
          <h2>Measure what your users feel.</h2>
          <p>Spin up Postgres, run the stack, and test your first endpoint in under a minute.</p>
          <button type="button" className="landing-cta primary large" onClick={() => onNavigate('/app')}>
            Open the app <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-brand">
          <span className="topnav-dot" aria-hidden="true" />
          Delayt v2.0
        </div>
        <div className="landing-footer-links">
          <button type="button" className="landing-footer-link" onClick={() => onNavigate('/app')}>
            App
          </button>
          <button type="button" className="landing-footer-link" onClick={() => onNavigate('/docs')}>
            Docs
          </button>
          <a
            className="landing-footer-link"
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
        <p className="landing-footer-copy">MIT · Built for API developers</p>
      </footer>
    </div>
  );
};

export default LandingPage;
