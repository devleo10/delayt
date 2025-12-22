import React, { useState } from 'react';
import './EndpointForm.css';

interface EndpointConfig {
  url: string;
  method: 'GET' | 'POST';
  payload?: object;
}

interface EndpointFormProps {
  onSubmit: (endpoints: EndpointConfig[]) => void;
  disabled: boolean;
}

interface EndpointItem {
  id: string;
  method: 'GET' | 'POST';
  url: string;
  body: string;
}

const EndpointForm: React.FC<EndpointFormProps> = ({ onSubmit, disabled }) => {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([
    { id: '1', method: 'GET', url: '', body: '' }
  ]);
  const [error, setError] = useState<string | null>(null);

  const addEndpoint = () => {
    setEndpoints([
      ...endpoints,
      { id: Date.now().toString(), method: 'GET', url: '', body: '' }
    ]);
  };

  const removeEndpoint = (id: string) => {
    if (endpoints.length > 1) {
      setEndpoints(endpoints.filter(ep => ep.id !== id));
    }
  };

  const updateEndpoint = (id: string, field: keyof EndpointItem, value: string) => {
    setEndpoints(endpoints.map(ep => 
      ep.id === id ? { ...ep, [field]: value } : ep
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate all endpoints
    const validatedEndpoints: EndpointConfig[] = [];

    for (const ep of endpoints) {
      if (!ep.url.trim()) {
        setError('Please enter a URL for all endpoints');
        return;
      }

      // Validate URL format
      try {
        new URL(ep.url);
      } catch {
        setError(`Invalid URL: ${ep.url}`);
        return;
      }

      const endpoint: EndpointConfig = {
        url: ep.url.trim(),
        method: ep.method,
      };

      // Parse body for POST requests
      if (ep.method === 'POST' && ep.body.trim()) {
        try {
          endpoint.payload = JSON.parse(ep.body);
        } catch (err) {
          setError(`Invalid JSON in body for ${ep.url}: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
          return;
        }
      }

      validatedEndpoints.push(endpoint);
    }

    if (validatedEndpoints.length === 0) {
      setError('Please add at least one endpoint');
      return;
    }

    onSubmit(validatedEndpoints);
  };

  return (
    <form onSubmit={handleSubmit} className="endpoint-form">
      <div className="form-header">
        <h3>API Endpoints</h3>
        <button
          type="button"
          className="add-endpoint-button"
          onClick={addEndpoint}
          disabled={disabled}
        >
          + Add Endpoint
        </button>
      </div>

      {endpoints.map((endpoint, index) => (
        <div key={endpoint.id} className="endpoint-card">
          <div className="endpoint-header">
            <span className="endpoint-number">#{index + 1}</span>
            <select
              className="method-select"
              value={endpoint.method}
              onChange={(e) => updateEndpoint(endpoint.id, 'method', e.target.value)}
              disabled={disabled}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <input
              type="text"
              className="url-input"
              placeholder="https://api.example.com/endpoint"
              value={endpoint.url}
              onChange={(e) => updateEndpoint(endpoint.id, 'url', e.target.value)}
              disabled={disabled}
            />
            {endpoints.length > 1 && (
              <button
                type="button"
                className="remove-button"
                onClick={() => removeEndpoint(endpoint.id)}
                disabled={disabled}
                title="Remove endpoint"
              >
                ×
              </button>
            )}
          </div>
          
          {endpoint.method === 'POST' && (
            <div className="body-section">
              <label className="body-label">Body (JSON)</label>
              <textarea
                className="body-textarea"
                placeholder='{"key": "value"}'
                value={endpoint.body}
                onChange={(e) => updateEndpoint(endpoint.id, 'body', e.target.value)}
                disabled={disabled}
                rows={4}
              />
            </div>
          )}
        </div>
      ))}

      {error && <div className="form-error">{error}</div>}

      <button type="submit" className="submit-button" disabled={disabled}>
        {disabled ? 'Running Tests...' : 'Run Tests (50 requests per endpoint)'}
      </button>
    </form>
  );
};

export default EndpointForm;

