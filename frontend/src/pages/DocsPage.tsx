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
  { id: 'comparison', label: 'vs load tools' },
  { id: 'percentiles', label: 'Percentiles' },
  { id: 'setup', label: 'Setup' },
  { id: 'web-app', label: 'Test in the app' },
  { id: 'auth', label: 'Auth & headers' },
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
              Delayt measures real HTTP response times and reports percentile latency, the numbers
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

          <section className="docs-section" id="comparison">
            <h2>How Delayt differs from JMeter, Gatling, Locust, and k6</h2>
            <p>
              Tools like <strong>JMeter</strong>, <strong>Gatling</strong>, <strong>Locust</strong>,{' '}
              <strong>k6</strong>, and <strong>Artillery</strong> are built for <strong>load and stress
              testing</strong>. They simulate many concurrent users to find throughput limits, queue
              buildup, and failure points under pressure.
            </p>
            <p>
              Delayt is built for something else: a <strong>fast percentile smoke check</strong>{' '}
              before you ship. One endpoint, sequential requests, p50/p95/p99 out of the box, and a
              one-liner in CI. No test plans, no virtual users, no cluster setup.
            </p>

            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>Load tools (JMeter, Gatling, Locust, k6…)</th>
                    <th>Delayt</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Primary goal</strong></td>
                    <td>Stress the system: concurrency, saturation, breaking points</td>
                    <td>Measure real latency distribution on a single path</td>
                  </tr>
                  <tr>
                    <td><strong>Request pattern</strong></td>
                    <td>Many parallel virtual users, ramps, scenarios</td>
                    <td>Sequential requests (clean timing, no concurrency noise)</td>
                  </tr>
                  <tr>
                    <td><strong>Key metrics</strong></td>
                    <td>Throughput, error rate under load, RPS, sometimes percentiles</td>
                    <td>p50, p95, p99 first; success rate and histograms in the UI</td>
                  </tr>
                  <tr>
                    <td><strong>Setup time</strong></td>
                    <td>Scripts, plugins, agents, or distributed workers</td>
                    <td><code>npx @delayt/cli run -u … -n 50</code> or paste a URL in the app</td>
                  </tr>
                  <tr>
                    <td><strong>Best moment to run</strong></td>
                    <td>Capacity planning, pre-scale drills, finding max RPS</td>
                    <td>Pre-deploy staging check, regression gate, quick team share</td>
                  </tr>
                  <tr>
                    <td><strong>Collaboration</strong></td>
                    <td>Reports exported from your load test run</td>
                    <td>Shareable <code>/r/:slug</code> links from the web app</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>When to use which</h3>
            <ul>
              <li>
                <strong>Use Delayt</strong> when you want to know &quot;is this endpoint still fast
                for typical users?&quot; before a merge or deploy, or to compare two URLs side by
                side with percentile numbers your PM can read.
              </li>
              <li>
                <strong>Use JMeter / Gatling / Locust / k6</strong> when you need to answer &quot;how
                many concurrent users can we handle?&quot; or &quot;where does the system break under
                load?&quot;
              </li>
              <li>
                <strong>Use both</strong> in a healthy pipeline: Delayt as a lightweight percentile
                gate on every PR; load tools on a schedule or before major releases.
              </li>
            </ul>

            <div className="docs-callout">
              <p>
                Delayt will not replace a load test. Sequential requests cannot expose contention,
                connection pool exhaustion, or queueing that only appears under concurrency. That is
                by design: you get a clear latency baseline without mixing in load-generator artifacts.
              </p>
            </div>

            <h3>CI example (Delayt&apos;s sweet spot)</h3>
            <pre className="docs-code"><code>{`# Fail the build if p95 on staging health exceeds 500ms
npx @delayt/cli run \\
  -u https://staging.api.example.com/health \\
  -n 50 \\
  --assert-p95=500 \\
  --output json -q`}</code></pre>
            <p>
              Load tools can do performance gates too, but they need more wiring. Delayt is meant
              to be the check you add in five minutes and keep forever.
            </p>
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
                    <td>Half of requests finished at or below this time. Typical experience.</td>
                  </tr>
                  <tr>
                    <td><code>p95</code></td>
                    <td>95% of requests finished at or below this time. Start here when optimizing.</td>
                  </tr>
                  <tr>
                    <td><code>p99</code></td>
                    <td>Worst-case tail for most users. Catches spikes and cold starts.</td>
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
                    request count (1-200 per endpoint). You can add up to 10 endpoints in a single run.
                  </p>
                </div>
              </li>
              <li className="docs-step">
                <span className="docs-step-num">3</span>
                <div>
                  <strong>Configure the request (tabs)</strong>
                  <p>
                    Use the composer tabs: <strong>Parameters</strong> for query strings,{' '}
                    <strong>Body</strong> for JSON on POST/PUT/PATCH, <strong>Headers</strong> for
                    custom headers (API keys, <code>User-Agent</code>, etc.), and{' '}
                    <strong>Authorization</strong> for Bearer tokens. See{' '}
                    <a href="#auth">Auth &amp; headers</a> for how missing credentials behave.
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
              Open the app
            </button>
          </section>

          <section className="docs-section" id="auth">
            <h2>Auth, headers, and private APIs</h2>
            <p>
              Delayt is a latency tester: it always sends the number of requests you configured and
              records whatever your API returns. It does not block the run when auth or headers are
              missing.
            </p>

            <h3>Where to put each value</h3>
            <div className="docs-table-wrap">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>Tab</th>
                    <th>Use for</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Parameters</strong></td>
                    <td>
                      Query string key/value pairs (merged into the URL). Empty rows are ignored.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Body</strong></td>
                    <td>JSON payload for POST, PUT, or PATCH.</td>
                  </tr>
                  <tr>
                    <td><strong>Headers</strong></td>
                    <td>
                      Any custom header, e.g. <code>X-API-Key</code>, <code>X-App-Source</code>,{' '}
                      <code>User-Agent</code>. Only filled rows are sent.
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Authorization</strong></td>
                    <td>
                      Bearer token only. Delayt adds the <code>Bearer</code> prefix if you paste
                      the raw token and sends <code>Authorization: Bearer …</code>.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>Runs without auth still execute</h3>
            <p>
              If you leave Authorization and Headers empty, Delayt still runs every request. Your
              API may respond with <code>401</code> or <code>403</code>; those responses are
              measured like any other HTTP response. The run completes; the API call itself failed
              from your API&apos;s perspective.
            </p>
            <p>
              Delayt does not validate credentials before starting and does not send a single
              preflight request. Check the <strong>Success %</strong> column after a run: if auth was
              missing, you will usually see <strong>0%</strong> (or a low rate) when every response
              is 4xx/5xx.
            </p>

            <h3>How success rate is calculated</h3>
            <p>
              Percentiles (p50, p95, p99) are computed from all response times in the run, including
              failed auth. Success rate counts responses with status <code>0</code> (timeout/network)
              or <code>400+</code> as errors. A run full of <code>403</code> responses still shows
              latency numbers, but success rate should be 0%.
            </p>

            <div className="docs-callout">
              <p>
                <strong>Who sends the request?</strong> The Delayt backend makes HTTP calls to your
                URL, not your browser. In local dev that is your machine; on a hosted deploy, targets
                must be reachable from that server (public URLs or VPN). <code>localhost</code> on
                your laptop is not reachable from a cloud-hosted Delayt instance.
              </p>
            </div>

            <h3>Share links and secrets</h3>
            <p>
              Headers and Bearer tokens are stored with the run so shared links reproduce the same
              request. Treat share URLs like any secret-bearing config: only send them to people who
              should see those credentials.
            </p>

            <h3>CLI equivalent</h3>
            <p>
              Pass headers with repeated <code>-H</code> flags. After a web run, use the CLI export
              panel on the dashboard to copy commands with or without auth headers.
            </p>
            <pre className="docs-code"><code>{`delayt run -u https://api.example.com/v1/resource \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-App-Source: my-app/1.0" \\
  -n 50`}</code></pre>
          </section>

          <section className="docs-section" id="results">
            <h2>Reading your results</h2>
            <h3>Metric cards</h3>
            <p>
              p50, p95, and p99 appear at the top for each endpoint. Focus on <strong>p95</strong>{' '}
              first. If it is high, a meaningful slice of users is waiting too long.
            </p>
            <h3>Results tab</h3>
            <p>
              Per-endpoint summary with min, max, mean, percentiles, and <strong>Success %</strong>.
              If you tested without required auth or headers, expect a low success rate even though
              the run finished. See <a href="#auth">Auth &amp; headers</a>.
            </p>
            <h3>Histogram</h3>
            <p>Distribution of response times. Useful for spotting multi-modal latency (e.g. cache hits vs misses).</p>
            <h3>Scatter</h3>
            <p>Request index vs latency over time. Helps spot drift or warming effects during a run.</p>
            <h3>Compare</h3>
            <p>Side-by-side percentile comparison when you tested multiple endpoints in one run.</p>
            <h3>Export</h3>
            <p>
              From the Results tab, download summary data as JSON or CSV, or export per-request raw
              rows (latency, status code, payload sizes) as Raw JSON / Raw CSV. Use{' '}
              <strong>Copy as Markdown</strong> for GitHub issues and PRs.
            </p>
            <h3>Stop a run</h3>
            <p>
              While a test is running, click <strong>Stop</strong> on the progress bar to cancel
              remaining requests. The run stops between requests; the in-flight request still
              completes.
            </p>
          </section>

          <section className="docs-section" id="sharing">
            <h2>Sharing results</h2>
            <p>
              Every completed run gets a short slug. Copy the share link (e.g.{' '}
              <code>/r/abc123</code>) and send it to teammates. They can view results without
              re-running the test.
            </p>
            <p>
              Your sidebar shows runs saved in a browser cookie on this device. No account required.
              Opening a shared link adds that run to your history here. Use <strong>Clear</strong> in
              the sidebar to remove local history (share links still work; server data is unchanged).
            </p>
          </section>

          <section className="docs-section" id="cli">
            <h2>CLI for CI/CD</h2>
            <p>
              The CLI runs without a database. Good for pipelines and local pre-merge checks.
            </p>
            <h3>Install</h3>
            <pre className="docs-code"><code>{`npx @delayt/cli run -u https://api.example.com/health -n 50

# Or from source:
npm run build:cli
npm run cli -- run -u https://api.example.com/health -n 50`}</code></pre>
            <h3>Example with assertions</h3>
            <pre className="docs-code"><code>{`delayt run \\
  -u https://api.example.com/health \\
  -n 50 \\
  --assert-p95=200 \\
  --output json`}</code></pre>
            <p>
              Exit codes: <code>0</code> pass, <code>1</code> assertion failed, <code>2</code> error.
              After a web run, use the CLI export panel to copy an equivalent command.
            </p>
          </section>

          <section className="docs-section" id="tips">
            <h2>Tips for accurate tests</h2>
            <ul>
              <li>
                Use at least <strong>30-50 requests</strong> per endpoint for stable percentile
                estimates.
              </li>
              <li>Test against staging that mirrors production. Cold starts and auth matter.</li>
              <li>Run the same test before and after a change to see real delta, not noise.</li>
              <li>
                Watch p99 alongside p95. A high p99 often means timeouts or occasional backend
                contention.
              </li>
              <li>
                For private APIs, fill Authorization and Headers before Run. A run without them
                still executes but usually returns 401/403; check Success %, not just percentiles.
              </li>
              <li>
                Put query params in the Parameters tab (or URL). API keys and custom headers belong
                on the Headers tab, not only in the URL bar.
              </li>
            </ul>
          </section>

          <footer className="docs-footer">
            <span className="docs-footer-copy">Delayt v1.0 | MIT</span>
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
