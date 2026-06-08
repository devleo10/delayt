# Delayt

**API latency testing with percentile analysis (p50, p95, p99)**

**Live app:** [delayt.foo](https://www.delayt.foo/) · **Docs:** [delayt.foo/docs](https://www.delayt.foo/docs)

[![CI](https://github.com/devleo10/delayt/actions/workflows/ci.yml/badge.svg)](https://github.com/devleo10/delayt/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://typescriptlang.org)

Sequential HTTP requests. Percentile output. Web app for quick runs (≤20 requests); CLI for CI and longer samples.

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

## Use cases

- **Pre-deploy staging check** — run against staging before you merge or ship
- **Regression testing** — same endpoint, same `-n`, compare p95 before and after a change
- **Competitive benchmarking** — hit two URLs side by side and compare tails, not averages
- **CI gates** — fail the build when `--assert-p95` exceeds your budget
- **Share with the team** — web runs get a `/r/slug` link; CLI supports `--share`

## Quick Start

### CLI (no database)

```bash
npx @delayt/cli run -u https://api.example.com/health -n 50

# Install globally
npm install -g @delayt/cli
delayt run -u https://api.example.com/health -n 50 --assert-p95=500
```

Web dashboard caps at **20 requests** per endpoint. Use the CLI for **50–200** requests and stable p95/p99.

### Web app (local)

```bash
git clone https://github.com/devleo10/delayt
cd delayt

docker compose up -d        # PostgreSQL for run history + share links
npm install
npm run build:shared
cp app/.env.example app/.env
npm run dev                 # http://localhost:3000
```

Open **http://localhost:3000** for the landing page, **/app** for the dashboard.

## CI/CD

### GitHub Actions

```yaml
- name: API latency gate
  run: |
    npx @delayt/cli@latest run \
      -u ${{ secrets.STAGING_HEALTH_URL }} \
      -n 50 \
      --assert-p95=500 \
      -q -o json
```

### GitLab CI

```yaml
latency_smoke:
  image: node:20
  script:
    - npx @delayt/cli@latest run -u "$STAGING_HEALTH_URL" -n 50 --assert-p95=500 -q -o json
```

Pick `--assert-p95` / `--assert-p99` for your API. Exit codes: `0` pass · `1` assertion failed · `2` error.

Upload results to the dashboard:

```bash
DELAYT_SHARE_URL=https://www.delayt.foo npx @delayt/cli run -u https://api.example.com/health -n 50 --share
```

## Architecture

```
delayt/
├── app/                # Next.js (App Router): frontend + API
│   ├── src/app/api/    # REST routes
│   ├── src/components/ # Dashboard, charts, share card
│   └── src/lib/        # Runner, analytics, Postgres
├── packages/
│   ├── shared/         # @delayt/shared
│   └── cli/            # @delayt/cli (npm)
└── docker-compose.yml  # Local Postgres
```

## API Reference

### `POST /api/run`

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{
    "endpoints": [{"url": "https://api.example.com/users", "method": "GET"}],
    "requestCount": 15
  }'
```

Web runs: default **15**, max **20** requests per endpoint.

### `GET /api/run/:id` · `GET /api/runs` · `GET /api/share/:slug`

See [delayt.foo/docs](https://www.delayt.foo/docs) for full API and auth notes.

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build (shared + CLI + app) |
| `npm run typecheck` | Type-check all packages |
| `npm run test:shared` | Shared package unit tests |
| `npm run cli -- run -u URL -n 10` | Run CLI from source |

**Env:** copy `app/.env.example` → `app/.env`. Requires `DATABASE_URL` for run history and share links.

## Deploy

**Recommended:** [Vercel](https://vercel.com/new) + [Neon](https://neon.tech). Root directory: `app`. See [docs/vercel.md](docs/vercel.md).

Optional Docker prod stack: `deploy/` (Dockerfile + `docker-compose.prod.yml`).

## Links

- **App:** [delayt.foo](https://www.delayt.foo/)
- **Repo:** [github.com/devleo10/delayt](https://github.com/devleo10/delayt)
- **CLI on npm:** [@delayt/cli](https://www.npmjs.com/package/@delayt/cli)
- **Author:** [@_devleo10](https://x.com/_devleo10)

If this helps, [star the repo](https://github.com/devleo10/delayt).

## License

MIT © 2026
