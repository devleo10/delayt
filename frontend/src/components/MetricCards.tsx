import { AnalyticsResult } from '@delayt/shared';
import './MetricCards.css';

interface MetricCardsProps {
  results: AnalyticsResult[];
}

function splitValue(ms: number): { value: string; unit: string } {
  if (ms >= 1000) {
    const s = ms / 1000;
    return { value: s.toLocaleString(undefined, { maximumFractionDigits: 2 }), unit: 's' };
  }
  return { value: Math.round(ms).toLocaleString(), unit: 'ms' };
}

const MetricCards: React.FC<MetricCardsProps> = ({ results }) => {
  if (results.length === 0) return null;

  // Worst case across all tested endpoints for each percentile.
  const p50 = Math.max(...results.map((r) => r.p50));
  const p95 = Math.max(...results.map((r) => r.p95));
  const p99 = Math.max(...results.map((r) => r.p99));

  const cards = [
    {
      key: 'p50',
      tone: 'good',
      label: 'p50 — median',
      ms: p50,
      desc: 'half of all requests are faster than this',
    },
    {
      key: 'p95',
      tone: 'warn',
      label: 'p95 — tail latency',
      ms: p95,
      desc: '5% of your users wait longer',
    },
    {
      key: 'p99',
      tone: 'bad',
      label: 'p99 — worst case',
      ms: p99,
      desc: 'your hidden performance problem',
    },
  ] as const;

  return (
    <div className="metric-cards">
      {cards.map((card) => {
        const { value, unit } = splitValue(card.ms);
        return (
          <div key={card.key} className={`metric-card tone-${card.tone}`}>
            <div className="metric-card-label">{card.label}</div>
            <div className="metric-card-value">
              {value}
              <span className="metric-card-unit">{unit}</span>
            </div>
            <div className="metric-card-desc">{card.desc}</div>
          </div>
        );
      })}
    </div>
  );
};

export default MetricCards;
