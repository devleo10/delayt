import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EndpointForm from './components/EndpointForm';
import ResultsTable from './components/ResultsTable';
import LatencyChart from './components/LatencyChart';
import './App.css';

interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST';
  payload?: object;
}

interface AnalyticsResult {
  endpoint: string;
  method: string;
  p50: number;
  p95: number;
  p99: number;
  avg_payload_size: number;
  request_count: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([]);
  const [results, setResults] = useState<AnalyticsResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const handleSubmit = async (endpointList: EndpointConfig[]) => {
    setEndpoints(endpointList);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/run`, {
        endpoints: endpointList,
      });

      console.log('Tests started:', response.data);

      // Start polling for results
      setPolling(true);
    } catch (err) {
      console.error('Error starting tests:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to start tests. Make sure the backend is running.'
      );
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!polling) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/results`);
        const allResults = response.data.results as AnalyticsResult[];

        // Filter results to only show endpoints from the current test run
        const filteredResults = allResults.filter((result) =>
          endpoints.some(
            (ep) => ep.url === result.endpoint && ep.method === result.method
          )
        );

        if (filteredResults.length > 0) {
          setResults(filteredResults);
          
          // Check if we have results for all submitted endpoints
          const hasAllResults = endpoints.every((ep) =>
            filteredResults.some(
              (r) => r.endpoint === ep.url && r.method === ep.method
            )
          );

          // If we have results and all endpoints have at least some requests, stop polling
          // (We check request_count to see if tests are still running)
          const allComplete = filteredResults.every((r) => r.request_count >= 50);
          if (allComplete && hasAllResults) {
            setPolling(false);
            setLoading(false);
          }
        } else if (allResults.length > 0) {
          // If we have results but none match, keep polling (tests might still be running)
          setResults([]);
        }
      } catch (err) {
        console.error('Error polling results:', err);
        // Continue polling even on error
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [polling, endpoints]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>API Latency Visualizer</h1>
        <p>Measure and visualize API endpoint latency using percentiles</p>
      </header>

      <main className="app-main">
        <section className="form-section">
          <EndpointForm onSubmit={handleSubmit} disabled={loading} />
          {error && <div className="error-message">{error}</div>}
          {loading && (
            <div className="loading-message">
              Running tests... This may take a while. Results will appear below.
            </div>
          )}
        </section>

        {results.length > 0 && (
          <>
            <section className="results-section">
              <h2>Results</h2>
              <ResultsTable results={results} />
            </section>

            <section className="chart-section">
              <h2>Payload Size vs Latency</h2>
              <LatencyChart results={results} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;

