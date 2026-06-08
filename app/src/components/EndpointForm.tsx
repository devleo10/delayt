'use client';
import React, { useState } from 'react';
import {
  HttpMethod,
  EndpointConfig,
  checkTargetUrl,
  normalizeTargetUrl,
} from '@delayt/shared';
import { shouldBlockPrivateTargetsClient } from '@/lib/targetPolicy';
import {
  CLI_RECOMMENDED_REQUEST_COUNT,
  WEB_DEFAULT_REQUEST_COUNT,
  WEB_MAX_REQUEST_COUNT,
} from '@/lib/limits';

interface EndpointFormProps {
  onSubmit: (endpoints: EndpointConfig[], requestCount: number) => void;
  disabled: boolean;
  initialRequestCount?: number;
  onLoadExample?: () => void;
}

type ComposerTab = 'params' | 'body' | 'headers' | 'auth';

interface KeyValueItem {
  key: string;
  value: string;
}

interface EndpointItem {
  id: string;
  method: HttpMethod;
  url: string;
  name: string;
  body: string;
  bearerToken: string;
  queryParams: KeyValueItem[];
  headers: KeyValueItem[];
  activeTab: ComposerTab;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function emptyEndpoint(id: string, method: HttpMethod = 'GET'): EndpointItem {
  return {
    id,
    method,
    url: '',
    name: '',
    body: '',
    bearerToken: '',
    queryParams: [{ key: '', value: '' }],
    headers: [{ key: '', value: '' }],
    activeTab: 'params',
  };
}

function countFilled(items: KeyValueItem[]): number {
  return items.filter((i) => i.key.trim()).length;
}

function buildUrlWithParams(baseUrl: string, params: KeyValueItem[]): string {
  const url = new URL(normalizeTargetUrl(baseUrl));
  params
    .filter((p) => p.key.trim())
    .forEach((p) => url.searchParams.set(p.key.trim(), p.value.trim()));
  return url.toString();
}

function buildHeaders(
  bearerToken: string,
  customHeaders: KeyValueItem[]
): Record<string, string> | undefined {
  const headers: Record<string, string> = {};

  customHeaders
    .filter((h) => h.key.trim() && h.value.trim())
    .forEach((h) => {
      headers[h.key.trim()] = h.value.trim();
    });

  const token = bearerToken.trim();
  if (token && !headers.Authorization) {
    headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

const EndpointForm: React.FC<EndpointFormProps> = ({
  onSubmit,
  disabled,
  initialRequestCount = WEB_DEFAULT_REQUEST_COUNT,
  onLoadExample,
}) => {
  const [endpoints, setEndpoints] = useState<EndpointItem[]>([emptyEndpoint('1')]);
  const [error, setError] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(initialRequestCount);

  const addEndpoint = () => {
    setEndpoints([...endpoints, emptyEndpoint(Date.now().toString(), 'POST')]);
  };

  const removeEndpoint = (id: string) => {
    if (endpoints.length > 1) {
      setEndpoints(endpoints.filter((ep) => ep.id !== id));
    }
  };

  const updateEndpoint = (id: string, field: keyof EndpointItem, value: unknown) => {
    setEndpoints(endpoints.map((ep) => (ep.id === id ? { ...ep, [field]: value } : ep)));
  };

  const ensureTrailingEmptyRow = (items: KeyValueItem[]): KeyValueItem[] => {
    const last = items[items.length - 1];
    if (!last || last.key.trim() || last.value.trim()) {
      return [...items, { key: '', value: '' }];
    }
    return items;
  };

  const updateKeyValue = (
    endpointId: string,
    field: 'queryParams' | 'headers',
    index: number,
    keyField: 'key' | 'value',
    value: string
  ) => {
    setEndpoints(
      endpoints.map((ep) => {
        if (ep.id !== endpointId) return ep;
        const items = [...ep[field]];
        items[index] = { ...items[index], [keyField]: value };
        return { ...ep, [field]: ensureTrailingEmptyRow(items) };
      })
    );
  };

  const removeKeyValue = (
    endpointId: string,
    field: 'queryParams' | 'headers',
    index: number
  ) => {
    setEndpoints(
      endpoints.map((ep) => {
        if (ep.id !== endpointId) return ep;
        const next = ep[field].filter((_, i) => i !== index);
        return {
          ...ep,
          [field]: next.length === 0 ? [{ key: '', value: '' }] : ensureTrailingEmptyRow(next),
        };
      })
    );
  };

  const adjustCount = (delta: number) => {
    setRequestCount((c) => Math.min(WEB_MAX_REQUEST_COUNT, Math.max(1, c + delta)));
  };

  const needsBody = (method: HttpMethod) => ['POST', 'PUT', 'PATCH'].includes(method);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (requestCount < 1 || requestCount > WEB_MAX_REQUEST_COUNT) {
      setError(`Request count must be between 1 and ${WEB_MAX_REQUEST_COUNT} on the web app`);
      return;
    }

    const validatedEndpoints: EndpointConfig[] = [];

    for (const ep of endpoints) {
      if (!ep.url.trim()) {
        setError('Please enter a URL for all endpoints');
        return;
      }

      let finalUrl: string;
      try {
        finalUrl = buildUrlWithParams(ep.url.trim(), ep.queryParams);
      } catch {
        setError(`Invalid URL: ${ep.url}`);
        return;
      }

      const targetCheck = checkTargetUrl(finalUrl, {
        blockPrivateTargets: shouldBlockPrivateTargetsClient(),
      });
      if (!targetCheck.allowed) {
        setError(targetCheck.reason || `URL not allowed: ${ep.url}`);
        return;
      }

      const endpoint: EndpointConfig = { url: finalUrl, method: ep.method };

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

      const headers = buildHeaders(ep.bearerToken, ep.headers);
      if (headers) endpoint.headers = headers;

      validatedEndpoints.push(endpoint);
    }

    onSubmit(validatedEndpoints, requestCount);
  };

  const renderKvTable = (
    endpoint: EndpointItem,
    field: 'queryParams' | 'headers',
    listTitle: string
  ) => (
    <div className="composer-kv-panel">
      <div className="composer-kv-title">{listTitle}</div>
      <div className="composer-kv-table-wrap">
        <table className="composer-kv-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th className="composer-kv-actions-col" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {endpoint[field].map((item, index) => (
              <tr key={index}>
                <td>
                  <input
                    type="text"
                    className="composer-kv-input"
                    placeholder="Key"
                    value={item.key}
                    onChange={(e) =>
                      updateKeyValue(endpoint.id, field, index, 'key', e.target.value)
                    }
                    disabled={disabled}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="composer-kv-input"
                    placeholder="Value"
                    value={item.value}
                    onChange={(e) =>
                      updateKeyValue(endpoint.id, field, index, 'value', e.target.value)
                    }
                    disabled={disabled}
                  />
                </td>
                <td className="composer-kv-actions-col">
                  {endpoint[field].length > 1 && item.key.trim() && (
                    <button
                      type="button"
                      className="composer-kv-remove"
                      onClick={() => removeKeyValue(endpoint.id, field, index)}
                      disabled={disabled}
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEndpointTabs = (endpoint: EndpointItem, index: number) => {
    const paramCount = countFilled(endpoint.queryParams);
    const headerCount = countFilled(endpoint.headers);
    const hasAuth = !!endpoint.bearerToken.trim();
    const showBody = needsBody(endpoint.method);

    const tabs: { id: ComposerTab; label: string; count?: number }[] = [
      { id: 'params', label: 'Parameters', count: paramCount || undefined },
      ...(showBody ? [{ id: 'body' as const, label: 'Body' }] : []),
      { id: 'headers', label: 'Headers', count: headerCount || undefined },
      { id: 'auth', label: 'Authorization', count: hasAuth ? 1 : undefined },
    ];

    return (
      <div className="composer-tabs-panel">
        <div className="composer-tabs" role="tablist" aria-label={`Request options ${index + 1}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={endpoint.activeTab === tab.id}
              className={`composer-tab ${endpoint.activeTab === tab.id ? 'active' : ''}`}
              onClick={() => updateEndpoint(endpoint.id, 'activeTab', tab.id)}
              disabled={disabled}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="composer-tab-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="composer-tab-content">
          {endpoint.activeTab === 'params' && renderKvTable(endpoint, 'queryParams', 'Parameter list')}

          {endpoint.activeTab === 'body' && showBody && (
            <div className="composer-body-panel">
              <div className="composer-kv-title">Request body</div>
              <textarea
                className="composer-textarea"
                placeholder='{"key": "value"}'
                value={endpoint.body}
                onChange={(e) => updateEndpoint(endpoint.id, 'body', e.target.value)}
                disabled={disabled}
                rows={8}
              />
              <p className="composer-field-hint">JSON body for {endpoint.method} requests.</p>
            </div>
          )}

          {endpoint.activeTab === 'headers' && renderKvTable(endpoint, 'headers', 'Header list')}

          {endpoint.activeTab === 'auth' && (
            <div className="composer-auth-panel">
              <div className="composer-kv-title">Bearer token</div>
              <input
                type="password"
                className="composer-auth-input"
                placeholder="Paste your token"
                value={endpoint.bearerToken}
                onChange={(e) => updateEndpoint(endpoint.id, 'bearerToken', e.target.value)}
                disabled={disabled}
                autoComplete="off"
              />
              <p className="composer-field-hint">
                Sent as <code>Authorization: Bearer …</code>. The Bearer prefix is added
                automatically if you omit it.
              </p>
            </div>
          )}
        </div>

        <div className="composer-label-row">
          <label className="composer-inline-label" htmlFor={`label-${endpoint.id}`}>
            Label (optional)
          </label>
          <input
            id={`label-${endpoint.id}`}
            type="text"
            className="composer-label-input"
            placeholder="Friendly name in results"
            value={endpoint.name}
            onChange={(e) => updateEndpoint(endpoint.id, 'name', e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="composer" role="form" aria-label="Endpoint configuration">
      <div className="composer-rows">
        {endpoints.map((endpoint, index) => (
          <div key={endpoint.id} className="composer-endpoint">
            <div className={`composer-row method-${endpoint.method.toLowerCase()}`}>
              <select
                className="composer-method"
                value={endpoint.method}
                onChange={(e) => {
                  const method = e.target.value as HttpMethod;
                  setEndpoints(
                    endpoints.map((ep) =>
                      ep.id === endpoint.id
                        ? {
                            ...ep,
                            method,
                            activeTab: needsBody(method)
                              ? ep.activeTab
                              : ep.activeTab === 'body'
                                ? 'params'
                                : ep.activeTab,
                          }
                        : ep
                    )
                  );
                }}
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
                className="composer-remove"
                onClick={() => removeEndpoint(endpoint.id)}
                disabled={disabled || endpoints.length === 1}
                aria-label={`Remove endpoint ${index + 1}`}
                title="Remove endpoint"
              >
                ×
              </button>
            </div>

            {renderEndpointTabs(endpoint, index)}
          </div>
        ))}
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
              max={WEB_MAX_REQUEST_COUNT}
              value={requestCount}
              onChange={(e) =>
                setRequestCount(
                  Math.min(
                    WEB_MAX_REQUEST_COUNT,
                    Math.max(1, parseInt(e.target.value, 10) || 1)
                  )
                )
              }
              disabled={disabled}
              aria-label="Requests per endpoint"
            />
            <button
              type="button"
              className="composer-stepper-btn"
              onClick={() => adjustCount(-5)}
              disabled={disabled}
              aria-label="Decrease requests"
            >
              −
            </button>
            <button
              type="button"
              className="composer-stepper-btn"
              onClick={() => adjustCount(5)}
              disabled={disabled}
              aria-label="Increase requests"
            >
              +
            </button>
          </div>

          <p className="composer-web-limit-hint">
            Web runs up to {WEB_MAX_REQUEST_COUNT} requests. For {CLI_RECOMMENDED_REQUEST_COUNT}+,
            use{' '}
            <code>npx @delayt/cli run -u &lt;url&gt; -n {CLI_RECOMMENDED_REQUEST_COUNT}</code>
          </p>
        </div>

        <button type="submit" className="composer-run" disabled={disabled}>
          {disabled ? 'Running…' : 'Run tests'}
        </button>
      </div>
    </form>
  );
};

export default EndpointForm;
