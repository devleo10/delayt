'use client';
import React, { useState } from 'react';
import { EndpointConfig } from '@delayt/shared';
import { CLI_RECOMMENDED_REQUEST_COUNT, WEB_MAX_REQUEST_COUNT } from '@/lib/limits';

interface CliExportProps {
  endpoints: EndpointConfig[];
  requestCount: number;
}

const CliExport: React.FC<CliExportProps> = ({ endpoints, requestCount }) => {
  const [copied, setCopied] = useState<'web' | 'full' | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const fullRunCount = Math.max(requestCount, CLI_RECOMMENDED_REQUEST_COUNT);

  const generateCliCommand = (count: number, includeAuth: boolean = false) => {
    const lines: string[] = ['npx @delayt/cli run \\'];

    endpoints.forEach((ep) => {
      lines.push(`  -u "${ep.url}" \\`);
    });

    lines.push(`  -n ${count}`);

    if (includeAuth && endpoints.some((ep) => ep.headers)) {
      lines[lines.length - 1] += ' \\';
      endpoints.forEach((ep) => {
        if (ep.headers) {
          Object.entries(ep.headers).forEach(([key, value]) => {
            lines.push(`  -H "${key}: ${value}" \\`);
          });
        }
      });
      lines[lines.length - 1] = lines[lines.length - 1].replace(/ \\$/, '');
    }

    return lines.join('\n');
  };

  const webCommand = generateCliCommand(requestCount);
  const fullCommand = generateCliCommand(fullRunCount);
  const fullCommandWithAuth = generateCliCommand(fullRunCount, true);

  const handleCopy = async (command: string, variant: 'web' | 'full') => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(command);
      setCopied(variant);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      setCopyError((err as Error)?.message || 'Failed to copy to clipboard');
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  const showFullRunSection = fullRunCount > requestCount;

  return (
    <div className="cli-export">
      <div className="cli-export-header">
        <h3>// run in terminal</h3>
        <p>
          The web app caps at {WEB_MAX_REQUEST_COUNT} requests per endpoint. Use the CLI for{' '}
          {CLI_RECOMMENDED_REQUEST_COUNT}–200 requests and CI gates.
        </p>
      </div>

      {showFullRunSection && (
        <div className="cli-command-section">
          <div className="cli-label">
            full sample · {CLI_RECOMMENDED_REQUEST_COUNT} requests
          </div>
          <div className="cli-code">
            <code>{fullCommand}</code>
            <button
              className="copy-cli-button"
              onClick={() => handleCopy(fullCommand, 'full')}
              aria-label="Copy full CLI command"
            >
              {copied === 'full' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="cli-command-section">
        <div className="cli-label">
          {showFullRunSection
            ? `match web run · ${requestCount} requests`
            : 'command'}
        </div>
        <div className="cli-code">
          <code>{webCommand}</code>
          <button
            className="copy-cli-button"
            onClick={() => handleCopy(webCommand, 'web')}
            aria-label="Copy CLI command"
          >
            {copied === 'web' ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {endpoints.some((ep) => ep.headers) && (
        <div className="cli-command-section">
          <div className="cli-label">with auth · {fullRunCount} requests</div>
          <div className="cli-code">
            <code>{fullCommandWithAuth}</code>
            <button
              className="copy-cli-button"
              onClick={() => handleCopy(fullCommandWithAuth, 'full')}
              aria-label="Copy CLI command with headers"
            >
              {copied === 'full' ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="cli-help">
        <div className="cli-help-head">// why cli</div>
        <ul>
          <li>
            Run {CLI_RECOMMENDED_REQUEST_COUNT}–200 requests for stabler p95/p99 estimates
          </li>
          <li>Paste into CI/CD (GitHub Actions, GitLab CI, etc.)</li>
          <li>
            Add your own gates: <code>--assert-p95=500</code> (exit 1 only when asserts fail)
          </li>
          {!endpoints.some((ep) => ep.headers) && (
            <li>
              Private APIs need <code>-H</code> flags or the web Authorization tab before CI is
              meaningful.
            </li>
          )}
          <li>
            Install globally: <code>npm i -g @delayt/cli</code> then <code>delayt run ...</code>
          </li>
        </ul>
      </div>

      {copyError && <div className="copy-error">{copyError}</div>}
    </div>
  );
};

export default CliExport;
