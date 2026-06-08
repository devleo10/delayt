'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { APP_VERSION, GITHUB_REPO_URL } from '@/config';
import SiteCredit from '@/components/SiteCredit';
import TerminalTraceDemo from '@/components/TerminalTraceDemo';

function generateHistogram(): { height: number; tone: 'primary' | 'warn' | 'critical' }[] {
  const bars: { height: number; tone: 'primary' | 'warn' | 'critical' }[] = [];
  for (let i = 0; i < 48; i++) {
    const t = i / 47;
    let height: number;
    let tone: 'primary' | 'warn' | 'critical' = 'primary';

    if (t < 0.35) {
      height = 40 + Math.sin(i * 0.8) * 15 + (1 - t) * 35;
    } else if (t < 0.72) {
      height = 18 + Math.sin(i * 1.2) * 8;
      tone = 'warn';
    } else {
      height = 12 + (t - 0.72) * 90 + Math.sin(i) * 6;
      tone = 'critical';
    }
    bars.push({ height: Math.min(100, Math.max(6, height)), tone });
  }
  return bars;
}

export default function LandingPage() {
  const router = useRouter();
  const histogram = useMemo(() => generateHistogram(), []);

  return (
    <div className="editorial">
      <header className="editorial-header">
        <div className="editorial-header-inner">
          <div className="editorial-brand">
            <span className="editorial-name">delayt</span>
            <span className="editorial-version">v{APP_VERSION}</span>
          </div>
          <div className="editorial-stats">
            <span>sequential smoke tests</span>
            <span>p50 · p95 · p99</span>
            <span>MIT · open source</span>
          </div>
          <button type="button" className="editorial-open" onClick={() => router.push('/app')}>
            open_app →
          </button>
        </div>
      </header>

      <section className="editorial-hero-section">
        <div className="editorial-grid editorial-hero-grid">
          <aside className="editorial-sidebar">
            <div className="editorial-comment">// on this page</div>
            <ol className="editorial-index">
              <li>
                <button type="button" className="editorial-index-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  avg vs tail
                </button>
              </li>
              <li>
                <button type="button" className="editorial-index-link" onClick={() => document.getElementById('example-run')?.scrollIntoView({ behavior: 'smooth' })}>
                  example run
                </button>
              </li>
              <li>
                <button type="button" className="editorial-index-link" onClick={() => document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' })}>
                  manifesto
                </button>
              </li>
            </ol>
            <div className="editorial-comment editorial-comment-spaced">// limits</div>
            <div className="editorial-status">
              mode: <span>sequential</span>
              <br />
              web: <span>≤20 req</span>
              <br />
              cli: <span>up to 200 req</span>
            </div>
          </aside>

          <div className="editorial-hero-main">
            <h1 className="editorial-headline font-display">
              <span className="editorial-headline-line">
                Your <em>average</em>
              </span>
              <span className="editorial-headline-line">
                hides the <span className="editorial-accent">tail.</span>
              </span>
            </h1>
            <div className="editorial-lead">
              <p>
                Fifty requests, mostly fast. The dashboard greenlights <strong>186ms avg</strong>.
                Scroll to p95 and <strong>1 in 20</strong> is already past <strong>800ms</strong>;
                the worst <strong>1%</strong> land in <strong>seconds</strong>. The headline number
                never moved.
              </p>
              <p className="editorial-lead-muted">
                Delayt sends sequential HTTP requests and reports <strong>p50</strong>,{' '}
                <strong>p95</strong>, and <strong>p99</strong>. Use the web app for quick checks (≤20
                requests) or the CLI for longer samples and CI gates.
              </p>
            </div>
            <div className="editorial-cta-row">
              <button type="button" className="editorial-cta" onClick={() => router.push('/app')}>
                <span>$</span> npx @delayt/cli run
              </button>
              <span className="editorial-cta-note">↳ open source · no signup · MIT</span>
            </div>
          </div>

          <TerminalTraceDemo />
        </div>
      </section>

      <section className="editorial-section" id="example-run">
        <div className="editorial-contained editorial-receipt">
          <div className="editorial-receipt-header">
            <span>// example receipt</span>
            <span>run_ocln34nl · 50 requests</span>
          </div>
          <div className="editorial-receipt-rows">
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">endpoint</span>
              <span>GET  api.example.com/v1/resource</span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">requests</span>
              <span>50 sequential · ~12s wall time</span>
            </div>
            <div className="editorial-receipt-row editorial-receipt-muted">
              <span className="editorial-receipt-key">avg</span>
              <span>
                186ms <span className="editorial-receipt-note">← smooths over outliers</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">p50</span>
              <span>
                143ms <span className="editorial-receipt-note">← median request</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">p95</span>
              <span>
                812ms <span className="editorial-receipt-note">← 5% of requests slower</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">p99</span>
              <span>
                2.31s <span className="editorial-receipt-note">← slowest 1% of requests</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">errors</span>
              <span>0% · all 2xx in this sample</span>
            </div>
            <div className="editorial-receipt-row editorial-receipt-verdict">
              <span className="editorial-receipt-key">verdict</span>
              <span className="trace-critical">
                CRITICAL: example budget p99 &lt; 800ms (with --assert-p99=800)
              </span>
            </div>
          </div>
          <p className="editorial-sample-note">* fictional sample, not a live run</p>
        </div>
      </section>

      <section className="editorial-section">
        <div className="editorial-contained">
          <div className="editorial-comment">// distribution</div>
          <p className="editorial-distribution-copy">
            50 requests bucketed by response time. The long tail on the right is what an average
            silently smooths away.
          </p>
          <div className="editorial-histogram">
            <div className="editorial-histogram-bars">
              {histogram.map((bar, i) => (
                <span
                  key={i}
                  className={`editorial-bar bar-rise tone-${bar.tone}`}
                  style={{ height: `${bar.height}%`, animationDelay: `${i * 14}ms` }}
                />
              ))}
            </div>
            <div className="editorial-histogram-axis">
              <span>0ms</span>
              <span>· p50 143ms</span>
              <span>· p95 812ms</span>
              <span>3s+</span>
            </div>
          </div>
          <p className="editorial-sample-note">* fictional sample, not a live run</p>
        </div>
      </section>

      <section className="editorial-section" id="manifesto">
        <div className="editorial-grid editorial-manifesto-grid">
          <div className="editorial-comment editorial-manifesto-label">// manifesto</div>
          <p className="editorial-manifesto font-display">
            Sequential latency checks, not load tests. Print p50, p95, and p99 from real HTTP
            responses. Pick your own thresholds; we don&apos;t pretend 200ms fits every API.
          </p>
          <ul className="editorial-manifesto-list">
            <li>- no signup on the hosted web app</li>
            <li>- browser UI for quick runs (up to 20 requests); CLI for 50–200 and CI</li>
            <li>- CLI runs locally; auth headers stay in your terminal</li>
            <li>- hosted web runs send HTTP from the server (see docs)</li>
            <li>- exit code 1 when --assert-p95 / --assert-p99 fails</li>
            <li>- MIT · npm install @delayt/cli</li>
          </ul>
        </div>
      </section>

      <footer className="editorial-footer">
        <div className="editorial-footer-inner">
          <span>
            delayt · made in a terminal · © 2026 · <SiteCredit />
          </span>
          <span className="editorial-footer-links">
            <button type="button" onClick={() => router.push('/docs')}>
              docs
            </button>
            <span> · </span>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              github
            </a>
            <span> · </span>
            <button type="button" onClick={() => router.push('/app')}>
              app
            </button>
          </span>
        </div>
      </footer>
    </div>
  );
}
