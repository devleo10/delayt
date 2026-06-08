# Keep Delayt awake (UptimeRobot)

Render free tier spins down after ~15 minutes without traffic. A lightweight ping every 5 minutes prevents cold starts.

**Note:** UptimeRobot on a sleeping service is a common workaround, not a substitute for a paid always-on plan. For production, use Render Starter ($7/mo) or a small VPS.

## What to ping

| Deploy | URL to monitor |
|--------|----------------|
| Next.js on Vercel | `https://www.yourdomain.dev/api/health` |
| Docker prod stack | `https://www.yourdomain.dev/api/health` |

Expected response from `/api/health`:

```json
{"status":"ok","version":"1.0.3"}
```

## UptimeRobot setup (free tier)

1. Create an account at [uptimerobot.com](https://uptimerobot.com) (free: 50 monitors, 5-minute interval).
2. Click **Add New Monitor**.
3. Set:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Delayt`
   - **URL:** `https://www.yourdomain.dev/api/health`
   - **Monitoring Interval:** 5 minutes
4. Save.

Optional second monitor for the web UI root if the frontend is on a host that sleeps:

- **URL:** `https://www.yourdomain.dev/`

## GitHub Actions backup (optional)

This repo includes `.github/workflows/keep-alive.yml`. It pings the same health URL on a 5-minute schedule using a GitHub secret.

1. Deploy and confirm `/api/health` works in a browser.
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `BACKEND_HEALTH_URL`
4. Value: `https://www.yourdomain.dev/api/health`
5. Enable the workflow (push to `main` or run manually under **Actions**).

Use **either** UptimeRobot **or** the GitHub workflow, not both, unless you want redundant pings.

## Verify it works

1. Deploy, wait 20+ minutes without visiting the URL.
2. Open `https://www.yourdomain.dev/api/health`. If it responds in under ~2s, keep-alive is working.
3. In UptimeRobot, status should show **Up** with recent checks.
