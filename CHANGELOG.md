# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-19

### Added
- Opt-in mark selection (`selectable`, `onSelect`, `select` / `getSelection` / `clearSelection`, `cc-select`)
- Stable `data-index` on selectable marks and `destroy()` on chart instances
- `CssCharts.polyfill()` for conditional Interest Invoker / Popover / Anchor polyfills
- `sanitizeCssColor()` and safer handling of `series[].color` in inline styles
- Forced Colors styles for selected marks and an `@supports` anchor fallback for tips
- Hand-written TypeScript types (`src/css-charts.d.ts`) and ESM entry (`src/css-charts.mjs`)
- Public API sketch in `docs/api.md`
- Selection demo (`demo/select.html`)

### Changed
- Interest tips no longer set redundant `role="tooltip"` / `aria-describedby`
- `.cc-hit` strips are no longer wrapped in `aria-hidden`
- Popover open styles use `:is(:popover-open, :open, .\:popover-open)`
- `fallbackNotes` is opt-in (`false` by default; demos enable it)

### Fixed
- Invalid JSON strings passed as `data` now throw a clear `css-charts:` error
