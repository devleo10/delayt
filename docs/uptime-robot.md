# Keep Delayt awake (UptimeRobot)

Render free tier spins down after ~15 minutes without traffic. A lightweight ping every 5 minutes prevents cold starts.

**Note:** UptimeRobot on a sleeping service is a common workaround, not a substitute for a paid always-on plan. For production, use Render Starter ($7/mo) or a small VPS.

## What to ping

| Deploy | URL to monitor |
|--------|----------------|
| Backend only (Render/Railway/Fly) | `https://YOUR-API.onrender.com/health` |
| Frontend on Vercel | Usually not needed (Vercel does not sleep) |

Expected response from `/health`:

```json
{"status":"ok","version":"1.0.0"}
```

## UptimeRobot setup (free tier)

1. Create an account at [uptimerobot.com](https://uptimerobot.com) (free: 50 monitors, 5-minute interval).
2. Click **Add New Monitor**.
3. Set:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Delayt API`
   - **URL:** `https://YOUR-API.onrender.com/health`
   - **Monitoring Interval:** 5 minutes
4. Save.

Optional second monitor for the web UI root if the frontend is on a host that sleeps:

- **URL:** `https://YOUR-FRONTEND.vercel.app/` (or your Render web service URL)

## GitHub Actions backup (optional)

This repo includes `.github/workflows/keep-alive.yml`. It pings the same health URL on a 5-minute schedule using a GitHub secret.

1. Deploy the backend and confirm `/health` works in a browser.
2. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `BACKEND_HEALTH_URL`
4. Value: `https://YOUR-API.onrender.com/health`
5. Enable the workflow (push to `main` or run manually under **Actions**).

Use **either** UptimeRobot **or** the GitHub workflow, not both, unless you want redundant pings.

## Verify it works

1. Deploy backend, wait 20+ minutes without visiting the URL.
2. Open `https://YOUR-API.onrender.com/health`. If it responds in under ~2s, keep-alive is working.
3. In UptimeRobot, status should show **Up** with recent checks.
