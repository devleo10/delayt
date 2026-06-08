'use client';
import { useEffect, useRef, useState } from 'react';

const TOTAL = 50;
const OK_COUNT = 50;

const COMMAND = `$ delayt run \\
   -u api.example.com/v1/resource \\
   -n ${TOTAL}`;

const P50_BARS = 2;
const P95_BARS = 11;
const P99_BARS = 30;

type Phase =
  | 'idle'
  | 'typing'
  | 'dispatch'
  | 'ok'
  | 'p50'
  | 'p95'
  | 'p99'
  | 'verdict'
  | 'share'
  | 'hold';

function latencyBars(count: number): string {
  return '▮'.repeat(count);
}

interface TerminalTraceDemoProps {
  label?: string;
}

const TerminalTraceDemo: React.FC<TerminalTraceDemoProps> = ({
  label = '// trace · example CLI output',
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [typedChars, setTypedChars] = useState(0);
  const [dispatchCount, setDispatchCount] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [dispatchDots, setDispatchDots] = useState(0);
  const [p50Bars, setP50Bars] = useState(0);
  const [p95Bars, setP95Bars] = useState(0);
  const [p99Bars, setP99Bars] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const reset = () => {
    setPhase('typing');
    setTypedChars(0);
    setDispatchCount(0);
    setOkCount(0);
    setDispatchDots(0);
    setP50Bars(0);
    setP95Bars(0);
    setP99Bars(0);
  };

  const showFinal = () => {
    setPhase('share');
    setTypedChars(COMMAND.length);
    setDispatchCount(TOTAL);
    setOkCount(OK_COUNT);
    setP50Bars(P50_BARS);
    setP95Bars(P95_BARS);
    setP99Bars(P99_BARS);
  };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStarted(true);
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (reducedMotion) {
      showFinal();
      return;
    }
    reset();
  }, [started, reducedMotion]);

  useEffect(() => {
    if (!started || reducedMotion || phase === 'idle' || phase === 'hold') return;

    if (phase === 'typing') {
      if (typedChars >= COMMAND.length) {
        const t = window.setTimeout(() => setPhase('dispatch'), 280);
        return () => window.clearTimeout(t);
      }
      const t = window.setTimeout(() => setTypedChars((n) => n + 1), 28);
      return () => window.clearTimeout(t);
    }

    if (phase === 'dispatch') {
      const dotTimer = window.setInterval(() => setDispatchDots((d) => (d + 1) % 4), 320);
      const countTimer = window.setInterval(() => {
        setDispatchCount((n) => {
          if (n >= TOTAL) return n;
          return Math.min(TOTAL, n + 4);
        });
      }, 45);

      const done = window.setTimeout(() => {
        setDispatchCount(TOTAL);
        setPhase('ok');
      }, 1200);

      return () => {
        window.clearInterval(dotTimer);
        window.clearInterval(countTimer);
        window.clearTimeout(done);
      };
    }

    if (phase === 'ok') {
      const t = window.setInterval(() => {
        setOkCount((n) => {
          if (n >= OK_COUNT) {
            window.clearInterval(t);
            setPhase('p50');
            return OK_COUNT;
          }
          return Math.min(OK_COUNT, n + 5);
        });
      }, 24);
      return () => window.clearInterval(t);
    }

    if (phase === 'p50') {
      const t = window.setInterval(() => {
        setP50Bars((n) => {
          if (n >= P50_BARS) {
            window.clearInterval(t);
            setPhase('p95');
            return P50_BARS;
          }
          return n + 1;
        });
      }, 70);
      return () => window.clearInterval(t);
    }

    if (phase === 'p95') {
      const t = window.setInterval(() => {
        setP95Bars((n) => {
          if (n >= P95_BARS) {
            window.clearInterval(t);
            setPhase('p99');
            return P95_BARS;
          }
          return n + 1;
        });
      }, 45);
      return () => window.clearInterval(t);
    }

    if (phase === 'p99') {
      const t = window.setInterval(() => {
        setP99Bars((n) => {
          if (n >= P99_BARS) {
            window.clearInterval(t);
            setPhase('verdict');
            return P99_BARS;
          }
          return n + 2;
        });
      }, 35);
      return () => window.clearInterval(t);
    }

    if (phase === 'verdict') {
      const t = window.setTimeout(() => setPhase('share'), 350);
      return () => window.clearTimeout(t);
    }

    if (phase === 'share') {
      const t = window.setTimeout(() => setPhase('hold'), 4500);
      return () => window.clearTimeout(t);
    }
  }, [phase, started, reducedMotion, typedChars]);

  useEffect(() => {
    if (phase !== 'hold' || reducedMotion || !started) return;
    const t = window.setTimeout(() => reset(), 600);
    return () => window.clearTimeout(t);
  }, [phase, reducedMotion, started]);

  const typedCommand = COMMAND.slice(0, typedChars);

  const dispatchLine =
    phase === 'typing' || phase === 'idle'
      ? ''
      : phase === 'dispatch'
        ? `→ running ${dispatchCount}/${TOTAL}${'.'.repeat(dispatchDots + 1)}`
        : `→ running ${TOTAL}/${TOTAL}`;

  const showTailCursor =
    !reducedMotion &&
    started &&
    phase !== 'share' &&
    phase !== 'hold' &&
    phase !== 'idle';

  return (
    <aside className="editorial-trace" ref={containerRef}>
      <div className="editorial-comment">{label}</div>
      <pre className="editorial-pre terminal-trace" aria-live="polite">
        <span className="terminal-command">
          {typedCommand}
          {phase === 'typing' && typedChars < COMMAND.length && (
            <span className="terminal-cursor" aria-hidden="true">
              ▌
            </span>
          )}
        </span>

        {phase !== 'typing' && phase !== 'idle' && (
          <>
            {'\n\n'}
            <span
              className={`terminal-line ${phase === 'dispatch' ? 'terminal-line-active' : ''}`}
            >
              {dispatchLine}
            </span>
          </>
        )}

        {(phase === 'ok' ||
          phase === 'p50' ||
          phase === 'p95' ||
          phase === 'p99' ||
          phase === 'verdict' ||
          phase === 'share' ||
          phase === 'hold') && (
          <>
            {'\n'}
            <span className="terminal-line terminal-line-ok">
              → ok{'    '}
              {okCount} / {TOTAL}
            </span>
          </>
        )}

        {(phase === 'p50' ||
          phase === 'p95' ||
          phase === 'p99' ||
          phase === 'verdict' ||
          phase === 'share' ||
          phase === 'hold') && (
          <>
            {'\n\n'}
            <span className="trace-p50 terminal-stat">
              p50  143ms  {latencyBars(p50Bars)}
            </span>
          </>
        )}

        {(phase === 'p95' ||
          phase === 'p99' ||
          phase === 'verdict' ||
          phase === 'share' ||
          phase === 'hold') && (
          <>
            {'\n'}
            <span className="trace-p95 terminal-stat">
              p95  812ms  {latencyBars(p95Bars)}
            </span>
          </>
        )}

        {(phase === 'p99' ||
          phase === 'verdict' ||
          phase === 'share' ||
          phase === 'hold') && (
          <>
            {'\n'}
            <span className="trace-p99 terminal-stat">
              p99  2.3s   {latencyBars(p99Bars)}
            </span>
          </>
        )}

        {(phase === 'verdict' || phase === 'share' || phase === 'hold') && (
          <>
            {'\n\n'}
            <span className="terminal-verdict">
              verdict: <span className="trace-critical">CRITICAL</span>
            </span>
          </>
        )}

        {(phase === 'share' || phase === 'hold') && (
          <>
            {'\n'}
            <span className="terminal-share">
              share:   <span className="trace-share">/r/ocln34nl</span>
            </span>
          </>
        )}

        {showTailCursor && phase !== 'typing' && (
          <span className="terminal-cursor terminal-cursor-tail" aria-hidden="true">
            ▌
          </span>
        )}
      </pre>
    </aside>
  );
};

export default TerminalTraceDemo;
