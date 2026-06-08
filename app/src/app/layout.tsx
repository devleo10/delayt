import type { Metadata } from 'next';
import '@/global.css';
import '@/App.css';
import '@/components/ErrorBoundary.css';
import '@/components/ProgressIndicator.css';
import '@/components/TopNav.css';
import '@/components/RunHistory.css';
import '@/components/MetricCards.css';
import '@/components/ResultsTable.css';
import '@/components/EndpointForm.css';
import '@/components/LatencyChart.css';
import '@/components/CliExport.css';
import '@/components/ShareCard.css';
import '@/components/PerformanceInsights.css';
import '@/components/ComparisonMode.css';
import '@/components/EducationalModal.css';
import '@/components/WelcomeModal.css';
import '@/components/Tooltip.css';
import '@/components/TerminalTraceDemo.css';
import '@/LandingPage.css';
import '@/DocsPage.css';

export const metadata: Metadata = {
  title: 'delayt — API latency percentile testing',
  description:
    'Fire real HTTP at your endpoints and get p50, p95, p99 latency. No averages. No vibes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}