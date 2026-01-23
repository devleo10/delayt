# ⚡ Delayr

**API Latency Testing with Percentile Analysis (p50, p95, p99)**

Stop measuring averages. Start measuring what matters.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://typescriptlang.org)
[![CI](https://img.shields.io/github/workflow/status/your-org/delayr/CI)](https://github.com/your-org/delayr/actions)

<p align="center">
  <img src="https://via.placeholder.com/800x400/0d1117/58a6ff?text=⚡+Delayr+Dashboard" alt="Delayr Dashboard" />
</p>

## 🎯 Why Delayr?

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

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/your-org/delayr.git
cd delayr

# Start PostgreSQL (using Docker)
docker-compose up -d postgres

# Install dependencies and start development
npm install
npm run dev:all

# Open browser to http://localhost:3000
```

## ✨ Features

### 🚀 Core Features
- **Percentile Analysis** - p50, p95, p99 latency metrics
- **High-Resolution Timing** - Nanosecond precision with `process.hrtime`
- **Custom Request Count** - Configure 1-200 requests per endpoint
- **All HTTP Methods** - GET, POST, PUT, PATCH, DELETE support
- **Custom Headers** - Test APIs with auth tokens, API keys, etc.
- **Request Body** - Full JSON payload support for POST/PUT/PATCH

### 📊 Visualization
- **Dark Mode UI** - Beautiful developer-focused design
- **Scatter Plot** - Payload size vs latency distribution
- **Latency Histogram** - See your latency distribution
- **Comparison Chart** - Compare p50/p95/p99 across endpoints
- **Success Rate Badges** - Instant error rate visibility

### 💻 Developer Experience
- **TypeScript** - Full type safety across frontend and backend
- **Error Boundaries** - Graceful error handling with retry options
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support
- **Responsive Design** - Works great on mobile and desktop
- **Progress Indicators** - Real-time feedback for long-running tests

### 🔗 Sharing & Collaboration
- **Shareable Links** - Every test run gets a unique URL (`/r/abc123`)
- **Copy as Markdown** - One-click export for GitHub issues
- **Run History** - Access past test results

### 🔧 CI/CD Integration
- **CLI Tool** - `npx delayr --url https://api.example.com`
- **Assertions** - Fail builds if p95 exceeds threshold
- **JSON Output** - Machine-readable results for pipelines
- **Exit Codes** - 0 = pass, 1 = assertion failed, 2 = error

## 🚀 Quick Start

### Option 1: Web UI

```bash
# Clone the repo
git clone https://github.com/yourusername/delayr.git
cd delayr

# Start PostgreSQL with Docker
docker-compose up -d

# Start the backend
cd backend
npm install
npm run dev

# Start the frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and start testing!

### Option 2: CLI (No database required)

```bash
# Install globally
npm install -g delayr

# Test an API
delayr https://api.example.com/health

# With assertions (for CI/CD)
delayr --url https://api.example.com --assert-p95=200

# Multiple endpoints with headers
delayr -u https://api.example.com/users \
       -u https://api.example.com/posts \
       -H "Authorization: Bearer your-token" \
       --assert-p95=500
```

## 📖 CLI Usage

```
⚡ Delayr CLI - API Latency Testing for CI/CD

USAGE:
  delayr [options] [url]
  delayr --url <url> [--url <url2>] [options]

OPTIONS:
  -u, --url <url>        URL to test (can be specified multiple times)
  -m, --method <method>  HTTP method: GET, POST, PUT, PATCH, DELETE (default: GET)
  -c, --count <n>        Number of requests per endpoint (default: 50)
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
  run: npx delayr -u ${{ secrets.API_URL }} --assert-p95=200 --output json
```

**GitLab CI:**
```yaml
latency-check:
  script:
    - npx delayr -u $API_URL --assert-p95=500 --quiet
  allow_failure: false
```

## 🔌 API Reference

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
  "shareUrl": "http://localhost:3001/r/xk9f2m3p",
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

## 🏗️ Architecture

```
delayr/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── server.ts      # API routes & middleware
│   │   ├── runner.ts      # Request executor with timing
│   │   ├── analytics.ts   # Percentile computation
│   │   ├── cli/           # CLI tool
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
│   └── shared/        # Shared TypeScript types
└── docker-compose.yml # PostgreSQL setup
```

## 🛠️ Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+ (or use Docker)
- npm or yarn

### Setup

```bash
# Clone & install
git clone https://github.com/yourusername/delayr.git
cd delayr

# Start PostgreSQL
docker-compose up -d

# Backend
cd backend
npm install
cp .env.example .env  # Configure your database
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

**Backend (.env):**
```env
PORT=3001
BASE_URL=http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/latency_db

# Or individual variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=latency_db
DB_USER=postgres
DB_PASSWORD=postgres

# Optional
REQUEST_TIMEOUT_MS=30000
DEFAULT_REQUEST_COUNT=50
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_MS=3600000
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001
```

## 🌍 Real-World Use Cases

### 1. **Pre-deployment Validation**
Test your staging API before promoting to production:
```bash
delayr -u https://staging.api.com/health --assert-p95=200
```

### 2. **Regression Testing**
Add to your CI pipeline to catch performance regressions:
```yaml
- name: Performance Gate
  run: |
    npx delayr -u $API_URL/users -u $API_URL/posts \
      --assert-p95=300 --output json > latency-report.json
```

### 3. **Third-Party API Monitoring**
Measure dependencies before integrating:
```bash
delayr -u https://api.stripe.com/v1/tokens \
       -H "Authorization: Bearer sk_test_xxx" \
       --count 100
```

### 4. **Load Testing Baseline**
Establish baseline metrics before scaling:
```bash
delayr -u https://api.example.com/heavy-endpoint \
       --count 200 --output markdown >> PERFORMANCE.md
```

### 5. **Competitive Benchmarking**
Compare your API against competitors:
```bash
delayr -u https://yourapi.com/search \
       -u https://competitor.com/search \
       --count 100
```

## 📝 License

MIT © 2024

## 🙏 Acknowledgments

- Built with ❤️ for indie hackers and API developers
- Inspired by the need to measure what matters
- Dark theme inspired by GitHub's design system

---

<p align="center">
  <strong>Stop measuring averages. Start measuring percentiles.</strong>
  <br>
  <a href="https://github.com/yourusername/delayr">⭐ Star on GitHub</a> •
  <a href="https://twitter.com/yourusername">🐦 Follow on Twitter</a>
</p>
