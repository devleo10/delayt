# Changelog

## 1.0.2 (2026-06-02)

### Added
- JSON and CSV export options for test results in the Web UI.
- Raw per-request export (Raw JSON / Raw CSV) from the Results tab.
- "Stop Run" functionality to cancel active test runs from the UI.
- "Clear History" button to remove local run history from the sidebar.
- Docs section comparing Delayt to JMeter, Gatling, Locust, and k6.

### Fixed
- Consolidated analytics logic across Backend and CLI into `@delayt/shared` for consistency.
- Fixed CLI missing standard deviation and request payload size in results output.

## 1.0.1 (2026-06-02)

### Changed
- `@delayt/cli@1.0.1` depends on `@delayt/shared@1.0.1` (README on npm)

## 1.0.0 (2026-06-02)

First release (pre-production).

### Added
- Web app: percentile testing (p50, p95, p99), shareable `/r/:slug` links
- `@delayt/cli` npm package with `run` subcommand and CI assertions
- `@delayt/shared` types and utilities
- Editorial landing page and dashboard UI
