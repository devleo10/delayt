'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { GITHUB_REPO_URL } from '@/config';
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
  const issueDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase();

  return (
    <div className="editorial">
      <header className="editorial-header">
        <div className="editorial-header-inner">
          <div className="editorial-brand">
            <span className="editorial-name">delayt</span>
            <span className="editorial-version">v1.0.3</span>
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
            <div className="editorial-comment">// index</div>
            <ol className="editorial-index">
              <li>
                <button type="button" className="editorial-index-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  <span className="editorial-num">01</span> the_lie
                </button>
              </li>
              <li>
                <button type="button" className="editorial-index-link" onClick={() => document.getElementById('a-real-run')?.scrollIntoView({ behavior: 'smooth' })}>
                  <span className="editorial-num">02</span> a_real_run
                </button>
              </li>
              <li>
                <button type="button" className="editorial-index-link" onClick={() => document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' })}>
                  <span className="editorial-num">03</span> manifesto
                </button>
              </li>
            </ol>
            <div className="editorial-comment editorial-comment-spaced">// about</div>
            <div className="editorial-status">
              mode: <span>sequential</span>
              <br />
              web: <span>≤20 req</span>
              <br />
              cli: <span>up to 200 req</span>
            </div>
          </aside>

          <div className="editorial-hero-main">
            <div className="editorial-issue">delayt — issue 1 — {issueDate}</div>
            <h1 className="editorial-headline font-display">
              <span className="editorial-headline-line">
                Your <em>average</em>
              </span>
              <span className="editorial-headline-line">
                is a <span className="editorial-accent">lie.</span>
              </span>
            </h1>
            <div className="editorial-lead">
              <p className="editorial-dropcap">
                You ship a feature. The dashboard says <strong>186ms avg</strong>. You go to bed.
                Meanwhile one in twenty users is staring at a spinner for two and a half seconds,
                and they&apos;re the ones who write the angry tweet.
              </p>
              <p className="editorial-lead-muted">
                Delayt fires real HTTP at your endpoints and prints the percentiles that actually
                describe a human waiting: <strong>p50</strong>, <strong>p95</strong>,{' '}
                <strong>p99</strong>. No averages. No vibes. No SaaS dashboard.
              </p>
            </div>
            <div className="editorial-cta-row">
              <button type="button" className="editorial-cta" onClick={() => router.push('/app')}>
                <span>$</span> npx @delayt/cli run
              </button>
              <span className="editorial-cta-note">↳ local-first. no signup. ~14kb wire.</span>
            </div>
          </div>

          <TerminalTraceDemo />
        </div>
      </section>

      <section className="editorial-section" id="a-real-run">
        <div className="editorial-contained editorial-receipt">
          <div className="editorial-receipt-header">
            <span>// receipt · run_ocln34nl</span>
            <span>printed {new Date().toUTCString().slice(17, 25)} UTC</span>
          </div>
          <div className="editorial-receipt-rows">
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">endpoint</span>
              <span>POST  api.stripe.com/v1/payment_intents</span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">requests</span>
              <span>8,192 across 4 regions over 6m 12s</span>
            </div>
            <div className="editorial-receipt-row editorial-receipt-muted">
              <span className="editorial-receipt-key">avg</span>
              <span>
                186ms <span className="editorial-receipt-note">← what your dashboard tells you</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">p50</span>
              <span>
                143ms <span className="editorial-receipt-note">← median user</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">p95</span>
              <span>
                812ms <span className="editorial-receipt-note">← 1 in 20 users</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">p99</span>
              <span>
                2.31s <span className="editorial-receipt-note">← your loudest user</span>
              </span>
            </div>
            <div className="editorial-receipt-row">
              <span className="editorial-receipt-key">errors</span>
              <span>0.04% (3 / 8192) · all 504 from fra1 between 02:14–02:17 UTC</span>
            </div>
            <div className="editorial-receipt-row editorial-receipt-verdict">
              <span className="editorial-receipt-key">verdict</span>
              <span className="trace-critical">CRITICAL — p99 budget 800ms, exceeded by 1.51s</span>
            </div>
          </div>
        </div>
      </section>

      <section className="editorial-section">
        <div className="editorial-contained">
          <div className="editorial-comment">// distribution</div>
          <p className="editorial-distribution-copy">
            8,192 requests, bucketed by response time. The long tail on the right is what an avg
            silently averages away.
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
        </div>
      </section>

      <section className="editorial-section" id="manifesto">
        <div className="editorial-grid editorial-manifesto-grid">
          <div className="editorial-comment editorial-manifesto-label">// manifesto</div>
          <p className="editorial-manifesto font-display">
            We don&apos;t ship dashboards, we don&apos;t ship gradients, we don&apos;t ship
            &quot;AI-powered insights&quot;. We ship one number that is true and three numbers
            that hurt. You decide what to do about it.
          </p>
          <ul className="editorial-manifesto-list">
            <li>— no signup, ever</li>
            <li>— runs in your terminal or your tab</li>
            <li>— headers stay on your machine</li>
            <li>— exits with code 1 if p95 fails</li>
            <li>— MIT, open source, one binary</li>
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