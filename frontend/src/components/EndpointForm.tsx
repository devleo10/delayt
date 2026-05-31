import React, { useState } from 'react';
import { HttpMethod, EndpointConfig } from '@delayt/shared';
import './EndpointForm.css';

interface EndpointFormProps {
  onSubmit: (endpoints: EndpointConfig[], requestCount: number) => void;
  disabled: boolean;
  initialRequestCount?: number;
  onLoadExample?: () => void;
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

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const EndpointForm: React.FC<EndpointFormProps> = ({
  onSubmit,
  disabled,
  initialRequestCount = 50,
  onLoadExample,
}) => {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([
    { id: '1', method: 'GET', url: '', name: '', body: '', headers: [], showAdvanced: false },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(initialRequestCount);

  const addEndpoint = () => {
    setEndpoints([
      ...endpoints,
      {
        id: Date.now().toString(),
        method: 'POST',
        url: '',
        name: '',
        body: '',
        headers: [],
        showAdvanced: false,
      },
    ]);
  };

  const removeEndpoint = (id: string) => {
    if (endpoints.length > 1) {
      setEndpoints(endpoints.filter((ep) => ep.id !== id));
    }
  };

  const updateEndpoint = (id: string, field: keyof EndpointItem, value: unknown) => {
    setEndpoints(endpoints.map((ep) => (ep.id === id ? { ...ep, [field]: value } : ep)));
  };

  const addHeader = (endpointId: string) => {
    setEndpoints(
      endpoints.map((ep) =>
        ep.id === endpointId ? { ...ep, headers: [...ep.headers, { key: '', value: '' }] } : ep
      )
    );
  };

  const updateHeader = (
    endpointId: string,
    headerIndex: number,
    field: 'key' | 'value',
    value: string
  ) => {
    setEndpoints(
      endpoints.map((ep) => {
        if (ep.id === endpointId) {
          const newHeaders = [...ep.headers];
          newHeaders[headerIndex] = { ...newHeaders[headerIndex], [field]: value };
          return { ...ep, headers: newHeaders };
        }
        return ep;
      })
    );
  };

  const removeHeader = (endpointId: string, headerIndex: number) => {
    setEndpoints(
      endpoints.map((ep) => {
        if (ep.id === endpointId) {
          return { ...ep, headers: ep.headers.filter((_, i) => i !== headerIndex) };
        }
        return ep;
      })
    );
  };

  const toggleAdvanced = (id: string) => {
    setEndpoints(
      endpoints.map((ep) => (ep.id === id ? { ...ep, showAdvanced: !ep.showAdvanced } : ep))
    );
  };

  const adjustCount = (delta: number) => {
    setRequestCount((c) => Math.min(200, Math.max(1, c + delta)));
  };

  const needsBody = (method: HttpMethod) => ['POST', 'PUT', 'PATCH'].includes(method);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requestCount < 1 || requestCount > 200) {
      setError('Request count must be between 1 and 200');
      return;
    }

    const validatedEndpoints: EndpointConfig[] = [];

    for (const ep of endpoints) {
      if (!ep.url.trim()) {
        setError('Please enter a URL for all endpoints');
        return;
      }

      try {
        new URL(ep.url);
      } catch {
        setError(`Invalid URL: ${ep.url}`);
        return;
      }

      const endpoint: EndpointConfig = { url: ep.url.trim(), method: ep.method };

      if (ep.name.trim()) endpoint.name = ep.name.trim();

      if (needsBody(ep.method) && ep.body.trim()) {
        try {
          endpoint.payload = JSON.parse(ep.body);
        } catch (err) {
          setError(
            `Invalid JSON body for ${ep.name || ep.url}: ${
              err instanceof Error ? err.message : 'Invalid JSON'
            }`
          );
          return;
        }
      }

      const validHeaders = ep.headers.filter((h) => h.key.trim() && h.value.trim());
      if (validHeaders.length > 0) {
        endpoint.headers = validHeaders.reduce((acc, h) => {
          acc[h.key.trim()] = h.value.trim();
          return acc;
        }, {} as Record<string, string>);
      }

      validatedEndpoints.push(endpoint);
    }

    onSubmit(validatedEndpoints, requestCount);
  };

  return (
    <form onSubmit={handleSubmit} className="composer" role="form" aria-label="Endpoint configuration">
      <div className="composer-rows">
        {endpoints.map((endpoint, index) => {
          const headerCount = endpoint.headers.filter((h) => h.key.trim()).length;
          return (
            <div key={endpoint.id} className="composer-row-wrap">
              <div className={`composer-row method-${endpoint.method.toLowerCase()}`}>
                <select
                  className="composer-method"
                  value={endpoint.method}
                  onChange={(e) =>
                    updateEndpoint(endpoint.id, 'method', e.target.value as HttpMethod)
                  }
                  disabled={disabled}
                  aria-label={`HTTP method for endpoint ${index + 1}`}
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  className="composer-url"
                  placeholder="https://api.example.com/endpoint"
                  value={endpoint.url}
                  onChange={(e) => updateEndpoint(endpoint.id, 'url', e.target.value)}
                  disabled={disabled}
                  aria-label={`URL for endpoint ${index + 1}`}
                  required
                />

                <button
                  type="button"
                  className={`composer-hdr ${endpoint.showAdvanced ? 'active' : ''}`}
                  onClick={() => toggleAdvanced(endpoint.id)}
                  disabled={disabled}
                  aria-expanded={endpoint.showAdvanced}
                  title="Headers, body and label"
                >
                  HDR{headerCount > 0 ? ` ${headerCount}` : ''}
                </button>

                <button
                  type="button"
                  className="composer-remove"
                  onClick={() => removeEndpoint(endpoint.id)}
                  disabled={disabled || endpoints.length === 1}
                  aria-label={`Remove endpoint ${index + 1}`}
                  title="Remove endpoint"
                >
                  ×
                </button>
              </div>

              {endpoint.showAdvanced && (
                <div className="composer-advanced">
                  <div className="composer-field">
                    <label className="composer-field-label">Label (optional)</label>
                    <input
                      type="text"
                      className="composer-text"
                      placeholder="Friendly name"
                      value={endpoint.name}
                      onChange={(e) => updateEndpoint(endpoint.id, 'name', e.target.value)}
                      disabled={disabled}
                    />
                  </div>

                  <div className="composer-field">
                    <label className="composer-field-label">Headers</label>
                    {endpoint.headers.map((header, hIndex) => (
                      <div key={hIndex} className="composer-header-row">
                        <input
                          type="text"
                          className="composer-text"
                          placeholder="Header name"
                          value={header.key}
                          onChange={(e) =>
                            updateHeader(endpoint.id, hIndex, 'key', e.target.value)
                          }
                          disabled={disabled}
                        />
                        <input
                          type="text"
                          className="composer-text"
                          placeholder="Header value"
                          value={header.value}
                          onChange={(e) =>
                            updateHeader(endpoint.id, hIndex, 'value', e.target.value)
                          }
                          disabled={disabled}
                        />
                        <button
                          type="button"
                          className="composer-remove small"
                          onClick={() => removeHeader(endpoint.id, hIndex)}
                          disabled={disabled}
                          aria-label="Remove header"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="composer-ghost"
                      onClick={() => addHeader(endpoint.id)}
                      disabled={disabled}
                    >
                      + Add header
                    </button>
                  </div>

                  {needsBody(endpoint.method) && (
                    <div className="composer-field">
                      <label className="composer-field-label">Request body (JSON)</label>
                      <textarea
                        className="composer-textarea"
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
            </div>
          );
        })}
      </div>

      {error && (
        <div className="composer-error" role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <div className="composer-footer">
        <div className="composer-footer-left">
          <button
            type="button"
            className="composer-ghost"
            onClick={addEndpoint}
            disabled={disabled}
          >
            + add endpoint
          </button>

          {onLoadExample && (
            <button
              type="button"
              className="composer-ghost"
              onClick={onLoadExample}
              disabled={disabled}
              title="Try with a public test API"
            >
              load example
            </button>
          )}

          <div className="composer-stepper" role="group" aria-label="Requests per endpoint">
            <span className="composer-stepper-label">Requests</span>
            <input
              type="number"
              className="composer-stepper-input"
              min={1}
              max={200}
              value={requestCount}
              onChange={(e) =>
                setRequestCount(Math.min(200, Math.max(1, parseInt(e.target.value) || 1)))
              }
              disabled={disabled}
              aria-label="Requests per endpoint"
            />
            <button
              type="button"
              className="composer-stepper-btn"
              onClick={() => adjustCount(-10)}
              disabled={disabled}
              aria-label="Decrease requests"
            >
              −
            </button>
            <button
              type="button"
              className="composer-stepper-btn"
              onClick={() => adjustCount(10)}
              disabled={disabled}
              aria-label="Increase requests"
            >
              +
            </button>
          </div>
        </div>

        <button type="submit" className="composer-run" disabled={disabled}>
          {disabled ? 'Running…' : 'Run tests'} <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
};

export default EndpointForm;
