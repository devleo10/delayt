# @delayt/cli

API latency testing with **p50, p95, and p99** percentile analysis. No database required.

## Install

```bash
npm install -g @delayt/cli
npx @delayt/cli run -u https://api.example.com/health -n 50
```

## Quick examples

```bash
# More requests than the web app (web max: 20)
npx @delayt/cli run -u https://api.example.com/health -n 50

# Auth headers
npx @delayt/cli run -u https://api.example.com/data \
  -H "Authorization: Bearer TOKEN" -n 50

# CI gate
npx @delayt/cli run -u https://api.example.com/health -n 50 --assert-p95=500 -q -o json
```

After each run the CLI prints a **// summary** block and doc links. Set `DELAYT_DOCS_URL=https://yourdomain.dev` for clickable `/docs#cli` URLs.

## Docs

- **Request count:** `-n 50` (default 50, max 200)
- **Auth:** `-H "Name: Value"`
- **POST:** `-m POST -d '{"key":"value"}'`
- **Asserts:** `--assert-p95=500` (exit 1 on fail)

Full recipes: `/docs#cli` on your Delayt site, or [github.com/devleo10/delayt](https://github.com/devleo10/delayt).

Exit codes: `0` pass · `1` assertion failed · `2` error
