import { useEffect, useState } from 'react';
import TopNav from '../components/TopNav';
import { GITHUB_REPO_URL } from '../config';
import './DocsPage.css';

interface DocsPageProps {
  onNavigate: (path: string) => void;
  initialHash?: string;
}

const TOC = [
  { id: 'purpose', label: 'Purpose' },
  { id: 'percentiles', label: 'Percentiles' },
  { id: 'setup', label: 'Setup' },
  { id: 'web-app', label: 'Test in the app' },
  { id: 'results', label: 'Read results' },
  { id: 'sharing', label: 'Share runs' },
  { id: 'cli', label: 'CLI' },
  { id: 'tips', label: 'Tips' },
] as const;

const DocsPage: React.FC<DocsPageProps> = ({ onNavigate, initialHash }) => {
  const [activeSection, setActiveSection] = useState(initialHash?.replace('#', '') || 'purpose');

  useEffect(() => {
    if (initialHash) {
      const id = initialHash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }));
      }
    }
  }, [initialHash]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    );

    TOC.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="docs">
      <TopNav
        variant="docs"
        onNavigate={onNavigate}
        onGoHome={() => onNavigate('/')}
        onOpenApp={() => onNavigate('/app')}
      />

      <div className="docs-shell">
        <aside className="docs-sidebar">
          <div className="docs-sidebar-label">On this page</div>
          <ul className="docs-toc">
            {TOC.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={activeSection === id ? 'active' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    window.history.replaceState({}, '', `/docs#${id}`);
                    setActiveSection(id);
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main className="docs-main">
          <header className="docs-hero">
            <p className="docs-eyebrow">Documentation</p>
            <h1 className="docs-title">How to test API latency with Delayt</h1>
            <p className="docs-lead">
              Delayt measures real HTTP response times and reports percentile latency — the numbers
              that reflect what users actually experience, not misleading averages.
            </p>
          </header>

          <section className="docs-section" id="purpose">
            <h2>What Delayt is for</h2>
            <p>
              Delayt helps you answer one question: <strong>how fast is my API for real users?</strong>{' '}
              It sends sequential HTTP requests to your endpoints, records every response time, and
              computes p50, p95, and p99 percentiles.
            </p>
            <p>Use it when you need to:</p>
            <ul>
              <li>Validate staging before a deploy</li>
              <li>Compare two endpoints or API versions side by side</li>
              <li>Share latency evidence with your team via a link</li>
              <li>Gate CI/CD pipelines on p95 thresholds with the CLI</li>
            </ul>
            <div className="docs-callout">
              <p>
                Delayt is not a load generator. Requests run sequentially so you get clean latency
                measurements without concurrency noise.
              </p>
            </div>
          </section>

          <section className="docs-section" id="percentiles">
            <h2>Why percentiles, not averages</h2>
            <p>
              An average can look great while a fraction of users suffer slow responses. Percentiles
              tell you what latency most users see and what the slow tail looks like.
            </p>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>p50</code></td>
                    <td>Half of requests finished at or below this time — typical experience.</td>
                  </tr>
                  <tr>
                    <td><code>p95</code></td>
                    <td>95% of requests finished at or below this time — start here when optimizing.</td>
                  </tr>
                  <tr>
                    <td><code>p99</code></td>
                    <td>Worst-case tail for most users — catches spikes and cold starts.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="docs-section" id="setup">
            <h2>Local setup</h2>
            <p>Delayt needs PostgreSQL for run history and shareable links. The web UI and API run locally.</p>
            <ol>
              <li>Start the database:</li>
            </ol>
            <pre className="docs-code"><code>{`docker compose up -d`}</code></pre>
            <ol start={2}>
              <li>Install dependencies and run the dev stack from the repo root:</li>
            </ol>
            <pre className="docs-code"><code>{`npm install
npm run dev:all`}</code></pre>
            <p>
              Open <strong>http://localhost:3000/app</strong> for the dashboard. The API runs on port{' '}
              <strong>3001</strong>.
            </p>
            <p>
              Optional: copy <code>backend/.env.example</code> to <code>backend/.env</code> if you
              need custom database settings.
            </p>
          </section>

          <section className="docs-section" id="web-app">
            <h2>How to test APIs in the app</h2>
            <ol className="docs-steps">
              <li className="docs-step">
                <span className="docs-step-num">1</span>
                <div>
                  <strong>Open the dashboard</strong>
                  <p>
                    Go to <code>/app</code>. You will see the endpoint composer and run history in
                    the sidebar.
                  </p>
                </div>
              </li>
              <li className="docs-step">
                <span className="docs-step-num">2</span>
                <div>
                  <strong>Add one or more endpoints</strong>
                  <p>
                    Paste a URL, choose the HTTP method (GET, POST, PUT, PATCH, DELETE), and set the
                    request count (1–200 per endpoint). You can add up to 10 endpoints in a single run.
                  </p>
                </div>
              </li>
              <li className="docs-step">
                <span className="docs-step-num">3</span>
                <div>
                  <strong>Configure headers and body (optional)</strong>
                  <p>
                    Expand an endpoint row to add headers (e.g. <code>Authorization</code>) or a JSON
                    body for POST/PUT/PATCH requests.
                  </p>
                </div>
              </li>
              <li className="docs-step">
                <span className="docs-step-num">4</span>
                <div>
                  <strong>Run the test</strong>
                  <p>
                    Click <strong>Run test</strong>. Delayt sends requests sequentially, shows live
                    progress, and computes results when the run completes.
                  </p>
                </div>
              </li>
              <li className="docs-step">
                <span className="docs-step-num">5</span>
                <div>
                  <strong>Review and compare</strong>
                  <p>
                    Use the Results, Histogram, Scatter, and Compare tabs. Re-open past runs from the
                    sidebar history.
                  </p>
                </div>
              </li>
            </ol>
            <button type="button" className="docs-inline-cta" onClick={() => onNavigate('/app')}>
              Open the app <span aria-hidden="true">→</span>
            </button>
          </section>

          <section className="docs-section" id="results">
            <h2>Reading your results</h2>
            <h3>Metric cards</h3>
            <p>
              p50, p95, and p99 appear at the top for each endpoint. Focus on <strong>p95</strong>{' '}
              first — if it is high, a meaningful slice of users is waiting too long.
            </p>
            <h3>Results tab</h3>
            <p>Per-endpoint summary with min, max, mean, percentiles, and status code breakdown.</p>
            <h3>Histogram</h3>
            <p>Distribution of response times — useful for spotting multi-modal latency (e.g. cache hits vs misses).</p>
            <h3>Scatter</h3>
            <p>Request index vs latency over time — helps spot drift or warming effects during a run.</p>
            <h3>Compare</h3>
            <p>Side-by-side percentile comparison when you tested multiple endpoints in one run.</p>
          </section>

          <section className="docs-section" id="sharing">
            <h2>Sharing results</h2>
            <p>
              Every completed run gets a short slug. Copy the share link (e.g.{' '}
              <code>/r/abc123</code>) and send it to teammates — they can view results without
              re-running the test.
            </p>
            <p>
              Your sidebar shows runs saved in a browser cookie on this device — no account required.
              Opening a shared link adds that run to your history here.
            </p>
          </section>

          <section className="docs-section" id="cli">
            <h2>CLI for CI/CD</h2>
            <p>
              The CLI runs without a database — ideal for pipelines and local pre-merge checks. It is
              included in this repo but not published to npm yet.
            </p>
            <h3>Install locally</h3>
            <pre className="docs-code"><code>{`cd backend
npm install
npm run build
npm link          # optional: global \`delayt\` command

# Or run directly:
npm run cli -- -u https://api.example.com/health -c 50`}</code></pre>
            <h3>Example with assertions</h3>
            <pre className="docs-code"><code>{`delayt \\
  -u https://api.example.com/health \\
  -c 50 \\
  --assert-p95=200 \\
  --output json`}</code></pre>
            <p>
              Exit codes: <code>0</code> pass · <code>1</code> assertion failed · <code>2</code> error.
              After a web run, use the CLI export panel to copy an equivalent command.
            </p>
          </section>

          <section className="docs-section" id="tips">
            <h2>Tips for accurate tests</h2>
            <ul>
              <li>
                Use at least <strong>30–50 requests</strong> per endpoint for stable percentile
                estimates.
              </li>
              <li>Test against staging that mirrors production — cold starts and auth matter.</li>
              <li>Run the same test before and after a change to see real delta, not noise.</li>
              <li>
                Watch p99 alongside p95 — a high p99 often means timeouts or occasional backend
                contention.
              </li>
              <li>
                For authenticated APIs, add headers in the composer or use{' '}
                <code>-H "Authorization: Bearer …"</code> in the CLI.
              </li>
            </ul>
          </section>

          <footer className="docs-footer">
            <span className="docs-footer-copy">Delayt v2.0 · MIT</span>
            <div className="docs-footer-links">
              <button type="button" className="docs-footer-link" onClick={() => onNavigate('/')}>
                Home
              </button>
              <button type="button" className="docs-footer-link" onClick={() => onNavigate('/app')}>
                App
              </button>
              <a
                className="docs-footer-link"
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default DocsPage;
