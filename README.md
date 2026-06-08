# Delayt

**API latency testing with percentile analysis (p50, p95, p99)**

Stop measuring averages. Start measuring what matters.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://typescriptlang.org)

## Why Delayt?

**The problem with averages:**

Your API might show 50ms average while a few requests take seconds. One slow outlier barely moves the average.

**What percentiles tell you:**

| Metric | Meaning | Why it matters |
|--------|---------|----------------|
| **p50** | 50% of requests are faster | Median latency in the sample |
| **p95** | 95% of requests are faster | Common SLO / regression line |
| **p99** | 99% of requests are faster | Slow tail: spikes and cold starts |

If your API shows: `avg: 50ms | p95: 500ms | p99: 2000ms`

Then 5% of requests in that sample were slower than 500ms, and 1% were slower than 2s. **Averages hide that.**

## Quick Start

```bash
git clone https://github.com/devleo10/delayt
cd delayt

docker compose up -d        # Start PostgreSQL

npm install
npm run build:shared        # Build shared types package
cp app/.env.example app/.env
npm run dev                 # Start Next.js on http://localhost:3000
```

Open **http://localhost:3000**. The app serves both the UI and API on the same port.

### CLI (no database required)

```bash
npx @delayt/cli run -u https://httpbin.org/delay/0.1 -n 10 --assert-p95=5000

# From source (monorepo)
npm run build:cli
npm run cli -- run -u https://api.example.com/health --assert-p95=200
```

## Architecture

```
delayt/
├── app/                # Next.js (App Router): frontend + API
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Landing page
│   │   │   ├── app/page.tsx       # Dashboard
│   │   │   ├── docs/page.tsx      # Docs
│   │   │   ├── r/[slug]/page.tsx  # Shareable run page
│   │   │   └── api/               # All API routes
│   │   ├── components/            # React components
│   │   └── lib/                   # DB client, runner, analytics
│   ├── next.config.js
│   └── package.json
├── packages/
│   ├── shared/        # Shared TypeScript types (@delayt/shared on npm)
│   └── cli/           # Publishable CLI (@delayt/cli on npm)
└── docker-compose.yml # PostgreSQL
```

All backend logic (runner, analytics, DB schema) lives in `app/src/lib/`. API routes in `app/src/app/api/` serve the same endpoints as the original Express backend. No client code changes needed.

## API Reference

### `POST /api/run` - Start a test run

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "endpoints": [
      {
        "url": "https://api.example.com/users",
        "method": "GET",
        "headers": {"Authorization": "Bearer token"}
      }
    ],
    "requestCount": 15
  }'
```

Web runs are capped at **20 requests** per endpoint (default 15). Use `npx @delayt/cli` for 50+.

**Response:**
```json
{
  "success": true,
  "runId": "run_1705276800000_abc123",
  "slug": "xk9f2m3p",
  "shareUrl": "/r/xk9f2m3p",
  "message": "Tests started successfully"
}
```

### `GET /api/run/:id` - Get run results

```bash
curl http://localhost:3000/api/run/xk9f2m3p
```

### `GET /api/runs` - List recent runs

```bash
curl http://localhost:3000/api/runs?limit=10
```

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL 12+ (or use Docker)

### Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/latency_db
REQUEST_TIMEOUT_MS=30000
DEFAULT_REQUEST_COUNT=50
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW_MS=3600000
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run typecheck` | Type-check all packages |
| `npm run db:init` | Initialize DB schema (local Docker only; Vercel uses auto-init) |

## Deploy on Vercel

1. **[Neon](https://neon.tech)**: free Postgres, copy `DATABASE_URL`
2. **[Vercel](https://vercel.com/new)**: import repo, **Root Directory: `app`**
3. Env: `DATABASE_URL`, `FRONTEND_URL=https://yourdomain.dev`, optional `WEB_MAX_REQUEST_COUNT=20`
4. Add your domain in Vercel → Domains

Web dashboard: **15 default / 20 max** requests. CLI: **50–200** for full runs.

Full steps: [docs/vercel.md](docs/vercel.md)

Self-hosting with Docker is optional. See `deploy/` and [docs/digitalocean.md](docs/digitalocean.md).

## License

MIT © 2026