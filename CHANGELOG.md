# Changelog

## 2.0.1 — 2026-06-02

### Added
- Standalone `@delayt/cli` npm package (`packages/cli`)
- `delayt run` subcommand (matches landing page UX)
- `-n` / `--n` alias for request count
- Publish-ready monorepo layout with `@delayt/shared`

### Changed
- CLI moved out of backend into `packages/cli`
- Version aligned to 2.0.1 across CLI and shared packages

## 2.0.0

- Web dashboard with shareable `/r/:slug` links
- Express API + PostgreSQL run storage
- Percentile analysis (p50, p95, p99)
- Initial CLI with `--assert-p95` CI gates
