import React, { useState } from 'react';
import { EndpointConfig } from '@delayr/shared';
import './CliExport.css';

interface CliExportProps {
  endpoints: EndpointConfig[];
  requestCount: number;
}

const CliExport: React.FC<CliExportProps> = ({ endpoints, requestCount }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const generateCliCommand = (includeAuth: boolean = false) => {
    const lines: string[] = ['delayr \\'];

    // Add URLs
    endpoints.forEach((ep) => {
      lines.push(`  -u "${ep.url}" \\`);
    });

    // Add request count
    lines.push(`  -c ${requestCount} \\`);

    // Add headers if needed
    if (includeAuth && endpoints.some((ep) => ep.headers)) {
      endpoints.forEach((ep) => {
        if (ep.headers) {
          Object.entries(ep.headers).forEach(([key, value]) => {
            lines.push(`  -H "${key}: ${value}" \\`);
          });
        }
      });
    }

    // Add default assertions
    lines.push(`  --assert-p95=500 \\`);
    lines.push(`  --assert-p99=1000`);

    return lines.join('\n');
  };

  const cliCommand = generateCliCommand();
  const cliCommandWithAuth = generateCliCommand(true);

  const handleCopy = async (command: string) => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setCopyError((err as Error)?.message || 'Failed to copy to clipboard');
      setTimeout(() => setCopyError(null), 4000);
    }
  };

  return (
    <div className="cli-export">
      <div className="cli-export-header">
        <h3>📱 Use in CI/CD Pipeline</h3>
        <p>Copy this command to automate latency testing</p>
      </div>

      <div className="cli-command-section">
        <div className="cli-label">Basic (without auth headers):</div>
        <div className="cli-code">
          <code>{cliCommand}</code>
          <button
            className="copy-cli-button"
            onClick={() => handleCopy(cliCommand)}
            aria-label="Copy CLI command"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
      </div>

      {endpoints.some((ep) => ep.headers) && (
        <div className="cli-command-section">
          <div className="cli-label">With auth headers:</div>
          <div className="cli-code">
            <code>{cliCommandWithAuth}</code>
            <button
              className="copy-cli-button"
              onClick={() => handleCopy(cliCommandWithAuth)}
              aria-label="Copy CLI command with headers"
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="cli-help">
        <strong>Next steps:</strong>
        <ul>
          <li>Paste into your CI/CD pipeline (GitHub Actions, GitLab CI, etc.)</li>
          <li>Tests will fail if p95 {'>'} 500ms or p99 {'>'} 1000ms</li>
          <li>Check documentation for more options: <code>delayr --help</code></li>
        </ul>
      </div>

      {copyError && <div className="copy-error">{copyError}</div>}
    </div>
  );
};

export default CliExport;
