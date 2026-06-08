# Deploy Delayt on Vercel

Delayt is a **Next.js app** (`app/`) with API routes and Postgres. Vercel hosts the UI and API together. Postgres lives on **[Neon](https://neon.tech)** (free tier works).

Replace `yourdomain.dev` with your domain.

---

## 1. Neon database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the **pooled connection string**
3. Example: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

Tables are created automatically on first API use (no manual migration step).

---

## 2. Import on Vercel

1. [vercel.com/new](https://vercel.com/new) → Import `devleo10/delayt`
2. **Root Directory:** `app` (required)
3. Framework: **Next.js** (auto-detected)

`app/vercel.json` installs from the monorepo root and builds `@delayt/shared` first.

---

## 3. Environment variables

Vercel → Project → **Settings → Environment Variables**:

| Variable | Value | Required |
|----------|--------|----------|
| `DATABASE_URL` | Neon pooled connection string | Yes |
| `FRONTEND_URL` | `https://www.yourdomain.dev` | Yes (share links) |

Recommended for Hobby (free):

| Variable | Value |
|----------|--------|
| `WEB_DEFAULT_REQUEST_COUNT` | `15` |
| `WEB_MAX_REQUEST_COUNT` | `20` |
| `REQUEST_TIMEOUT_MS` | `15000` |

**CORS (apex + www):** If users can open both `https://yourdomain.dev` and `https://www.yourdomain.dev`, set:

| Variable | Value |
|----------|--------|
| `FRONTEND_URL` | `https://www.yourdomain.dev` (canonical share-link host) |
| `ALLOWED_ORIGINS` | `https://www.yourdomain.dev,https://yourdomain.dev` |

Optional:

| Variable | Default |
|----------|---------|
| `RATE_LIMIT_REQUESTS` | `30` |
| `RATE_LIMIT_WINDOW_MS` | `3600000` |
| `IMPORT_API_KEY` | — (required for CLI `--share` when set) |

Save env vars, then **Redeploy**.

---

## 4. Custom domain

1. Vercel → **Domains** → Add `yourdomain.dev` and `www`
2. Add DNS records at your registrar
3. Set `FRONTEND_URL` to your canonical host (usually `https://www.yourdomain.dev`)
4. Set `ALLOWED_ORIGINS` to include both apex and www if both resolve
5. Redeploy

---

## 5. Verify

```bash
curl https://www.yourdomain.dev/api/health
# {"status":"ok","version":"1.0.3"}

open https://www.yourdomain.dev/app
```

Run a test (default 15 requests) → copy `/r/slug` → open in incognito.

---

## Web vs CLI

| Surface | Requests | Where it runs |
|---------|----------|----------------|
| **Web** (`/app`) | Default 15, max 20 | Vercel serverless |
| **CLI** | Up to 200 | Your machine / CI |

For 50+ requests and stable p95/p99, users copy the CLI command from the results panel:

```bash
npx @delayt/cli run -u https://api.example.com/health -n 50 --assert-p95=500
```

Upload to dashboard (`--share`):

```bash
DELAYT_SHARE_URL=https://www.yourdomain.dev \
DELAYT_IMPORT_API_KEY=your_secret \
npx @delayt/cli run -u https://api.example.com/health -n 50 --share
```

Set `IMPORT_API_KEY` on Vercel and the same value as `DELAYT_IMPORT_API_KEY` in CI.

---

## Local dev

```bash
docker compose up -d
cp app/.env.example app/.env
npm install && npm run build:shared
npm run dev
```

Use local Docker `DATABASE_URL` in `app/.env`. Override `WEB_MAX_REQUEST_COUNT` locally if needed.

---

## Limits on free tier

| Topic | Detail |
|-------|--------|
| **Web request cap** | 20 max keeps runs under Vercel Hobby ~10s function limit |
| **Neon idle** | Free tier may pause after inactivity; first query after idle adds ~1–2s |
| **Rate limit** | In-memory per serverless instance (soft) |
| **Stop run** | Best-effort on serverless (per-instance cancel flag) |

CLI does not use Vercel or Neon unless you add `--share`.
