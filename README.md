# Delayt

**API Latency Testing with Percentile Analysis (p50, p95, p99)**

Stop measuring averages. Start measuring what matters.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://typescriptlang.org)
<p align="center">
  <img src="https://via.placeholder.com/800x400/0d1117/58a6ff?text=Delayt+Dashboard" alt="Delayt Dashboard" />
</p>

## Why Delayt?

**The Problem with Averages:**

Your API has an average latency of 50ms. Sounds great, right? But here's the truth:
- 99 requests at 10ms + 1 request at 10 seconds = 200ms average
- That 200ms average hides the fact that some users wait 10 seconds

**What Percentiles Tell You:**

| Metric | Meaning | Why It Matters |
|--------|---------|----------------|
| **p50** | 50% of requests are faster | Your median experience |
| **p95** | 95% of requests are faster | What most users experience |
| **p99** | 99% of requests are faster | Your worst-case (almost) |

If your API shows: `avg: 50ms | p95: 500ms | p99: 2000ms`

This means 5% of users experience 500ms+ latency, and 1% wait 2+ seconds. **That's critical information averages hide.**

## How Delayt differs from load testing tools

JMeter, Gatling, Locust, k6, and Artillery simulate **concurrent users** to find throughput limits and failure points under stress. Delayt does **sequential percentile smoke checks**: one path, p50/p95/p99, shareable results, and a one-line CI gate.

| | Load tools | Delayt |
|---|------------|--------|
| **Goal** | Stress, saturation, max RPS | Latency distribution on a single path |
| **Pattern** | Parallel virtual users, ramps | Sequential requests (no concurrency noise) |
| **When** | Capacity planning, pre-scale drills | Pre-deploy staging, PR regression gate |
| **Setup** | Scripts, agents, scenarios | `npx @delayt/cli run -u … -n 50` |

Use **both** in a healthy pipeline: Delayt on every PR for percentile gates; load tools on a schedule or before major releases. Delayt will not expose contention or pool exhaustion that only shows up under concurrency. That is intentional.

Full comparison in the web app at **`/docs#comparison`** after you run `npm run dev:all`.

## Features

### Core
- **Percentile Analysis** - p50, p95, p99 latency metrics
- **High-Resolution Timing** - Nanosecond precision with `process.hrtime`
- **Custom Request Count** - Configure 1-200 requests per endpoint
- **All HTTP Methods** - GET, POST, PUT, PATCH, DELETE support
- **Custom Headers** - Test APIs with auth tokens, API keys, etc.
- **Request Body** - Full JSON payload support for POST/PUT/PATCH

### Visualization
- **Dark Mode UI** - Developer-focused design
- **Scatter Plot** - Payload size vs latency distribution
- **Latency Histogram** - See your latency distribution
- **Comparison Chart** - Compare p50/p95/p99 across endpoints
- **Success Rate Badges** - Instant error rate visibility

### Developer Experience
- **TypeScript** - Full type safety across frontend and backend
- **Error Boundaries** - Graceful error handling with retry options
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- **Responsive Design** - Works on mobile and desktop
- **Progress Indicators** - Real-time feedback for long-running tests

### Sharing & Collaboration
- **Shareable Links** - Every test run gets a unique URL (`/r/abc123`)
- **Copy as Markdown** - One-click export for GitHub issues
- **Run History** - Browser cookie-based history in the UI

### CI/CD Integration
- **CLI on npm** — `npx @delayt/cli run -u https://...`
- **Assertions** — Fail builds if p95 exceeds threshold
- **JSON Output** — Machine-readable results for pipelines
- **Exit Codes** — 0 = pass, 1 = assertion failed, 2 = error

## Quick Start

```bash
git clone <your-repo-url>
cd delayt

docker-compose up -d

npm install
cd packages/shared && npm install && npm run build
cd ../../backend && npm install && cp .env.example .env
cd ../frontend && npm install && cp .env.example .env

# From repo root: backend + frontend + shared watch
cd ..
npm run dev:all
```

Open **http://localhost:3000** (Vite dev server). API runs on **http://localhost:3001**.

### CLI (no database required)

Install globally or run with npx:

```bash
npx @delayt/cli run -u https://httpbin.org/delay/0.1 -n 10 --assert-p95=5000

# From source (monorepo)
npm run build:cli
npm run cli -- run -u https://api.example.com/health --assert-p95=200
```

## CLI Usage

```
Delayt CLI - API Latency Testing for CI/CD

USAGE:
  delayt run [options]
  delayt [options] [url]
  delayt -u <url> [--url <url2>] [options]

OPTIONS:
  -u, --url <url>        URL to test (can be specified multiple times)
  -m, --method <method>  HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET)
  -c, --count <n>        Number of requests per endpoint (default: 50)
  -n, --n <n>            Alias for --count
  -H, --header <header>  Add header (format: "Name: Value")
  -d, --data <json>      Request body for POST/PUT/PATCH
  -o, --output <format>  Output format: table, json, markdown (default: table)
  -q, --quiet            Suppress progress output
  
ASSERTIONS:
  --assert-p50=<ms>      Fail if p50 latency exceeds threshold
  --assert-p95=<ms>      Fail if p95 latency exceeds threshold  
  --assert-p99=<ms>      Fail if p99 latency exceeds threshold

EXIT CODES:
  0  All tests passed
  1  Assertion failed (latency threshold exceeded)
  2  Error (network, configuration, etc.)
```

### CI/CD Examples

**GitHub Actions:**
```yaml
- name: Check API Latency
  run: npx @delayt/cli@latest run -u ${{ secrets.API_URL }} --assert-p95=200 --output json -q
```

## API Reference

### `POST /api/run` - Start a test run

```bash
curl -X POST http://localhost:3001/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "endpoints": [
      {
        "url": "https://api.example.com/users",
        "method": "GET",
        "headers": {"Authorization": "Bearer token"}
      }
    ],
    "requestCount": 50
  }'
```

**Response:**
```json
{
  "success": true,
  "runId": "run_1705276800000_abc123",
  "slug": "xk9f2m3p",
  "shareUrl": "http://localhost:3000/r/xk9f2m3p",
  "message": "Tests started successfully"
}
```

### `GET /api/run/:id` - Get run results

```bash
curl http://localhost:3001/api/run/xk9f2m3p
```

**Response:**
```json
{
  "success": true,
  "run": {
    "id": "run_1705276800000_abc123",
    "slug": "xk9f2m3p",
    "status": "completed",
    "endpoints": [...],
    "requestCount": 50
  },
  "results": [
    {
      "endpoint": "https://api.example.com/users",
      "method": "GET",
      "p50": 45.23,
      "p95": 123.45,
      "p99": 234.56,
      "min": 12.34,
      "max": 456.78,
      "avg": 67.89,
      "request_count": 50,
      "error_rate": 0,
      "success_rate": 100
    }
  ]
}
```

### `GET /r/:slug` - Shareable result link

Returns same format as `/api/run/:id` with histogram data included.

### `GET /api/runs` - List recent runs

```bash
curl http://localhost:3001/api/runs?limit=10
```

### `GET /api/histogram` - Latency histogram

```bash
curl http://localhost:3001/api/histogram?runId=xk9f2m3p
```

## Architecture

```
delayt/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── server.ts      # API routes & middleware
│   │   ├── runner.ts      # Request executor with timing
│   │   ├── analytics.ts   # Percentile computation
│   │   └── db/            # PostgreSQL client & schema
│   └── package.json
├── frontend/          # React + Vite UI
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── EndpointForm.tsx
│   │       ├── ResultsTable.tsx
│   │       └── LatencyChart.tsx
│   └── package.json
├── packages/
│   ├── shared/        # Shared TypeScript types (@delayt/shared on npm)
│   └── cli/           # Publishable CLI (@delayt/cli on npm)
└── docker-compose.yml # PostgreSQL setup
```

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+ (or use Docker)
- npm or yarn

### Environment Variables

**Backend (`backend/.env`):**
```env
PORT=3001
BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/latency_db
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
REQUEST_TIMEOUT_MS=30000
DEFAULT_REQUEST_COUNT=50
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_MS=3600000
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:3001
```

`FRONTEND_URL` is used for share links returned by the API. The UI displays links using the browser origin (`/r/{slug}`).

### Keep-alive on Render free tier

Render spins down idle free services after ~15 minutes. Use [UptimeRobot](https://uptimerobot.com) to ping `/health` every 5 minutes, or set the `BACKEND_HEALTH_URL` GitHub secret for the included keep-alive workflow.

See [docs/uptime-robot.md](docs/uptime-robot.md) for setup steps.

## Real-World Use Cases

### 1. **Pre-deployment Validation**
Test your staging API before promoting to production:
```bash
delayt -u https://staging.api.com/health --assert-p95=200
```

### 2. **Regression Testing**
Add to your CI pipeline to catch performance regressions:
```yaml
- name: Performance Gate
  run: |
    npx @delayt/cli@latest run -u $API_URL/users -u $API_URL/posts \
      --assert-p95=300 --output json > latency-report.json
```

### 3. **Third-Party API Monitoring**
Measure dependencies before integrating:
```bash
delayt -u https://api.stripe.com/v1/tokens \
       -H "Authorization: Bearer sk_test_xxx" \
       --count 100
```

### 4. **Load Testing Baseline**
Establish baseline metrics before scaling:
```bash
delayt -u https://api.example.com/heavy-endpoint \
       --count 200 --output markdown >> PERFORMANCE.md
```

### 5. **Competitive Benchmarking**
Compare your API against competitors:
```bash
delayt -u https://yourapi.com/search \
       -u https://competitor.com/search \
       --count 100
```

## Publish to npm

The unscoped name `delayt` is blocked by npm (similar to `delay`). Publish under `@delayt`:

```bash
# 1. Log in (once)
npm login

# 2. Dry-run the tarball
npm run pack:cli

# 3. Publish @delayt/shared first, then @delayt/cli
npm run publish:shared
npm run publish:cli
```

After publish, users install with:

```bash
npx @delayt/cli run -u https://api.example.com/health -n 50
# global install → command is still `delayt`
npm install -g @delayt/cli
```

## License

MIT © 2024

## Acknowledgments

- Built for indie hackers and API developers
- Inspired by the need to measure what matters
- Dark theme inspired by GitHub's design system

---

<p align="center">
  <strong>Stop measuring averages. Start measuring percentiles.</strong>
  <br>
  <a href="https://github.com/devleo10/delayt">Star on GitHub</a> |
  <a href="https://twitter.com/yourusername">Follow on Twitter</a>
</p>
