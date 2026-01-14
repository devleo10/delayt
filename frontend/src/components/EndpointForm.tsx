import React, { useState } from 'react';
import './EndpointForm.css';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface EndpointConfig {
  url: string;
  method: HttpMethod;
  payload?: object;
  headers?: Record<string, string>;
  name?: string;
}

interface EndpointFormProps {
  onSubmit: (endpoints: EndpointConfig[], requestCount: number) => void;
  disabled: boolean;
  initialRequestCount?: number;
}

interface HeaderItem {
  key: string;
  value: string;
}

interface EndpointItem {
  id: string;
  method: HttpMethod;
  url: string;
  name: string;
  body: string;
  headers: HeaderItem[];
  showAdvanced: boolean;
}

const EndpointForm: React.FC<EndpointFormProps> = ({ 
  onSubmit, 
  disabled, 
  initialRequestCount = 50 
}) => {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([
    { 
      id: '1', 
      method: 'GET', 
      url: '', 
      name: '',
      body: '', 
      headers: [],
      showAdvanced: false 
    }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(initialRequestCount);

  const addEndpoint = () => {
    setEndpoints([
      ...endpoints,
      { 
        id: Date.now().toString(), 
        method: 'GET', 
        url: '', 
        name: '',
        body: '', 
        headers: [],
        showAdvanced: false 
      }
    ]);
  };

  const removeEndpoint = (id: string) => {
    if (endpoints.length > 1) {
      setEndpoints(endpoints.filter(ep => ep.id !== id));
    }
  };

  const updateEndpoint = (id: string, field: keyof EndpointItem, value: any) => {
    setEndpoints(endpoints.map(ep => 
      ep.id === id ? { ...ep, [field]: value } : ep
    ));
  };

  const addHeader = (endpointId: string) => {
    setEndpoints(endpoints.map(ep => 
      ep.id === endpointId 
        ? { ...ep, headers: [...ep.headers, { key: '', value: '' }] }
        : ep
    ));
  };

  const updateHeader = (endpointId: string, headerIndex: number, field: 'key' | 'value', value: string) => {
    setEndpoints(endpoints.map(ep => {
      if (ep.id === endpointId) {
        const newHeaders = [...ep.headers];
        newHeaders[headerIndex] = { ...newHeaders[headerIndex], [field]: value };
        return { ...ep, headers: newHeaders };
      }
      return ep;
    }));
  };

  const removeHeader = (endpointId: string, headerIndex: number) => {
    setEndpoints(endpoints.map(ep => {
      if (ep.id === endpointId) {
        const newHeaders = ep.headers.filter((_, i) => i !== headerIndex);
        return { ...ep, headers: newHeaders };
      }
      return ep;
    }));
  };

  const toggleAdvanced = (id: string) => {
    setEndpoints(endpoints.map(ep => 
      ep.id === id ? { ...ep, showAdvanced: !ep.showAdvanced } : ep
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requestCount < 1 || requestCount > 200) {
      setError('Request count must be between 1 and 200');
      return;
    }

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

      // Add name if provided
      if (ep.name.trim()) {
        endpoint.name = ep.name.trim();
      }

      // Parse body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(ep.method) && ep.body.trim()) {
        try {
          endpoint.payload = JSON.parse(ep.body);
        } catch (err) {
          setError(`Invalid JSON in body for ${ep.name || ep.url}: ${err instanceof Error ? err.message : 'Invalid JSON'}`);
          return;
        }
      }

      // Add headers if any
      const validHeaders = ep.headers.filter(h => h.key.trim() && h.value.trim());
      if (validHeaders.length > 0) {
        endpoint.headers = validHeaders.reduce((acc, h) => {
          acc[h.key.trim()] = h.value.trim();
          return acc;
        }, {} as Record<string, string>);
      }

      validatedEndpoints.push(endpoint);
    }

    if (validatedEndpoints.length === 0) {
      setError('Please add at least one endpoint');
      return;
    }

    onSubmit(validatedEndpoints, requestCount);
  };

  const needsBody = (method: HttpMethod) => ['POST', 'PUT', 'PATCH'].includes(method);

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
              onChange={(e) => updateEndpoint(endpoint.id, 'method', e.target.value as HttpMethod)}
              disabled={disabled}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              className="url-input"
              placeholder="https://api.example.com/endpoint"
              value={endpoint.url}
              onChange={(e) => updateEndpoint(endpoint.id, 'url', e.target.value)}
              disabled={disabled}
            />
            <input
              type="text"
              className="name-input"
              placeholder="Label (optional)"
              value={endpoint.name}
              onChange={(e) => updateEndpoint(endpoint.id, 'name', e.target.value)}
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
          
          <button 
            type="button" 
            className="toggle-advanced"
            onClick={() => toggleAdvanced(endpoint.id)}
          >
            {endpoint.showAdvanced ? '▼' : '▶'} Advanced Options
          </button>

          {endpoint.showAdvanced && (
            <div className="advanced-section">
              {/* Headers Section */}
              <div className="headers-section">
                <label className="section-label">Headers</label>
                <div className="headers-list">
                  {endpoint.headers.map((header, hIndex) => (
                    <div key={hIndex} className="header-row">
                      <input
                        type="text"
                        className="header-key"
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => updateHeader(endpoint.id, hIndex, 'key', e.target.value)}
                        disabled={disabled}
                      />
                      <input
                        type="text"
                        className="header-value"
                        placeholder="Header value"
                        value={header.value}
                        onChange={(e) => updateHeader(endpoint.id, hIndex, 'value', e.target.value)}
                        disabled={disabled}
                      />
                      <button
                        type="button"
                        className="remove-header-button"
                        onClick={() => removeHeader(endpoint.id, hIndex)}
                        disabled={disabled}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="add-header-button"
                  onClick={() => addHeader(endpoint.id)}
                  disabled={disabled}
                >
                  + Add Header
                </button>
              </div>

              {/* Body Section for POST/PUT/PATCH */}
              {needsBody(endpoint.method) && (
                <div className="body-section">
                  <label className="body-label">Request Body (JSON)</label>
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
          )}

          {/* Show body section outside advanced for POST methods by default */}
          {!endpoint.showAdvanced && needsBody(endpoint.method) && (
            <div className="body-section">
              <label className="body-label">Request Body (JSON)</label>
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

      <div className="form-footer">
        <div className="request-count-section">
          <label className="request-count-label">Requests per endpoint:</label>
          <input
            type="number"
            className="request-count-input"
            min="1"
            max="200"
            value={requestCount}
            onChange={(e) => setRequestCount(parseInt(e.target.value) || 50)}
            disabled={disabled}
          />
        </div>
        <button type="submit" className="submit-button" disabled={disabled}>
          {disabled ? 'Running Tests...' : `Run Tests`}
        </button>
      </div>
    </form>
  );
};

export default EndpointForm;

