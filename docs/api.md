# css-charts public API (sketch)

Vanilla HTML, CSS, and JavaScript only. No frameworks, no SVG, no canvas, no chart libraries.

Load two files, then call `CssCharts.render()`.

```html
<link rel="stylesheet" href="src/css-charts.css" />
<script src="src/css-charts.js"></script>
```

## `CssCharts.render(element, options) → chart | null`

Writes chart markup into `element`. CSS paints it.

| Option | Default | Notes |
| --- | --- | --- |
| `type` | `'bar'` | `'bar'` \| `'line'` \| `'combo'` \| `'pie'` \| `'scatter'` \| `'gauge'` \| `'heatmap'` \| `'radar'` |
| `data` | required | Array of row objects, or a JSON string of that array |
| `series` | required for bar/line/combo | `{ key, label?, type?, axis?, color? }[]` |
| `layout` | auto | Bar: `simple` \| `group` \| `stack` \| `horizontal` \| `range` \| `waterfall` |
| `selectable` | `false` | Click or keyboard-activate a mark to select it |
| `onSelect` | none | `(payload \| null) => void` when selection changes |
| `fallbackNotes` | `false` | When `true`, append developer `@supports` notes under the chart (demos opt in) |

Aliases (same options, no `type` needed): `renderBar`, `renderLine`, `renderPie`, `renderCombo`, `renderScatter`, `renderGauge`, `renderHeatmap`, `renderRadar`.

Hand-built markup is still valid. `render` is convenience, not required.

## Chart instance

A successful `render` returns an object that always includes:

```js
{
  el,                 // the chart root
  select(query),      // mark element | index | { series, label, index? } | null
  getSelection(),     // payload or null
  clearSelection(),   // same as select(null)
  destroy(),          // clear DOM, selection listeners, and chart data-* / CSS vars
}
```

Plus type-specific fields (`max`, `stagger`, `slices`, …).

Marks get a stable `data-index` (0-based among selectable marks). Prefer `select({ index })` or `select(n)`.

Selection payload:

```js
{
  el,       // the mark button
  series,   // series key, if present
  label,    // category / slice label
  value,    // numeric value or null
  index,    // data-index on the mark
  type,     // chart type
}
```

Clicking the selected mark again clears the selection. Listen with `onSelect` or the bubbling `cc-select` event (`event.detail` is the payload).

```js
const chart = CssCharts.render(el, {
  type: 'bar',
  data,
  series: [{ key: 'uv', label: 'UV' }],
  selectable: true,
  onSelect: (payload) => console.log(payload),
});

chart.select({ label: 'B', series: 'uv' });
```

## Constraints

- Identifiers and class names are English (`cc-chart`, `cc-bar`, …).
- Geometry lives in CSS (`attr()`, `shape()`, `border-shape`) with `@supports` fallbacks.
- Do not add React/Vue, D3, Chart.js, or other canvas/SVG chart engines to this package.
