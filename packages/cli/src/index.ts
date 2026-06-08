#!/usr/bin/env node
/**
 * Delayt CLI - API Latency Testing for CI/CD
 *
 * Usage:
 *   npx @delayt/cli run -u https://api.example.com/health
 *   npx @delayt/cli -u https://api.example.com --assert-p95=200
 */

import axios, { AxiosRequestConfig } from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  EndpointConfig,
  AnalyticsResult,
  HttpMethod,
  formatLatency,
  buildAnalyticsResult,
  CLIOptions,
  AssertionResult,
} from '@delayt/shared';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const REQUEST_TIMEOUT_MS = 30000;

function getVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
    ) as { version?: string };
    return pkg.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const VERSION = getVersion();

const DEFAULT_DOCS_HOST = 'https://github.com/devleo10/delayt';

function docsLink(anchor: string): string {
  const base = process.env.DELAYT_DOCS_URL?.replace(/\/$/, '');
  if (base) {
    return base.includes('#') ? base : `${base}/docs#${anchor}`;
  }
  return `/docs#${anchor}`;
}

function writeProgressLine(text: string): void {
  const width = process.stdout.columns || 100;
  process.stdout.write(`\r${text.padEnd(width, ' ')}`);
}

function normalizeArgs(argv: string[]): string[] {
  const args = [...argv];

  if (args[0] === 'run') {
    args.shift();
  }

  return args;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    urls: [],
    method: 'GET',
    count: 50,
    output: 'table',
    quiet: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    if (arg === '--url' || arg === '-u') {
      options.urls!.push(nextArg);
      i++;
    } else if (arg === '--method' || arg === '-m') {
      options.method = nextArg.toUpperCase() as HttpMethod;
      i++;
    } else if (arg === '--count' || arg === '-c' || arg === '--n' || arg === '-n') {
      options.count = parseInt(nextArg, 10);
      i++;
    } else if (arg === '--header' || arg === '-H') {
      const [key, ...valueParts] = nextArg.split(':');
      const value = valueParts.join(':').trim();
      options.headers = options.headers || {};
      options.headers[key.trim()] = value;
      i++;
    } else if (arg === '--data' || arg === '-d') {
      try {
        options.payload = JSON.parse(nextArg);
      } catch {
        options.payload = { data: nextArg };
      }
      i++;
    } else if (arg.startsWith('--assert-p50=')) {
      options.assertP50 = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--assert-p95=')) {
      options.assertP95 = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--assert-p99=')) {
      options.assertP99 = parseInt(arg.split('=')[1], 10);
    } else if (arg === '--output' || arg === '-o') {
      options.output = nextArg as 'json' | 'table' | 'markdown';
      i++;
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--share') {
      options.share = true;
    } else if (arg === '--share-url') {
      options.shareUrl = nextArg;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      console.log(`delayt v${VERSION}`);
      process.exit(0);
    }
  }

  if (options.urls!.length === 0 && args.length > 0 && !args[0].startsWith('-')) {
    options.urls!.push(args[0]);
  }

  return options;
}

function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}Delayt CLI${colors.reset} v${VERSION} - API Latency Testing for CI/CD

${colors.bold}USAGE:${colors.reset}
  delayt run [options]
  delayt [options] [url]
  delayt -u <url> [--url <url2>] [options]

${colors.bold}OPTIONS:${colors.reset}
  -u, --url <url>        URL to test (can be specified multiple times)
  -m, --method <method>  HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET)
  -c, --count <n>        Number of requests per endpoint (default: 50)
  -n, --n <n>            Alias for --count
  -H, --header <header>  Add header (format: "Name: Value")
  -d, --data <json>      Request body for POST/PUT/PATCH
  -o, --output <format>  Output format: table, json, markdown (default: table)
  -q, --quiet            Suppress progress output
  --share                Upload results to Delayt dashboard (/r/slug)
  --share-url <url>      Dashboard base URL (or set DELAYT_SHARE_URL)

${colors.bold}ASSERTIONS:${colors.reset}
  --assert-p50=<ms>      Fail if p50 latency exceeds threshold
  --assert-p95=<ms>      Fail if p95 latency exceeds threshold
  --assert-p99=<ms>      Fail if p99 latency exceeds threshold

${colors.bold}EXAMPLES:${colors.reset}
  ${colors.gray}# Landing page style${colors.reset}
  delayt run -u https://api.example.com/health -n 50

  ${colors.gray}# CI gate${colors.reset}
  delayt -u https://staging.api.com --assert-p95=500 --output json

  ${colors.gray}# POST with auth${colors.reset}
  delayt -u https://api.example.com/data -m POST \\
    -H "Authorization: Bearer token" \\
    -d '{"key": "value"}'

${colors.bold}EXIT CODES:${colors.reset}
  0  All tests passed (or no assertions specified)
  1  Assertion failed (latency threshold exceeded)
  2  Error (network, configuration, etc.)

${colors.bold}DOCS:${colors.reset}
  Recipes (request count, auth, params, asserts): ${docsLink('cli')}
  Set ${colors.gray}DELAYT_DOCS_URL=https://yourdomain.dev${colors.reset} for full doc URLs.
`);
}

function getRequestSizeBytes(endpoint: EndpointConfig): number {
  if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.payload) {
    return Buffer.byteLength(JSON.stringify(endpoint.payload), 'utf8');
  }
  return 0;
}

async function measureRequest(endpoint: EndpointConfig): Promise<{
  latency: number;
  status: number;
  requestSizeBytes: number;
  responseSizeBytes: number;
  error?: string;
}> {
  const startTime = process.hrtime.bigint();
  const requestSizeBytes = getRequestSizeBytes(endpoint);
  let responseSizeBytes = 0;

  try {
    const config: AxiosRequestConfig = {
      method: endpoint.method,
      url: endpoint.url,
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
      headers: endpoint.headers,
    };

    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.payload) {
      config.data = endpoint.payload;
      config.headers = {
        ...(config.headers || {}),
        'Content-Type': 'application/json',
      };
    }

    const response = await axios(config);
    const endTime = process.hrtime.bigint();
    const latency = Number(endTime - startTime) / 1_000_000;

    if (response.data) {
      if (typeof response.data === 'string') {
        responseSizeBytes = Buffer.byteLength(response.data, 'utf8');
      } else {
        responseSizeBytes = Buffer.byteLength(JSON.stringify(response.data), 'utf8');
      }
    }

    return {
      latency,
      status: response.status,
      requestSizeBytes,
      responseSizeBytes,
    };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const latency = Number(endTime - startTime) / 1_000_000;

    return {
      latency,
      status: 0,
      requestSizeBytes,
      responseSizeBytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface ImportRequestRow {
  endpoint: string;
  method: string;
  latency_ms: number;
  request_size_bytes: number;
  response_size_bytes: number;
  status_code: number;
  error_message?: string;
}

interface RunTestsOutput {
  result: AnalyticsResult;
  samples: ImportRequestRow[];
}

async function uploadRun(
  shareBase: string,
  endpoints: EndpointConfig[],
  requestCount: number,
  samples: ImportRequestRow[]
): Promise<{ slug: string; shareUrl: string }> {
  const base = shareBase.replace(/\/$/, '');
  const response = await axios.post(`${base}/api/runs/import`, {
    endpoints,
    requestCount,
    requests: samples,
  });

  if (!response.data?.success || !response.data?.slug) {
    throw new Error(response.data?.message || 'Import failed');
  }

  const slug = response.data.slug as string;
  const sharePath = response.data.shareUrl || `/r/${slug}`;
  const shareUrl = sharePath.startsWith('http') ? sharePath : `${base}${sharePath}`;

  return { slug, shareUrl };
}

async function runTests(
  endpoint: EndpointConfig,
  count: number,
  quiet: boolean
): Promise<RunTestsOutput> {
  const samples: ImportRequestRow[] = [];

  for (let i = 1; i <= count; i++) {
    const result = await measureRequest(endpoint);

    samples.push({
      endpoint: endpoint.url,
      method: endpoint.method,
      latency_ms: result.latency,
      request_size_bytes: result.requestSizeBytes,
      response_size_bytes: result.responseSizeBytes,
      status_code: result.status,
      error_message: result.error,
    });

    if (!quiet) {
      const progress = Math.round((i / count) * 100);
      const statusColor =
        result.status >= 200 && result.status < 300 ? colors.green : colors.red;
      writeProgressLine(
        `  [${progress.toString().padStart(3)}%] ${endpoint.method} ${endpoint.url} - ` +
          `${statusColor}${result.status}${colors.reset} - ${formatLatency(result.latency)}`
      );
    }
  }

  if (!quiet) {
    process.stdout.write('\n');
  }

  const analyticsSamples = samples.map((s) => ({
    latencyMs: s.latency_ms,
    statusCode: s.status_code,
    requestSizeBytes: s.request_size_bytes,
  }));

  return {
    result: buildAnalyticsResult(endpoint.url, endpoint.method, analyticsSamples),
    samples,
  };
}

function checkAssertions(results: AnalyticsResult[], options: CLIOptions): AssertionResult[] {
  const assertions: AssertionResult[] = [];

  for (const result of results) {
    if (options.assertP50 !== undefined) {
      assertions.push({
        type: 'p50',
        endpoint: result.endpoint,
        expected: options.assertP50,
        actual: result.p50,
        passed: result.p50 <= options.assertP50,
      });
    }

    if (options.assertP95 !== undefined) {
      assertions.push({
        type: 'p95',
        endpoint: result.endpoint,
        expected: options.assertP95,
        actual: result.p95,
        passed: result.p95 <= options.assertP95,
      });
    }

    if (options.assertP99 !== undefined) {
      assertions.push({
        type: 'p99',
        endpoint: result.endpoint,
        expected: options.assertP99,
        actual: result.p99,
        passed: result.p99 <= options.assertP99,
      });
    }
  }

  return assertions;
}

function printRunSummary(result: AnalyticsResult, requestCount: number): void {
  const spread = result.p50 > 0 ? result.p95 / result.p50 : 1;
  const tailNote =
    spread >= 3
      ? `${colors.yellow}wide p50→p95 spread (${spread.toFixed(1)}×) — tail is slow, median is not${colors.reset}`
      : result.p95 < 200
        ? `${colors.green}p95 under 200ms${colors.reset}`
        : `${colors.yellow}p95 ${formatLatency(result.p95)} — watch regressions${colors.reset}`;

  console.log(`${colors.bold}// summary${colors.reset} ${result.method} ${result.endpoint}`);
  console.log(
    `  p50 ${formatLatency(result.p50)} · p95 ${formatLatency(result.p95)} · p99 ${formatLatency(result.p99)} · ` +
      `${result.success_rate.toFixed(0)}% 2xx · min ${formatLatency(result.min)} · max ${formatLatency(result.max)}`
  );
  console.log(`  ${tailNote}`);

  if (requestCount < 30) {
    console.log(
      `  ${colors.gray}n=${requestCount} — small sample; use -n 50 for stabler p95 (${docsLink('cli-count')})${colors.reset}`
    );
  }
  console.log('');
}

function printHints(
  options: CLIOptions,
  results: AnalyticsResult[],
  assertions: AssertionResult[],
  allPassed: boolean
): void {
  const hints: string[] = [];
  const failed = assertions.filter((a) => !a.passed);

  if (failed.length > 0) {
    const failedLatency = failed.some((a) => a.type === 'p95' || a.type === 'p99');
    if (failedLatency) {
      hints.push(
        `assertions failed — adjust --assert-p95/--assert-p99 or fix tail latency (${docsLink('cli-assert')})`
      );
    }
    const worst = results.reduce((a, b) => (b.p95 > a.p95 ? b : a), results[0]);
    if (worst && worst.p50 > 0 && worst.p95 / worst.p50 >= 3) {
      hints.push('slow tail vs median — profile worst requests, not just average');
    }
  }

  if ((options.count ?? 50) < 30 && (options.assertP95 || options.assertP99)) {
    hints.push(`low -n with strict asserts — try -n 50 (${docsLink('cli-count')})`);
  }

  if (!options.headers && results.some((r) => r.success_rate < 95)) {
    hints.push(`low 2xx rate — add auth/headers with -H (${docsLink('cli-auth')})`);
  }

  if (!allPassed && hints.length === 0) {
    hints.push(`recipes: ${docsLink('cli')}`);
  }

  console.log(`${colors.gray}→ help: delayt --help${colors.reset}`);
  for (const hint of hints.slice(0, 3)) {
    console.log(`${colors.gray}→ ${hint}${colors.reset}`);
  }
  const docTarget = process.env.DELAYT_DOCS_URL
    ? docsLink('cli')
    : `${docsLink('cli')} (set DELAYT_DOCS_URL=https://yourdomain.dev)`;
  console.log(`${colors.gray}→ docs: ${docTarget}${colors.reset}`);
  console.log('');
}

function outputTable(results: AnalyticsResult[]) {
  console.log('\n' + colors.bold + 'Results' + colors.reset + '\n');

  console.log(
    colors.gray +
      'Endpoint'.padEnd(50) +
      'Method'.padEnd(8) +
      'p50'.padStart(12) +
      'p95'.padStart(12) +
      'p99'.padStart(12) +
      'Success'.padStart(10) +
      colors.reset
  );
  console.log(colors.gray + '─'.repeat(104) + colors.reset);

  for (const r of results) {
    const p95Color = r.p95 < 100 ? colors.green : r.p95 < 500 ? colors.yellow : colors.red;
    const successColor =
      r.success_rate >= 99 ? colors.green : r.success_rate >= 95 ? colors.yellow : colors.red;

    console.log(
      r.endpoint.substring(0, 48).padEnd(50) +
        r.method.padEnd(8) +
        formatLatency(r.p50).padStart(12) +
        p95Color +
        formatLatency(r.p95).padStart(12) +
        colors.reset +
        formatLatency(r.p99).padStart(12) +
        successColor +
        `${r.success_rate.toFixed(1)}%`.padStart(10) +
        colors.reset
    );
  }

  console.log('');
}

function outputJson(results: AnalyticsResult[], assertions: AssertionResult[]) {
  console.log(JSON.stringify({ results, assertions }, null, 2));
}

function outputMarkdown(results: AnalyticsResult[]) {
  console.log('\n## API Latency Results\n');
  console.log('| Endpoint | Method | p50 | p95 | p99 | Success |');
  console.log('|----------|--------|-----|-----|-----|---------|');

  for (const r of results) {
    console.log(
      `| ${r.endpoint} | ${r.method} | ${formatLatency(r.p50)} | ${formatLatency(r.p95)} | ${formatLatency(r.p99)} | ${r.success_rate.toFixed(1)}% |`
    );
  }
  console.log('');
}

async function main(): Promise<void> {
  const args = normalizeArgs(process.argv.slice(2));

  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.urls || options.urls.length === 0) {
    console.error(colors.red + 'Error: No URLs specified. Use -u <url> or pass a URL.' + colors.reset);
    process.exit(2);
  }

  if (!options.count || options.count < 1 || options.count > 200) {
    console.error(colors.red + 'Error: Request count must be between 1 and 200.' + colors.reset);
    process.exit(2);
  }

  for (const url of options.urls) {
    try {
      new URL(url);
    } catch {
      console.error(colors.red + `Error: Invalid URL: ${url}` + colors.reset);
      process.exit(2);
    }
  }

  const endpoints: EndpointConfig[] = options.urls.map((url) => ({
    url,
    method: options.method!,
    headers: options.headers,
    payload: options.payload,
  }));

  if (!options.quiet) {
    console.log(
      `\n${colors.bold}${colors.cyan}Delayt${colors.reset} v${VERSION} - Running ${options.count} requests per endpoint\n`
    );
  }

  const results: AnalyticsResult[] = [];
  const allSamples: ImportRequestRow[] = [];

  for (const endpoint of endpoints) {
    try {
      const { result, samples } = await runTests(endpoint, options.count!, options.quiet!);
      results.push(result);
      allSamples.push(...samples);
      if (!options.quiet && options.output !== 'json') {
        printRunSummary(result, options.count!);
      }
    } catch (error) {
      console.error(colors.red + `Error testing ${endpoint.url}: ${error}` + colors.reset);
      process.exit(2);
    }
  }

  if (options.share) {
    const shareBase =
      options.shareUrl || process.env.DELAYT_SHARE_URL || process.env.DELAYT_DOCS_URL;

    if (!shareBase) {
      console.error(
        colors.red +
          'Error: --share requires --share-url or DELAYT_SHARE_URL (e.g. https://yourdomain.dev)' +
          colors.reset
      );
      process.exit(2);
    }

    try {
      const { shareUrl } = await uploadRun(
        shareBase,
        endpoints,
        options.count!,
        allSamples
      );
      if (!options.quiet) {
        console.log(`${colors.bold}// shared${colors.reset}`);
        console.log(`  ${shareUrl}`);
        console.log('');
      }
    } catch (error) {
      console.error(colors.red + `Share upload failed: ${error}` + colors.reset);
      process.exit(2);
    }
  }

  const assertions = checkAssertions(results, options);
  const allPassed = assertions.length === 0 || assertions.every((a) => a.passed);

  if (options.output === 'json') {
    outputJson(results, assertions);
  } else if (options.output === 'markdown') {
    outputMarkdown(results);
  } else {
    outputTable(results);
  }

  if (assertions.length > 0 && options.output !== 'json') {
    console.log(colors.bold + 'Assertions' + colors.reset + '\n');

    for (const a of assertions) {
      const icon = a.passed ? colors.green + 'PASS' : colors.red + 'FAIL';
      const comparison = a.passed ? '≤' : '>';
      console.log(
        `  ${icon}${colors.reset} ${a.type} for ${a.endpoint}: ` +
          `${formatLatency(a.actual)} ${comparison} ${formatLatency(a.expected)}`
      );
    }
    console.log('');
  }

  if (!allPassed) {
    if (!options.quiet && options.output !== 'json') {
      console.log(colors.red + colors.bold + 'Assertions failed.' + colors.reset);
      printHints(options, results, assertions, allPassed);
    }
    process.exit(1);
  } else if (assertions.length > 0 && !options.quiet && options.output !== 'json') {
    console.log(colors.green + colors.bold + 'All assertions passed.' + colors.reset);
  }

  if (!options.quiet && options.output !== 'json') {
    printHints(options, results, assertions, allPassed);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(colors.red + 'Fatal error:', error + colors.reset);
  process.exit(2);
});
