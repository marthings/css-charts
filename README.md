# css-charts

**JSON data → correct DOM. CSS paints the chart.**

Pure HTML/CSS **bar**, **line**, **combo** (bar+line), and **pie/donut** charts (Recharts-inspired composition). No SVG, no canvas, no D3, no progressive fallbacks. Geometry uses modern CSS including `clip-path: shape()` (lines) and `border-shape: shape()` (pie arcs).

```
data (JSON / array)  ── CssCharts.render() ──►  DOM  ── CSS ──►  chart
```

## Quick start

```html
<link rel="stylesheet" href="src/css-charts.css" />
<script src="src/css-charts.js"></script>

<div id="chart"></div>
<script>
  // From an API, file, or local object — same shape either way
  const data = [
    { name: 'A', uv: 4000, pv: 2400 },
    { name: 'B', uv: 3000, pv: 1398 },
    { name: 'C', uv: 2000, pv: 9800 },
  ];

  CssCharts.render(document.getElementById('chart'), {
    type: 'bar',           // 'bar' | 'line' | 'combo' | 'pie'
    data: data,            // array of row objects, or a JSON string
    series: [
      { key: 'uv', label: 'UV' },
      { key: 'pv', label: 'PV' },
    ],
    layout: 'group',       // bar only: simple | group | stack | horizontal
    max: 10000,            // optional; inferred if omitted
    tooltip: true,         // interestfor tips (default)
  });
</script>
```

Line chart is the same call with `type: 'line'`:

```js
CssCharts.render(el, {
  type: 'line',
  data: data,
  series: [
    { key: 'uv', label: 'UV' },              // line only (default)
    { key: 'pv', label: 'PV', area: true }, // gradient fill under curve
  ],
  max: 10000,
});
```

Pie / donut uses **`shape()` arcs** for each wedge:

```js
CssCharts.render(el, {
  type: 'pie',
  data: [
    { name: 'Organic', value: 42 },
    { name: 'Paid', value: 28 },
    { name: 'Referral', value: 18 },
  ],
  // valueKey: 'value',
  // donut: true,
  // innerRadius: 0.55,
  ariaLabel: 'Traffic by channel',
});
```

Combo is **opt-in** — stay on `type: 'bar'` (or `'line'`) and add a line series and/or `axis: 'right'` when you need them. `type: 'combo'` is just an explicit alias.

```js
CssCharts.render(el, {
  type: 'bar',
  data: data,
  series: [
    { key: 'uv', label: 'UV' },
    { key: 'pv', label: 'PV' },
    { key: 'conv', label: 'Conv %', type: 'line', axis: 'right', curve: 'smooth' },
  ],
  layout: 'group',
  // maxRight: 40,  // optional; inferred from right-axis series
});
```

`series[].type` is `'bar'` or `'line'` (defaults with the chart: bar chart → bar, line chart → line). `series[].axis` is `'left'` unless you set `'right'`. Right-axis domain: `minRight` / `maxRight` (inferred if omitted). Alias: `renderCombo`.

Aliases: `renderBar` / `renderLine` / `renderPie` / `renderCombo` (no need for `type`).

### Line modes

| Mode | How | Look |
| --- | --- | --- |
| **Straight** (default) | `curve: 'straight'` or omit | Polyline (`line to`) |
| **Smooth / curved** | `curve: 'smooth'` or `true` | Cubic `curve to … with cp1 / cp2` |
| **Line only** (default fill) | `area: false` or omit | Solid ribbon `shape()` — no gradient |
| **Area fill** | `area: true` | Closed under-curve `shape()` + gradient |
| **No dots** | `dots: false` | Path only |
| **Labels** | `labels: true` | Values by each point |

Per-series: `{ key: 'uv', curve: 'smooth', area: true }` overrides chart-level `curve` / `area`.

### What `render` creates

| From your data | DOM it writes | CSS does |
| --- | --- | --- |
| Categories / values | `.cc-bar` + `data-v` | bar heights via typed `attr()` |
| Line (default) | ribbon `clip-path: shape()` on `.cc-line-area` | solid series color |
| Area series | under-curve `shape()` | gradient fill + edge |
| Pie / donut | `border-shape: shape(… arc …)` on `.cc-pie-slice` | fill + **border/shadow follow path** |
| Points | `.cc-line-dot` with `--x` / `--y` | position dots |
| Series keys | legend + colors | palette tokens |
| Hover | `interestfor` + `.cc-tip` | tip popovers |

You never hand-build `shape()` or tip IDs unless you want to.

### Data shape

```json
[
  { "name": "A", "uv": 4000, "pv": 2400 },
  { "name": "B", "uv": 3000, "pv": 1398 }
]
```

Pie rows use a single metric:

```json
[
  { "name": "Organic", "value": 42 },
  { "name": "Paid", "value": 28 }
]
```

- Each object = one category (bar), one x-position (line), or one **slice** (pie)
- `series[].key` = which field to plot (bar/line); pie defaults to `valueKey: "value"`
- Series colors follow **order** (`--cc-s1` … `--cc-s6`), not the key name — override with `series[].color`
- Line: `null` / missing values break the path (a gap), they are not plotted as zero
- `nameKey` defaults to `"name"`
- `data` may be a **JSON string** — it is parsed for you

```js
const res = await fetch('/api/stats');
const json = await res.text(); // or res.json()
CssCharts.render(el, { type: 'bar', data: json, series: [{ key: 'uv' }] });
```

## Options

| Option | Default | Notes |
| --- | --- | --- |
| `type` | `'bar'` | `'bar'` \| `'line'` \| `'combo'` \| `'pie'` (`render` only) |
| `data` | required | array or JSON string |
| `series` | required for bar/line/combo | `{ key, label?, type?, axis?, area? }[]` — combo: `type` `'bar'`\|`'line'`, `axis` `'left'`\|`'right'` |
| `layout` | auto | bar/combo: `simple` \| `group` \| `stack` (combo is vertical; `horizontal` ignored) |
| `max` / `min` | inferred / `0` | left domain (stacked bar infers `max` from **row sums**) |
| `maxRight` / `minRight` | inferred / `0` | right Y-axis domain (combo, when any series has `axis: 'right'`) |
| `ticksRight` | same as `ticks` | tick count on the right axis |
| `nameKey` | `'name'` | category / x label field |
| `height` | CSS `--cc-h` | e.g. `'280px'` |
| `labels` | `false` | value labels on marks |
| `legend` | `true` if multi-series | click to dim |
| `tooltip` | auto | `true` (shared if multi-series), `'shared'`, `'point'`, `false` |
| `ticks` | `5` | y-axis tick count |
| `format` / `formatRight` | identity | `(value) => string` for ticks, labels, tips |
| `yTitle` / `yTitleRight` | none | axis captions |
| `refLines` | none | `{ y, label?, axis? }[]` (or a single object) |
| `stackType` | `'normal'` | `'100%'` / `'percent'` with `layout: 'stack'` |
| `grid` | y-only | `'xy'` for vertical + horizontal; `false` to hide |
| `sparkline` | `false` | hide axes, grid, legend |
| `centerLabel` | `'Total'` on donut | `false` to hide; string to retitle |
| `area` | `false` | line: fill under curve for all series |
| `curve` | `'straight'` | line: `'straight'` \| `'smooth'` (or `true`/`false`) |
| `dots` | `true` | line: show point buttons |
| `lineWidth` | `0.9` | line ribbon half-thickness (% of plot height) |

## Features vs Recharts (bar & line)

| Recharts | css-charts |
| --- | --- |
| `data={[…]}` | `data` array / JSON → DOM |
| `BarChart` / `LineChart` / `ComposedChart` / `PieChart` | `type: 'bar' \| 'line' \| 'combo' \| 'pie'` |
| `YAxis orientation="right"` | `axis: 'right'` + `maxRight` / `minRight` |
| `CartesianGrid` / axes / legend | emitted automatically |
| `Tooltip` | `interestfor` + `popover="hint"` |
| Grouped / stacked / horizontal bars | `layout` |
| Multi-series line + area | multiple `series` + `area: true\|false` |
| Line without fill | default (`area` off) |
| SVG / D3 / canvas | **not used** |

## Demo

```bash
npm start
```

→ [http://localhost:8090/demo/](http://localhost:8090/demo/)

Same as `npx serve . -l 8090`. Works on macOS, Windows, and Linux.

| Page | What it shows |
| --- | --- |
| `demo/index.html` | Overview |
| `demo/bar.html` | Bar layouts |
| `demo/line.html` | Line / area modes |
| `demo/combo.html` | Bar + line, dual Y-axis |
| `demo/pie.html` | Pie + donut (`border-shape` + `shape()` arcs) |
| `demo/theme.html` | **CSS-var theming** (Ocean, Aurora, Paper, Neon) |

## Theming (CSS variables)

**Defaults:** shell and plot **background + border are transparent**, so charts drop into any layout. Series colors and type stay themed.

Tokens are layered:

| Layer | Examples | Default |
| --- | --- | --- |
| **Semantic chrome** | `--cc-plot-bg`, `--cc-plot-border`, `--cc-shell-bg`, `--cc-shell-border` | `transparent` |
| **Grid / tips / marks** | `--cc-grid-color`, `--cc-tip-bg`, `--cc-mark-bg` | subtle / solid (tips stay readable) |
| **Primitives** | `--cc-text`, `--cc-s1`…`--cc-s6`, `--cc-accent` | dark/light + series palette |

Opt into filled chrome when you want a card:

```css
.product-chart {
  --cc-plot-bg: rgb(255 255 255 / 0.04);
  --cc-plot-border: rgb(255 255 255 / 0.12);
  --cc-shell-bg: transparent;
  --cc-shell-border: transparent;
  --cc-s1: #38bdf8;
  --cc-s2: #22d3ee;
  --cc-text: #e0f2fe;
  --cc-grid-color: rgb(125 211 252 / 0.2);
}
```

```html
<div class="product-chart">
  <div id="chart"></div>
</div>
```

| Semantic token | Role |
| --- | --- |
| `--cc-shell-bg` / `--cc-shell-border` / `--cc-shell-shadow` | Optional card around the chart |
| `--cc-plot-bg` / `--cc-plot-border` / `--cc-plot-radius` | Drawing area |
| `--cc-grid-color` | Cartesian grid |
| `--cc-tip-bg` / `--cc-tip-border` | Interest tooltips |
| `--cc-mark-bg` | Dot fill / focus ring base |
| `--cc-s1` … `--cc-s6` | Series colors |
| `--cc-text` / `--cc-muted` / `--cc-accent` | Type & UI chrome |

Live demos: [demo/theme.html](./demo/theme.html) — Ocean, Aurora, Paper, Neon (including transparent neon).

## Accessibility (WCAG-oriented)

`render` builds charts with:

| Practice | Implementation |
| --- | --- |
| Text alternative | Visually hidden **data table** (`.cc-sr-table`) with caption |
| Name / role | `role="group"` + `aria-label` / `caption` on the chart root |
| Keyboard | Bars & line points are real `<button>`s |
| Focus visible | 2px accent outline + series ring (2.4.7) |
| Target size | Line dots use ≥24×24px hit area; legend buttons min 24px (2.5.8) |
| Tips | `interestfor` + `role="tooltip"` + `aria-describedby` |
| Not color alone | Series name in `aria-label` and legend text (1.4.1) |
| Motion | `prefers-reduced-motion` disables stagger / transitions |
| Decorative axes | `aria-hidden` on grid / tick chrome |

Options: `ariaLabel`, `caption`, `srTable: false` (opt out of the hidden table).

**Still your responsibility:** page-level contrast when using custom themes on arbitrary backgrounds; ensure series colors meet **3:1** non-text contrast against the plot background (1.4.11).

## Philosophy

1. **JSON in, DOM out** — `render` only builds markup from data.
2. **CSS owns paint** — heights, shapes, colors, motion.
3. **No SVG / canvas / fallbacks** — modern Chromium-class CSS.
4. **Hand markup still works** — `render` is convenience, not required.

## Browser notes

Requires modern CSS: typed `attr()`, `clip-path: shape()`, `border-shape: shape()`, `sibling-index()`, `sin()`, Interest Invokers for tips.

## License

[MIT](./LICENSE)
