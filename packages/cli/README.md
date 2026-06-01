# @delayt/cli

API latency testing with **p50, p95, and p99** percentile analysis. No database required.

The unscoped name `delayt` is blocked by npm (too similar to `delay`). Install via the `@delayt` scope instead.

## Install

```bash
npm install -g @delayt/cli
# or run without installing
npx @delayt/cli run -u https://api.example.com/health
```

After global install, the command is still **`delayt`**:

```bash
delayt run -u https://httpbin.org/delay/0.1 -n 20
```

## CI/CD

```yaml
- name: API latency gate
  run: npx @delayt/cli@latest run -u ${{ secrets.API_URL }} --assert-p95=300 --output json -q
```

Exit codes: `0` pass · `1` assertion failed · `2` error

See the [main README](https://github.com/devleo10/delayt) for the web app and docs.
