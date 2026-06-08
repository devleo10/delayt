'use client';
import { AnalyticsResult, formatLatency } from '@delayt/shared';

interface MetricCardsProps {
  results: AnalyticsResult[];
}

function barBlocks(ms: number, maxMs: number, maxBlocks = 24): string {
  return '▮'.repeat(Math.max(1, Math.round((ms / maxMs) * maxBlocks)));
}

const MetricCards: React.FC<MetricCardsProps> = ({ results }) => {
  if (results.length === 0) return null;

  const p50 = Math.max(...results.map((r) => r.p50));
  const p95 = Math.max(...results.map((r) => r.p95));
  const p99 = Math.max(...results.map((r) => r.p99));
  const maxMs = Math.max(p50, p95, p99, 1);

  const cards = [
    {
      key: 'p50',
      tone: 'primary' as const,
      label: 'p50',
      ms: p50,
      note: 'median user',
    },
    {
      key: 'p95',
      tone: 'warn' as const,
      label: 'p95',
      ms: p95,
      note: '1 in 20 users',
    },
    {
      key: 'p99',
      tone: 'critical' as const,
      label: 'p99',
      ms: p99,
      note: 'loudest user',
    },
  ];

  return (
    <div className="metric-cards">
      {cards.map((card) => (
        <div key={card.key} className={`metric-card tone-${card.tone}`}>
          <div className="metric-card-row">
            <span className="metric-card-label">{card.label}</span>
            <span className="metric-card-value">{formatLatency(card.ms)}</span>
          </div>
          <div className="metric-card-bars">{barBlocks(card.ms, maxMs)}</div>
          <div className="metric-card-note">{card.note}</div>
        </div>
      ))}
    </div>
  );
};

export default MetricCards;
