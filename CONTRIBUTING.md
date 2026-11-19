# Contributing to css-charts

Thanks for helping improve a zero-dependency, CSS-first chart library.

## Principles

- **Vanilla only:** HTML, CSS, and JavaScript. No frameworks in the core package.
- **No SVG / canvas / D3:** CSS paints the chart; JS builds the DOM from data.
- **English identifiers:** file names, APIs, and CSS classes (`cc-*`) stay in English.
- **Progressive enhancement:** new CSS features need `@supports` fallbacks when practical.

## Setup

```bash
npm start
```

Open http://localhost:8090/demo/

```bash
npm test
```

## Pull requests

1. Keep changes focused and documented in `CHANGELOG.md` when user-facing.
2. Prefer extending `CssCharts.render()` / CSS tokens over new engines.
3. Verify demos still render in Chromium; note Safari/Firefox gaps honestly.
4. Do not add runtime dependencies without discussion.
