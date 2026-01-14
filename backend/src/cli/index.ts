#!/usr/bin/env node
/**
 * Delayr CLI - API Latency Testing for CI/CD
 * 
 * Usage:
 *   npx delayr --url https://api.example.com/endpoint
 *   npx delayr --url https://api1.com --url https://api2.com --assert-p95=200
 *   npx delayr --config delayr.json
 * 
 * Exit codes:
 *   0 - All tests passed
 *   1 - Assertion failed (latency threshold exceeded)
 *   2 - Error (network, configuration, etc.)
 */

import axios, { AxiosRequestConfig } from 'axios';
import { 
  EndpointConfig, 
  AnalyticsResult, 
  HttpMethod, 
  formatLatency,
  CLIOptions,
  CLIResult,
  AssertionResult
} from '../types';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const REQUEST_TIMEOUT_MS = 30000;

// Parse command line arguments
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
    } else if (arg === '--count' || arg === '-c') {
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
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      console.log('delayr v2.0.0');
      process.exit(0);
    }
  }

  // If no URLs provided, check for positional argument
  if (options.urls!.length === 0 && args.length > 0 && !args[0].startsWith('-')) {
    options.urls!.push(args[0]);
  }

  return options;
}

function printHelp() {
  console.log(`
${colors.bold}${colors.cyan}⚡ Delayr CLI${colors.reset} - API Latency Testing for CI/CD

${colors.bold}USAGE:${colors.reset}
  delayr [options] [url]
  delayr --url <url> [--url <url2>] [options]

${colors.bold}OPTIONS:${colors.reset}
  -u, --url <url>        URL to test (can be specified multiple times)
  -m, --method <method>  HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET)
  -c, --count <n>        Number of requests per endpoint (default: 50)
  -H, --header <header>  Add header (format: "Name: Value")
  -d, --data <json>      Request body for POST/PUT/PATCH
  -o, --output <format>  Output format: table, json, markdown (default: table)
  -q, --quiet            Suppress progress output
  
${colors.bold}ASSERTIONS:${colors.reset}
  --assert-p50=<ms>      Fail if p50 latency exceeds threshold
  --assert-p95=<ms>      Fail if p95 latency exceeds threshold
  --assert-p99=<ms>      Fail if p99 latency exceeds threshold

${colors.bold}EXAMPLES:${colors.reset}
  ${colors.gray}# Basic usage${colors.reset}
  delayr https://api.example.com/health

  ${colors.gray}# Multiple endpoints with assertion${colors.reset}
  delayr -u https://api1.com -u https://api2.com --assert-p95=200

  ${colors.gray}# POST with headers and body${colors.reset}
  delayr -u https://api.example.com/data -m POST \\
    -H "Authorization: Bearer token" \\
    -d '{"key": "value"}'

  ${colors.gray}# CI/CD pipeline usage${colors.reset}
  delayr -u https://staging.api.com --assert-p95=500 --output json

${colors.bold}EXIT CODES:${colors.reset}
  0  All tests passed (or no assertions specified)
  1  Assertion failed (latency threshold exceeded)
  2  Error (network, configuration, etc.)
`);
}

// Compute percentiles
function computePercentiles(data: number[], percentiles: number[]): Record<number, number> {
  if (data.length === 0) {
    return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
  }

  const sorted = [...data].sort((a, b) => a - b);
  const result: Record<number, number> = {};

  for (const percentile of percentiles) {
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const fraction = index - lower;

    if (lower === upper) {
      result[percentile] = sorted[lower];
    } else {
      result[percentile] = sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
    }
  }

  return result;
}

// Make a single request and measure latency
async function measureRequest(endpoint: EndpointConfig): Promise<{
  latency: number;
  status: number;
  error?: string;
}> {
  const startTime = process.hrtime.bigint();
  
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

    return { latency, status: response.status };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const latency = Number(endTime - startTime) / 1_000_000;
    
    return { 
      latency, 
      status: 0, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Run tests for an endpoint
async function runTests(
  endpoint: EndpointConfig, 
  count: number, 
  quiet: boolean
): Promise<AnalyticsResult> {
  const latencies: number[] = [];
  let errorCount = 0;

  for (let i = 1; i <= count; i++) {
    const result = await measureRequest(endpoint);
    latencies.push(result.latency);
    
    if (result.status === 0 || result.status >= 400) {
      errorCount++;
    }

    if (!quiet) {
      const progress = Math.round((i / count) * 100);
      const statusColor = result.status >= 200 && result.status < 300 
        ? colors.green 
        : colors.red;
      process.stdout.write(
        `\r  [${progress.toString().padStart(3)}%] ${endpoint.method} ${endpoint.url} - ` +
        `${statusColor}${result.status}${colors.reset} - ${result.latency.toFixed(2)}ms`
      );
    }
  }

  if (!quiet) {
    process.stdout.write('\n');
  }

  const percentiles = computePercentiles(latencies, [50, 95, 99]);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);

  return {
    endpoint: endpoint.url,
    method: endpoint.method,
    p50: percentiles[50],
    p95: percentiles[95],
    p99: percentiles[99],
    min,
    max,
    avg,
    stdDev: 0, // Not computing for CLI
    avg_payload_size: 0,
    request_count: count,
    error_count: errorCount,
    error_rate: (errorCount / count) * 100,
    success_rate: ((count - errorCount) / count) * 100,
  };
}

// Check assertions
function checkAssertions(
  results: AnalyticsResult[], 
  options: CLIOptions
): AssertionResult[] {
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

// Output formatting
function outputTable(results: AnalyticsResult[]) {
  console.log('\n' + colors.bold + '📊 Results' + colors.reset + '\n');
  
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
    const successColor = r.success_rate >= 99 ? colors.green : r.success_rate >= 95 ? colors.yellow : colors.red;
    
    console.log(
      r.endpoint.substring(0, 48).padEnd(50) +
      r.method.padEnd(8) +
      formatLatency(r.p50).padStart(12) +
      p95Color + formatLatency(r.p95).padStart(12) + colors.reset +
      formatLatency(r.p99).padStart(12) +
      successColor + `${r.success_rate.toFixed(1)}%`.padStart(10) + colors.reset
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

// Main execution
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const options = parseArgs(args);

  if (!options.urls || options.urls.length === 0) {
    console.error(colors.red + 'Error: No URLs specified' + colors.reset);
    process.exit(2);
  }

  // Validate URLs
  for (const url of options.urls) {
    try {
      new URL(url);
    } catch {
      console.error(colors.red + `Error: Invalid URL: ${url}` + colors.reset);
      process.exit(2);
    }
  }

  // Build endpoint configs
  const endpoints: EndpointConfig[] = options.urls.map(url => ({
    url,
    method: options.method!,
    headers: options.headers,
    payload: options.payload,
  }));

  if (!options.quiet) {
    console.log(`\n${colors.bold}${colors.cyan}⚡ Delayr${colors.reset} - Running ${options.count} requests per endpoint\n`);
  }

  // Run tests
  const results: AnalyticsResult[] = [];
  
  for (const endpoint of endpoints) {
    try {
      const result = await runTests(endpoint, options.count!, options.quiet!);
      results.push(result);
    } catch (error) {
      console.error(colors.red + `Error testing ${endpoint.url}: ${error}` + colors.reset);
      process.exit(2);
    }
  }

  // Check assertions
  const assertions = checkAssertions(results, options);
  const allPassed = assertions.length === 0 || assertions.every(a => a.passed);

  // Output results
  if (options.output === 'json') {
    outputJson(results, assertions);
  } else if (options.output === 'markdown') {
    outputMarkdown(results);
  } else {
    outputTable(results);
  }

  // Print assertion results
  if (assertions.length > 0 && options.output !== 'json') {
    console.log(colors.bold + '🎯 Assertions' + colors.reset + '\n');
    
    for (const a of assertions) {
      const icon = a.passed ? colors.green + '✓' : colors.red + '✗';
      const comparison = a.passed ? '≤' : '>';
      console.log(
        `  ${icon}${colors.reset} ${a.type} for ${a.endpoint}: ` +
        `${formatLatency(a.actual)} ${comparison} ${formatLatency(a.expected)}`
      );
    }
    console.log('');
  }

  // Exit with appropriate code
  if (!allPassed) {
    if (!options.quiet && options.output !== 'json') {
      console.log(colors.red + colors.bold + '❌ Assertions failed!' + colors.reset);
    }
    process.exit(1);
  } else if (assertions.length > 0) {
    if (!options.quiet && options.output !== 'json') {
      console.log(colors.green + colors.bold + '✅ All assertions passed!' + colors.reset);
    }
  }

  process.exit(0);
}

main().catch((error) => {
  console.error(colors.red + 'Fatal error:', error + colors.reset);
  process.exit(2);
});
