import React, { useState } from 'react';
import { HttpMethod, EndpointConfig } from '../../../packages/shared/src';
import './EndpointForm.css';

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
    <form onSubmit={handleSubmit} className="endpoint-form" role="form" aria-labelledby="form-title">
      <div className="form-header">
        <h3 id="form-title">API Endpoints</h3>
        <button
          type="button"
          className="add-endpoint-button"
          onClick={addEndpoint}
          disabled={disabled}
          aria-label="Add new endpoint configuration"
          accessKey="a"
          title="Add Endpoint (Alt+A)"
        >
          + Add Endpoint
        </button>
      </div>

      {endpoints.map((endpoint, index) => (
        <div key={endpoint.id} className="endpoint-card" role="group" aria-labelledby={`endpoint-${endpoint.id}-label`}>
          <div className="endpoint-header">
            <span className="endpoint-number" id={`endpoint-${endpoint.id}-label`} aria-label={`Endpoint ${index + 1}`}>
              #{index + 1}
            </span>
            <select
              className="method-select"
              value={endpoint.method}
              onChange={(e) => updateEndpoint(endpoint.id, 'method', e.target.value as HttpMethod)}
              disabled={disabled}
              aria-label={`HTTP method for endpoint ${index + 1}`}
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
              aria-label={`URL for endpoint ${index + 1}`}
              aria-describedby={`url-help-${endpoint.id}`}
              required
            />
            <span id={`url-help-${endpoint.id}`} className="sr-only">
              Enter the full URL including protocol (http or https)
            </span>
            <input
              type="text"
              className="name-input"
              placeholder="Label (optional)"
              value={endpoint.name}
              onChange={(e) => updateEndpoint(endpoint.id, 'name', e.target.value)}
              disabled={disabled}
              aria-label={`Optional display name for endpoint ${index + 1}`}
            />
            {endpoints.length > 1 && (
              <button
                type="button"
                className="remove-button"
                onClick={() => removeEndpoint(endpoint.id)}
                disabled={disabled}
                aria-label={`Remove endpoint ${index + 1}: ${endpoint.name || endpoint.url || 'empty endpoint'}`}
                title="Remove this endpoint"
              >
                ×
              </button>
            )}
          </div>
          
          <button 
            type="button" 
            className="toggle-advanced"
            onClick={() => toggleAdvanced(endpoint.id)}
            aria-expanded={endpoint.showAdvanced}
            aria-controls={`advanced-${endpoint.id}`}
            aria-label={`${endpoint.showAdvanced ? 'Hide' : 'Show'} advanced options for endpoint ${index + 1}`}
          >
            <span aria-hidden="true">{endpoint.showAdvanced ? '▼' : '▶'}</span>
            Advanced Options
          </button>

          {endpoint.showAdvanced && (
            <div className="advanced-section" id={`advanced-${endpoint.id}`} role="region" aria-labelledby={`advanced-label-${endpoint.id}`}>
              {/* Headers Section */}
              <div className="headers-section">
                <label className="section-label" id={`headers-label-${endpoint.id}`}>Headers</label>
                <div className="headers-list" role="group" aria-labelledby={`headers-label-${endpoint.id}`}>
                  {endpoint.headers.map((header, hIndex) => (
                    <div key={hIndex} className="header-row">
                      <input
                        type="text"
                        className="header-key"
                        placeholder="Header name"
                        value={header.key}
                        onChange={(e) => updateHeader(endpoint.id, hIndex, 'key', e.target.value)}
                        disabled={disabled}
                        aria-label={`Header ${hIndex + 1} name for endpoint ${index + 1}`}
                      />
                      <input
                        type="text"
                        className="header-value"
                        placeholder="Header value"
                        value={header.value}
                        onChange={(e) => updateHeader(endpoint.id, hIndex, 'value', e.target.value)}
                        disabled={disabled}
                        aria-label={`Header ${hIndex + 1} value for endpoint ${index + 1}`}
                      />
                      <button
                        type="button"
                        className="remove-header-button"
                        onClick={() => removeHeader(endpoint.id, hIndex)}
                        disabled={disabled}
                        aria-label={`Remove header ${hIndex + 1}: ${header.key || 'empty header'}`}
                        title="Remove this header"
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

      {error && <div className="form-error" role="alert" aria-live="polite">{error}</div>}

      <div className="form-footer">
        <div className="request-count-section">
          <label htmlFor="request-count" className="request-count-label">Requests per endpoint:</label>
          <input
            id="request-count"
            type="number"
            className="request-count-input"
            min="1"
            max="200"
            value={requestCount}
            onChange={(e) => setRequestCount(parseInt(e.target.value) || 50)}
            disabled={disabled}
            aria-describedby="request-count-help"
          />
          <span id="request-count-help" className="sr-only">
            Number of requests to send to each endpoint, between 1 and 200
          </span>
        </div>
        <button 
          type="submit" 
          className="submit-button" 
          disabled={disabled}
          aria-describedby="submit-help"
          accessKey="s"
          title="Start Test (Alt+S)"
        >
          {disabled ? 'Running Tests...' : `Run Tests`}
        </button>
        <span id="submit-help" className="sr-only">
          Starts latency testing for all configured endpoints
        </span>
      </div>
    </form>
  );
};

export default EndpointForm;

