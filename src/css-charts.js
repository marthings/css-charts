/**
 * css-charts — JSON data → correct DOM (not a chart engine)
 *
 * Primary path:
 *   CssCharts.render(el, { type: 'bar'|'line'|'pie'|'combo', data, series, … })
 *
 * That writes the HTML structure (bars / shape() areas / dots / tips).
 * CSS paints it. No SVG, no canvas, no drawing loop.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CssCharts = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEFAULTS = { high: 75, low: 42 };

  function bandForValue(v, opts) {
    const high = (opts && opts.high) != null ? opts.high : DEFAULTS.high;
    const low = (opts && opts.low) != null ? opts.low : DEFAULTS.low;
    if (v >= high) return 'high';
    if (v <= low) return 'low';
    return 'mid';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function niceMax(values) {
    const nums = values.filter(function (n) {
      return Number.isFinite(n);
    });
    const m = Math.max.apply(Math, [0].concat(nums));
    if (m === 0) return 100;
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    return Math.ceil(m / pow) * pow;
  }

  const SERIES_TOKENS = ['s1', 's2', 's3', 's4', 's5', 's6'];

  /** Palette token by series index so keys need not be uv/pv/s1. */
  function seriesToken(i) {
    return SERIES_TOKENS[i % SERIES_TOKENS.length];
  }

  function seriesColorDecl(i, s) {
    if (s && s.color) return '--cc-series: ' + String(s.color);
    return '--cc-series: var(--cc-' + seriesToken(i) + ')';
  }

  function rawNum(v) {
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function resolveFormat(opts, side) {
    if (side === 'right' && opts && typeof opts.formatRight === 'function') {
      return opts.formatRight;
    }
    if (opts && typeof opts.format === 'function') return opts.format;
    return null;
  }

  function formatValue(v, opts, side) {
    if (v == null || v === '') return '—';
    const fmt = resolveFormat(opts, side);
    if (!fmt) return String(v);
    try {
      const out = fmt(v, { axis: side || 'left' });
      return out == null ? '—' : String(out);
    } catch (err) {
      return String(v);
    }
  }

  function wantsSharedTooltip(opts, series) {
    const t = opts && opts.tooltip;
    if (t === false) return false;
    if (t === 'point' || t === 'mark') return false;
    if (t === 'shared') return true;
    return !!(series && series.length > 1);
  }

  function isPercentStack(opts, layout) {
    return (
      layout === 'stack' &&
      opts &&
      (opts.stackType === '100%' ||
        opts.stackType === 'percent' ||
        opts.percent === true)
    );
  }

  function isSparkline(opts) {
    return !!(opts && opts.sparkline);
  }

  function gridHtml(opts) {
    if (isSparkline(opts) || (opts && opts.grid === false)) return '';
    const vert =
      opts && (opts.grid === 'xy' || opts.grid === 'both' || opts.verticalGrid);
    return (
      '<div class="cc-grid" aria-hidden="true"' +
      (vert ? ' data-vertical' : '') +
      '></div>'
    );
  }

  function refLinesHtml(opts, min, max, minRight, maxRight) {
    const raw = opts && (opts.refLines || opts.refLine);
    if (raw == null) return '';
    const lines = Array.isArray(raw) ? raw : [raw];
    return lines
      .map(function (line) {
        if (line == null || typeof line !== 'object') {
          line = { y: line };
        }
        const y = rawNum(line.y != null ? line.y : line.value);
        if (y == null) return '';
        const right = line.axis === 'right';
        const lo = right ? minRight : min;
        const hi = right ? maxRight : max;
        const span = hi - lo || 1;
        const pct = ((y - lo) / span) * 100;
        const label = line.label != null ? String(line.label) : '';
        return (
          '<div class="cc-ref-line" style="--cc-ref: ' +
          round2(pct) +
          '%" data-label="' +
          escapeHtml(label) +
          '"></div>'
        );
      })
      .join('');
  }

  function yTitleText(opts, side) {
    if (!opts) return '';
    if (side === 'right') return opts.yTitleRight || opts.yLabelRight || '';
    return opts.yTitle || opts.yLabel || '';
  }

  function finiteMin(opts) {
    if (!opts || opts.min == null) return 0;
    const n = Number(opts.min);
    return Number.isFinite(n) ? n : 0;
  }

  function finiteMax(opts, values, min) {
    const lo = min != null ? min : 0;
    let max =
      opts && opts.max != null ? Number(opts.max) : niceMax(values.concat([lo]));
    if (!Number.isFinite(max) || !(max > lo)) max = lo + 1;
    return max;
  }

  /** Domain values: stacked bars use per-row sums, otherwise each cell. */
  function domainValues(data, series, layout) {
    const values = [];
    if (layout === 'stack') {
      data.forEach(function (row) {
        let sum = 0;
        series.forEach(function (s) {
          const n = rawNum(row[s.key]);
          if (n != null) sum += n;
        });
        values.push(sum);
      });
      return values;
    }
    data.forEach(function (row) {
      series.forEach(function (s) {
        const n = rawNum(row[s.key]);
        if (n != null) values.push(n);
      });
    });
    return values;
  }

  function yTicks(max, count, min) {
    const lo = min != null && Number.isFinite(Number(min)) ? Number(min) : 0;
    const n = Math.max(2, count || 5);
    const span = max - lo;
    const ticks = [];
    for (let i = n - 1; i >= 0; i--) {
      ticks.push(Math.round(lo + (span * i) / (n - 1)));
    }
    return ticks;
  }

  function clearChart(el) {
    if (el) el.innerHTML = '';
    return null;
  }

  /**
   * Y labels + grid share the same scale: --y 0% = top (max), 100% = bottom (min).
   * Sets --cc-grid-divisions so horizontal rules hit each tick.
   */
  function isRightAxis(s) {
    return !!(s && (s.axis === 'right' || s.yAxisId === 'right'));
  }

  function seriesType(s, fallback) {
    if (s && (s.type === 'line' || s.type === 'bar')) return s.type;
    return fallback || 'bar';
  }

  /** Mixed bar+line, or any series on the right axis — opt-in combo. */
  function wantsCombo(series, type) {
    if (type === 'combo' || type === 'composed') return true;
    if (type !== 'bar' && type !== 'line') return false;
    if (!series || !series.length) return false;
    const fallback = type === 'line' ? 'line' : 'bar';
    let sawBar = false;
    let sawLine = false;
    let sawRight = false;
    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      if (isRightAxis(s)) sawRight = true;
      const kind = seriesType(s, fallback);
      if (kind === 'line') sawLine = true;
      else sawBar = true;
    }
    return sawRight || (sawBar && sawLine);
  }

  function finiteMinOn(opts, side) {
    if (side === 'right') {
      if (!opts || opts.minRight == null) return 0;
      const n = Number(opts.minRight);
      return Number.isFinite(n) ? n : 0;
    }
    return finiteMin(opts);
  }

  function finiteMaxOn(opts, values, min, side) {
    const key = side === 'right' ? 'maxRight' : 'max';
    const lo = min != null ? min : 0;
    let max =
      opts && opts[key] != null ? Number(opts[key]) : niceMax(values.concat([lo]));
    if (!Number.isFinite(max) || !(max > lo)) max = lo + 1;
    return max;
  }

  function yAtScale(min, max) {
    const domain = max - min || 1;
    return function (v) {
      return ((max - Number(v)) / domain) * 100;
    };
  }

  function yAxisHtml(ticks, side, opts) {
    if (isSparkline(opts)) return '';
    const n = ticks.length;
    const divs = Math.max(1, n - 1);
    const extra = side === 'right' ? ' cc-y-axis--right' : '';
    const title = yTitleText(opts, side);
    const titleHtml = title
      ? '<span class="cc-y-title">' + escapeHtml(title) + '</span>'
      : '';
    return (
      '<div class="cc-y-axis' +
      extra +
      '" aria-hidden="true" style="--cc-grid-divisions: ' +
      divs +
      '">' +
      titleHtml +
      ticks
        .map(function (t, i) {
          const y = n <= 1 ? 0 : (i / (n - 1)) * 100;
          return (
            '<span style="--y: ' +
            round2(y) +
            '">' +
            escapeHtml(formatValue(t, opts, side)) +
            '</span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function applyGridDivisions(el, tickCount) {
    const divs = Math.max(1, (tickCount || 5) - 1);
    el.style.setProperty('--cc-grid-divisions', String(divs));
  }

  function syncBarMark(el, opts) {
    const v = Number(el.getAttribute('data-v')) || 0;
    /* typed attr() reads data-v; --v only when author sets it explicitly in CSS overrides */
    if (el.hasAttribute('data-band') || (opts && opts.bands)) {
      el.setAttribute('data-band', bandForValue(v, opts));
    }
    const cat = el.closest('.cc-cat');
    const label =
      el.getAttribute('data-label') ||
      (cat && cat.getAttribute('data-label')) ||
      '';
    const series = el.getAttribute('data-series') || '';
    const name = [label, series].filter(Boolean).join(', ');
    if (!el.getAttribute('aria-label')) {
      el.setAttribute('aria-label', name ? name + ': ' + v : String(v));
    }
    const valEl = el.querySelector('.cc-bar-value');
    if (valEl && !valEl.dataset.locked) valEl.textContent = String(v);
  }

  function syncAllBars(root, opts) {
    const scope = root || document;
    scope.querySelectorAll('.cc-bar[data-v]').forEach(function (el) {
      syncBarMark(el, opts);
    });
    scope.querySelectorAll('.cc-bar-col[data-v]').forEach(function (el) {
      const v = Number(el.getAttribute('data-v')) || 0;
      const label = el.getAttribute('data-label') || '';
      el.setAttribute('data-band', bandForValue(v, opts));
      el.setAttribute('aria-label', label ? label + ', ' + v : String(v));
    });
  }

  function setSeriesOff(chart, key, off) {
    const marks = chart.querySelectorAll('.cc-bar, .cc-line-layer, .cc-pie-slice');
    for (let i = 0; i < marks.length; i++) {
      const el = marks[i];
      if (el.getAttribute('data-series') !== key) continue;
      if (off) {
        el.setAttribute('data-off', '');
        el.inert = true;
      } else {
        el.removeAttribute('data-off');
        el.inert = false;
      }
    }
  }

  function bindLegend(chart) {
    chart.querySelectorAll('.cc-legend button[data-series]').forEach(function (btn) {
      if (btn.dataset.ccLegendBound) return;
      btn.dataset.ccLegendBound = '1';
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-series');
        const off = !btn.hasAttribute('data-off');
        if (off) btn.setAttribute('data-off', '');
        else btn.removeAttribute('data-off');
        btn.setAttribute('aria-pressed', off ? 'false' : 'true');
        setSeriesOff(chart, key, off);
      });
    });
  }

  /**
   * Visually hidden data table for screen readers (WCAG 1.1.1 / chart alternative).
   */
  function dataTableHtml(data, series, opts) {
    const nameKey = (opts && opts.nameKey) || 'name';
    const caption =
      (opts && (opts.caption || opts.ariaLabel)) ||
      ((opts && opts.type) === 'line'
        ? 'Line chart data'
        : (opts && opts.type) === 'pie'
          ? 'Pie chart data'
          : (opts && opts.type) === 'combo'
            ? 'Combo chart data'
            : 'Bar chart data');
    const head =
      '<thead><tr><th scope="col">' +
      escapeHtml((opts && opts.categoryLabel) || 'Category') +
      '</th>' +
      series
        .map(function (s) {
          return (
            '<th scope="col">' + escapeHtml(s.label || s.key) + '</th>'
          );
        })
        .join('') +
      '</tr></thead>';
    const body =
      '<tbody>' +
      data
        .map(function (row, i) {
          const cat = row[nameKey] != null ? row[nameKey] : i;
          return (
            '<tr><th scope="row">' +
            escapeHtml(cat) +
            '</th>' +
            series
              .map(function (s) {
                const v = row[s.key];
                const side = isRightAxis(s) ? 'right' : 'left';
                const shown =
                  v == null || v === ''
                    ? '—'
                    : formatValue(v, opts, side);
                return '<td>' + escapeHtml(shown) + '</td>';
              })
              .join('') +
            '</tr>'
          );
        })
        .join('') +
      '</tbody>';
    return (
      '<table class="cc-sr-table">' +
      '<caption>' +
      escapeHtml(caption) +
      '</caption>' +
      head +
      body +
      '</table>'
    );
  }

  function legendHtml(series, opts) {
    if (opts && opts.legend === false) return '';
    const force = opts && opts.legend === true;
    if (!series || (series.length < 2 && !force)) return '';

    return (
      '<ul class="cc-legend">' +
      series
        .map(function (s, i) {
          const label = s.label || s.key;
          return (
            '<li>' +
            '<button type="button" data-series="' +
            escapeHtml(s.key) +
            '" style="' +
            seriesColorDecl(i, s) +
            '" aria-pressed="true" aria-label="Toggle series ' +
            escapeHtml(label) +
            '">' +
            '<span class="cc-swatch" data-series="' +
            escapeHtml(s.key) +
            '" aria-hidden="true"></span>' +
            '<span class="cc-legend-text">' +
            escapeHtml(label) +
            '</span>' +
            '</button></li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }

  function applyChartA11y(el, opts, kind) {
    const fallback =
      kind === 'line'
        ? 'Line chart'
        : kind === 'pie'
          ? 'Pie chart'
          : kind === 'combo'
            ? 'Combo chart'
            : 'Bar chart';
    const label =
      (opts && opts.ariaLabel) || (opts && opts.caption) || fallback;
    el.setAttribute('role', 'group');
    el.setAttribute('aria-label', label);
  }

  function staggerPlot(plot) {
    if (!plot) return;
    plot.classList.remove('is-running');
    void plot.offsetWidth;
    plot.classList.add('is-running');
  }

  /**
   * Accept array or JSON string (common when data comes from an API/file).
   * @param {Array|string} data
   * @returns {Array}
   */
  function normalizeData(data) {
    if (data == null) return [];
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new TypeError('css-charts: data JSON must be an array of row objects');
      }
      return parsed;
    }
    if (Array.isArray(data)) return data;
    throw new TypeError('css-charts: data must be an array or JSON string');
  }

  function seriesWantsArea(s, opts) {
    if (s.area != null) return !!s.area;
    if (opts && opts.area != null) return !!opts.area;
    return false;
  }

  function seriesWantsCurve(s, opts) {
    const v = s.curve != null ? s.curve : opts && opts.curve;
    if (v == null || v === false || v === 'straight' || v === 'linear') {
      return false;
    }
    return true;
  }

  function smoothSegmentControls(pts, i) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const clamp = function (n, a, b) {
      return Math.max(a, Math.min(b, n));
    };
    return {
      cp1: {
        x: clamp(p1.x + (p2.x - p0.x) / 6, 0, 100),
        y: clamp(p1.y + (p2.y - p0.y) / 6, 0, 100),
      },
      cp2: {
        x: clamp(p2.x - (p3.x - p1.x) / 6, 0, 100),
        y: clamp(p2.y - (p3.y - p1.y) / 6, 0, 100),
      },
    };
  }

  function pathAlong(pts, curved, startIndex) {
    const start = startIndex != null ? startIndex : 1;
    const cmds = [];
    if (!curved || pts.length < 2) {
      for (let i = start; i < pts.length; i++) {
        cmds.push(
          'line to ' + round2(pts[i].x) + '% ' + round2(pts[i].y) + '%'
        );
      }
      return cmds;
    }
    for (let i = start - 1; i < pts.length - 1; i++) {
      if (i < 0) continue;
      const c = smoothSegmentControls(pts, i);
      const p2 = pts[i + 1];
      cmds.push(
        'curve to ' +
          round2(p2.x) +
          '% ' +
          round2(p2.y) +
          '% with ' +
          round2(c.cp1.x) +
          '% ' +
          round2(c.cp1.y) +
          '% / ' +
          round2(c.cp2.x) +
          '% ' +
          round2(c.cp2.y) +
          '%'
      );
    }
    return cmds;
  }

  function areaShape(pts, curved) {
    if (!pts.length) return 'shape(from 0% 100%, close)';
    const x0 = round2(pts[0].x);
    const x1 = round2(pts[pts.length - 1].x);
    const parts = ['from ' + x0 + '% 100%'];
    parts.push(
      'line to ' + round2(pts[0].x) + '% ' + round2(pts[0].y) + '%'
    );
    pathAlong(pts, curved, 1).forEach(function (c) {
      parts.push(c);
    });
    parts.push('line to ' + x1 + '% 100%', 'close');
    return 'shape(' + parts.join(', ') + ')';
  }

  function lineRibbonShape(pts, thickness, curved) {
    const t = thickness != null ? thickness : 0.9;
    if (!pts.length) return 'shape(from 0% 50%, close)';
    const tops = pts.map(function (p) {
      return { x: p.x, y: Math.max(0, p.y - t) };
    });
    const bots = pts.map(function (p) {
      return { x: p.x, y: Math.min(100, p.y + t) };
    });
    const botRev = bots.slice().reverse();
    const parts = [
      'from ' + round2(tops[0].x) + '% ' + round2(tops[0].y) + '%',
    ];
    pathAlong(tops, curved, 1).forEach(function (c) {
      parts.push(c);
    });
    parts.push(
      'line to ' +
        round2(botRev[0].x) +
        '% ' +
        round2(botRev[0].y) +
        '%'
    );
    pathAlong(botRev, curved, 1).forEach(function (c) {
      parts.push(c);
    });
    parts.push('close');
    return 'shape(' + parts.join(', ') + ')';
  }

  /**
   * Line series layers. ctx.xAt(i), ctx.yAt(s, v), ctx.tipParts (mutated).
   */
  function buildLineLayers(data, series, ctx) {
    const nameKey = ctx.nameKey || 'name';
    const opts = ctx.opts || {};
    const base = ctx.base;
    const tipParts = ctx.tipParts;
    const useTips = ctx.useTips !== false;
    const showDots = ctx.showDots !== false;
    const showLabels = !!ctx.labels;
    const ribbonT = ctx.lineWidth != null ? Number(ctx.lineWidth) : 0.9;

    const shared = !!ctx.shared;
    const formatOpts = ctx.formatOpts || opts;
    const axisSide = function (s) {
      return isRightAxis(s) ? 'right' : 'left';
    };

    return series
      .map(function (s) {
        const si = s._si != null ? s._si : 0;
        const pts = data.map(function (row, i) {
          const v = rawNum(row[s.key]);
          const gap = v == null;
          return {
            x: ctx.xAt(i),
            y: gap ? null : ctx.yAt(s, v),
            v: v,
            gap: gap,
            name: String(row[nameKey] != null ? row[nameKey] : i),
            i: i,
          };
        });

        const showArea = seriesWantsArea(s, opts);
        const curved = seriesWantsCurve(s, opts);
        const segs = [];
        let cur = [];
        pts.forEach(function (p) {
          if (p.gap) {
            if (cur.length) {
              segs.push(cur);
              cur = [];
            }
          } else {
            cur.push(p);
          }
        });
        if (cur.length) segs.push(cur);

        const colorDecl = seriesColorDecl(si, s);
        let layerOpen =
          '<div class="cc-line-layer" data-series="' +
          escapeHtml(s.key) +
          '" data-area="' +
          (showArea ? 'true' : 'false') +
          '" data-curve="' +
          (curved ? 'smooth' : 'straight') +
          '" style="' +
          colorDecl +
          '"';
        if (!showDots) layerOpen += ' data-dots="false"';
        layerOpen += '>';

        const thick =
          s.lineWidth != null ? Number(s.lineWidth) : ribbonT;
        const areaEl = segs
          .map(function (seg) {
            const clip = showArea
              ? areaShape(seg, curved)
              : lineRibbonShape(seg, thick, curved);
            return (
              '<div class="cc-line-area" style="clip-path: ' +
              clip +
              '" aria-hidden="true"></div>'
            );
          })
          .join('');

        const seriesLabel = s.label || s.key;
        const side = axisSide(s);
        const dots = showDots
          ? pts
              .map(function (p) {
                if (p.gap) return '';
                const sharedId =
                  shared && ctx.sharedIdAt ? ctx.sharedIdAt(p.i) : '';
                const id = sharedId
                  ? sharedId
                  : base + '-l-' + si + '-' + p.i + '-' + safeIdPart(s.key);
                const shown = formatValue(p.v, formatOpts, side);
                if (useTips && !shared) {
                  tipParts.push(
                    buildInterestTip(id, {
                      title: p.name,
                      series: s.key,
                      seriesLabel: seriesLabel,
                      value: shown,
                      colorDecl: colorDecl,
                    }).tipHtml
                  );
                }
                const style =
                  '--x:' +
                  round2(p.x) +
                  '%;--y:' +
                  round2(p.y) +
                  '%;anchor-name: --' +
                  id;
                const label = showLabels
                  ? '<span class="cc-line-label" aria-hidden="true" style="--x:' +
                    round2(p.x) +
                    '%;--y:' +
                    round2(p.y) +
                    '%">' +
                    escapeHtml(shown) +
                    '</span>'
                  : '';
                const interestfor = useTips
                  ? ' interestfor="' + escapeHtml(id) + '"'
                  : '';
                const describedby = useTips
                  ? ' aria-describedby="' + escapeHtml(id) + '"'
                  : '';
                return (
                  '<button type="button" class="cc-line-dot" data-series="' +
                  escapeHtml(s.key) +
                  '" style="' +
                  style +
                  '" data-val="' +
                  p.v +
                  '" data-label="' +
                  escapeHtml(p.name) +
                  '" aria-label="' +
                  escapeHtml(p.name) +
                  ', ' +
                  escapeHtml(seriesLabel) +
                  ': ' +
                  escapeHtml(shown) +
                  '"' +
                  describedby +
                  interestfor +
                  '></button>' +
                  label
                );
              })
              .join('')
          : '';

        return (
          layerOpen +
          areaEl +
          '<div class="cc-line-points">' +
          dots +
          '</div></div>'
        );
      })
      .join('');
  }

  function sharedItemsForRow(seriesList, row, opts) {
    return seriesList.map(function (s, i) {
      const si = s._si != null ? s._si : i;
      const v = rawNum(row[s.key]);
      const side = isRightAxis(s) ? 'right' : 'left';
      return {
        series: s.key,
        seriesLabel: s.label || s.key,
        value: v == null ? '—' : formatValue(v, opts, side),
        colorDecl: seriesColorDecl(si, s),
      };
    });
  }

  function xAxisHtml(data, nameKey, opts) {
    if (isSparkline(opts)) return '';
    return (
      '<div class="cc-x-axis" aria-hidden="true">' +
      data
        .map(function (row, i) {
          return (
            '<span>' +
            escapeHtml(row[nameKey] != null ? row[nameKey] : i) +
            '</span>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  function applyChromeAttrs(el, opts) {
    if (isSparkline(opts)) el.setAttribute('data-sparkline', '');
    else el.removeAttribute('data-sparkline');
    if (yTitleText(opts, 'left') || yTitleText(opts, 'right')) {
      el.setAttribute('data-y-title', '');
    } else {
      el.removeAttribute('data-y-title');
    }
    if (opts && opts.labels) el.setAttribute('data-labels', '');
    else el.removeAttribute('data-labels');
  }

  function hitsHtml(data, base, opts) {
    if (isSparkline(opts)) return '';
    return (
      '<div class="cc-hits" aria-hidden="true">' +
      data
        .map(function (row, i) {
          const id = base + '-c-' + i;
          return (
            '<button type="button" class="cc-hit" tabindex="-1" interestfor="' +
            escapeHtml(id) +
            '" style="anchor-name: --' +
            id +
            '"></button>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  /**
   * JSON (or row array) → DOM. Single entry point.
   *
   * @param {HTMLElement} el  empty container (replaced with chart markup)
   * @param {{
   *   type: 'bar'|'line'|'pie'|'combo',
   *   data: Array<Record<string, string|number>>|string,
   *   series: Array<{ key: string, label?: string, area?: boolean }>,
   *   layout?: 'simple'|'group'|'stack'|'horizontal',
   *   max?: number,
   *   min?: number,
   *   height?: string,
   *   nameKey?: string,
   *   valueKey?: string,
   *   labels?: boolean,
   *   legend?: boolean,
   *   tooltip?: boolean,
   *   ticks?: number,
   *   donut?: boolean,
   *   innerRadius?: number,
   * }} opts
   */
  function render(el, opts) {
    if (!el || !opts) return null;
    const type = opts.type || el.getAttribute('data-type') || 'bar';
    const data = normalizeData(opts.data);
    const next = Object.assign({}, opts, { data: data, type: type });

    if (type === 'pie') return renderPie(el, next);
    if (wantsCombo(opts.series, type)) return renderCombo(el, next);
    if (type === 'line') return renderLine(el, next);
    if (type === 'bar') return renderBar(el, next);
    throw new Error(
      'css-charts: unknown type "' +
        type +
        '" (use "bar", "line", "pie", or "combo")'
    );
  }

  /** Polar → % point. 0° at top, clockwise (typical pie). */
  function polarPct(cx, cy, r, deg) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + r * Math.sin(rad),
      y: cy - r * Math.cos(rad),
    };
  }

  /**
   * Pie/donut wedge as shape() with arc (fed to border-shape, no SVG).
   * Angles in degrees, 0 at top, clockwise. Center at 50%/50%.
   */
  function pieWedgeShape(startDeg, endDeg, opts) {
    const cx = 50;
    const cy = 50;
    const r = opts && opts.radius != null ? opts.radius : 49.5;
    const inner =
      opts && opts.innerRadius != null ? opts.innerRadius : 0;

    let sweep = endDeg - startDeg;
    if (sweep < 0) sweep += 360;
    if (sweep > 359.95) {
      /* Full circle / full ring */
      if (inner > 0) {
        return (
          'shape(' +
          'from ' +
          cx +
          '% ' +
          round2(cy - r) +
          '%, ' +
          'arc to ' +
          cx +
          '% ' +
          round2(cy + r) +
          '% of ' +
          r +
          '% large cw, ' +
          'arc to ' +
          cx +
          '% ' +
          round2(cy - r) +
          '% of ' +
          r +
          '% large cw, ' +
          'close, ' +
          'from ' +
          cx +
          '% ' +
          round2(cy - inner) +
          '%, ' +
          'arc to ' +
          cx +
          '% ' +
          round2(cy + inner) +
          '% of ' +
          inner +
          '% large ccw, ' +
          'arc to ' +
          cx +
          '% ' +
          round2(cy - inner) +
          '% of ' +
          inner +
          '% large ccw, ' +
          'close)'
        );
      }
      return (
        'shape(' +
        'from ' +
        cx +
        '% ' +
        round2(cy - r) +
        '%, ' +
        'arc to ' +
        cx +
        '% ' +
        round2(cy + r) +
        '% of ' +
        r +
        '% large cw, ' +
        'arc to ' +
        cx +
        '% ' +
        round2(cy - r) +
        '% of ' +
        r +
        '% large cw, ' +
        'close)'
      );
    }

    const p0 = polarPct(cx, cy, r, startDeg);
    const p1 = polarPct(cx, cy, r, endDeg);
    const large = sweep > 180 ? 'large' : 'small';

    if (inner > 0) {
      const i1 = polarPct(cx, cy, inner, endDeg);
      const i0 = polarPct(cx, cy, inner, startDeg);
      return (
        'shape(' +
        'from ' +
        round2(p0.x) +
        '% ' +
        round2(p0.y) +
        '%, ' +
        'arc to ' +
        round2(p1.x) +
        '% ' +
        round2(p1.y) +
        '% of ' +
        r +
        '% ' +
        large +
        ' cw, ' +
        'line to ' +
        round2(i1.x) +
        '% ' +
        round2(i1.y) +
        '%, ' +
        'arc to ' +
        round2(i0.x) +
        '% ' +
        round2(i0.y) +
        '% of ' +
        inner +
        '% ' +
        large +
        ' ccw, ' +
        'close)'
      );
    }

    return (
      'shape(' +
      'from ' +
      cx +
      '% ' +
      cy +
      '%, ' +
      'line to ' +
      round2(p0.x) +
      '% ' +
      round2(p0.y) +
      '%, ' +
      'arc to ' +
      round2(p1.x) +
      '% ' +
      round2(p1.y) +
      '% of ' +
      r +
      '% ' +
      large +
      ' cw, ' +
      'close)'
    );
  }

  /**
   * Normalize pie rows: { name, value } from valueKey or first series key.
   */
  function pieSlicesFromData(data, opts) {
    const nameKey = (opts && opts.nameKey) || 'name';
    const valueKey =
      (opts && opts.valueKey) ||
      (opts && opts.series && opts.series[0] && opts.series[0].key) ||
      'value';
    const seriesKeys = ['s1', 's2', 's3', 's4', 's5', 's6'];

    return data.map(function (row, i) {
      const name = row[nameKey] != null ? String(row[nameKey]) : 'Slice ' + (i + 1);
      const value = Math.max(0, Number(row[valueKey]) || 0);
      const seriesKey =
        (row.series && String(row.series)) || seriesKeys[i % seriesKeys.length];
      const label =
        (opts &&
          opts.series &&
          opts.series[i] &&
          (opts.series[i].label || opts.series[i].key)) ||
        name;
      return {
        name: name,
        value: value,
        seriesKey: seriesKey,
        label: label,
        raw: row,
      };
    });
  }

  /**
   * Pie / donut chart — each slice is clip-path: shape(… arc …).
   */
  function renderPie(el, opts) {
    if (!el || !opts) return null;
    const data = normalizeData(opts.data);
    if (!data.length) return clearChart(el);

    const slices = pieSlicesFromData(data, opts);
    const total = slices.reduce(function (sum, s) {
      return sum + s.value;
    }, 0);
    if (total <= 0) return clearChart(el);

    const useTips = opts.tooltip !== false;
    const showLegend = opts.legend !== false;
    const donut = !!(opts.donut || (opts.innerRadius != null && opts.innerRadius > 0));
    const innerFrac =
      opts.innerRadius != null
        ? Math.min(0.9, Math.max(0, Number(opts.innerRadius)))
        : donut
          ? 0.55
          : 0;
    const outerR = 49.5;
    const innerR = outerR * innerFrac;
    const base = tipBaseId(el);
    const tipParts = [];

    let angle = 0; /* start at top, go clockwise */
    /* tiny offset so first seam is at 12 o'clock */
    const sliceHtml = slices
      .map(function (s, i) {
        const sweep = (s.value / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;

        const shape = pieWedgeShape(start, end, {
          radius: outerR,
          innerRadius: innerR,
        });
        const pct = round2((s.value / total) * 100);
        const id = base + '-p-' + i + '-' + safeIdPart(s.seriesKey);
        const colorDecl = seriesColorDecl(
          i,
          (opts.series && opts.series[i]) || { color: s.raw && s.raw.color }
        );
        const shown = formatValue(s.value, opts, 'left');
        let interestfor = '';
        let describedby = '';
        /* Geometry via --cc-slice-shape → border-shape (borders/shadows follow path).
           Not corner-shape (that only styles border-radius corners). */
        let style =
          '--cc-slice-shape: ' + shape + '; ' + colorDecl;
        if (useTips) {
          tipParts.push(
            buildInterestTip(id, {
              title: s.name,
              series: s.seriesKey,
              seriesLabel: s.label,
              value: shown + ' (' + pct + '%)',
              colorDecl: colorDecl,
            }).tipHtml
          );
          interestfor = ' interestfor="' + escapeHtml(id) + '"';
          describedby = ' aria-describedby="' + escapeHtml(id) + '"';
          style += '; anchor-name: --' + id;
        }

        return (
          '<button type="button" class="cc-pie-slice" data-series="' +
          escapeHtml(s.seriesKey) +
          '" data-v="' +
          s.value +
          '" data-label="' +
          escapeHtml(s.name) +
          '" style="' +
          style +
          '"' +
          ' aria-label="' +
          escapeHtml(s.name) +
          ': ' +
          escapeHtml(shown) +
          ' (' +
          pct +
          '%)"' +
          describedby +
          interestfor +
          '></button>'
        );
      })
      .join('');

    const legendSeries = slices.map(function (s, i) {
      return {
        key: s.seriesKey,
        label: s.name,
        color:
          (opts.series && opts.series[i] && opts.series[i].color) ||
          (s.raw && s.raw.color),
      };
    });
    const legend = showLegend
      ? legendHtml(legendSeries, Object.assign({}, opts, { legend: true }))
      : '';

    const tips =
      useTips && tipParts.length
        ? '<div class="cc-tips">' + tipParts.join('') + '</div>'
        : '';

    /* SR table: name, value, percent */
    const tableRows = slices.map(function (s) {
      const row = {};
      row[(opts && opts.nameKey) || 'name'] = s.name;
      row.value = s.value;
      row.percent = round2((s.value / total) * 100) + '%';
      return row;
    });
    const srTable =
      opts.srTable === false
        ? ''
        : dataTableHtml(tableRows, [
            { key: 'value', label: 'Value' },
            { key: 'percent', label: 'Percent' },
          ], Object.assign({}, opts, {
            type: 'pie',
            caption: opts.caption || opts.ariaLabel || 'Pie chart data',
          }));

    el.classList.add('cc-chart');
    el.setAttribute('data-type', 'pie');
    if (donut || innerR > 0) el.setAttribute('data-donut', '');
    else el.removeAttribute('data-donut');
    applyChartA11y(el, opts, 'pie');
    if (opts.size) el.style.setProperty('--cc-pie-size', opts.size);
    if (opts.height) el.style.setProperty('--cc-h', opts.height);

    const showCenter =
      (donut || innerR > 0) && opts.centerLabel !== false;
    const centerHtml = showCenter
      ? '<div class="cc-pie-center" aria-hidden="true">' +
        '<strong>' +
        escapeHtml(formatValue(total, opts, 'left')) +
        '</strong>' +
        '<span>' +
        escapeHtml(opts.centerLabel != null && opts.centerLabel !== true
          ? String(opts.centerLabel)
          : 'Total') +
        '</span></div>'
      : '';

    el.innerHTML =
      srTable +
      '<div class="cc-pie">' +
      '<div class="cc-pie-plot' +
      (donut || innerR > 0 ? ' is-donut' : '') +
      '">' +
      sliceHtml +
      centerHtml +
      '</div>' +
      legend +
      '</div>' +
      tips;

    bindLegend(el);
    const plot = el.querySelector('.cc-pie-plot');
    if (plot && typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        plot.classList.add('is-running');
      });
    } else if (plot) {
      plot.classList.add('is-running');
    }

    return { total: total, slices: slices, el: el };
  }

  let tipSeq = 0;

  function tipBaseId(el) {
    tipSeq += 1;
    const raw = (el && el.id) || 'cc';
    return raw.replace(/[^a-zA-Z0-9_-]/g, '') + '-t' + tipSeq;
  }

  function safeIdPart(s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '_') || 'x';
  }

  /**
   * Interest Invoker tip: popover="hint" + position-anchor.
   * @returns {{ invokerAttrs: string, tipHtml: string }}
   */
  function buildInterestTip(id, opts) {
    const title = opts.title || '';
    const series = opts.series || '';
    const seriesLabel = opts.seriesLabel || series;
    const value = opts.value;
    const extra = opts.extra || '';
    const colorDecl = opts.colorDecl || '';
    const items = opts.items;
    const swatchStyle = colorDecl ? ' style="' + colorDecl + '"' : '';

    const invokerAttrs =
      ' interestfor="' +
      escapeHtml(id) +
      '" style="anchor-name: --' +
      escapeHtml(id) +
      '"';

    let rows;
    if (items && items.length) {
      rows =
        '<ul class="cc-tip-rows">' +
        items
          .map(function (it) {
            const st = it.colorDecl ? ' style="' + it.colorDecl + '"' : '';
            return (
              '<li>' +
              '<span class="cc-tip-swatch" data-series="' +
              escapeHtml(it.series || '') +
              '"' +
              st +
              '></span>' +
              escapeHtml(it.seriesLabel || it.series || '') +
              '<span class="cc-tip-val">' +
              escapeHtml(it.value) +
              '</span></li>'
            );
          })
          .join('') +
        '</ul>';
    } else if (series) {
      rows =
        '<ul class="cc-tip-rows">' +
        '<li>' +
        '<span class="cc-tip-swatch" data-series="' +
        escapeHtml(series) +
        '"' +
        swatchStyle +
        '></span>' +
        escapeHtml(seriesLabel) +
        '<span class="cc-tip-val">' +
        escapeHtml(value) +
        '</span></li></ul>';
    } else {
      rows =
        '<p>' +
        escapeHtml(value) +
        (extra ? ' · ' + escapeHtml(extra) : '') +
        '</p>';
    }

    const tipHtml =
      '<div id="' +
      escapeHtml(id) +
      '" popover="hint" class="cc-tip" role="tooltip" style="position-anchor: --' +
      escapeHtml(id) +
      '">' +
      '<strong>' +
      escapeHtml(title) +
      '</strong>' +
      rows +
      '</div>';

    return { invokerAttrs: invokerAttrs, tipHtml: tipHtml };
  }

  /**
   * Render a cartesian bar chart (Recharts-like data API → HTML).
   * Tooltips: interestfor + popover="hint" (opts.tooltip !== false).
   */
  function renderBar(el, opts) {
    if (!el || !opts) return null;
    if (!opts.series || !opts.series.length) return clearChart(el);
    const data = normalizeData(opts.data);
    if (!data.length) return clearChart(el);

    const nameKey = opts.nameKey || 'name';
    const layout =
      opts.layout || (opts.series.length > 1 ? 'group' : 'simple');
    const percent = isPercentStack(opts, layout);
    const min = percent ? 0 : finiteMin(opts);
    const max = percent
      ? 100
      : finiteMax(opts, domainValues(data, opts.series, layout), min);
    const ticks = yTicks(max, opts.ticks || 5, min);
    const spark = isSparkline(opts);
    const showLegend =
      opts.legend === true ||
      (!spark && opts.legend !== false && opts.series.length > 1);
    const useTips = opts.tooltip !== false && !spark;
    const shared = useTips && wantsSharedTooltip(opts, opts.series);
    const base = tipBaseId(el);
    const tipParts = [];

    const cats = data
      .map(function (row, i) {
        const name = row[nameKey] != null ? row[nameKey] : 'Item ' + (i + 1);
        const catId = base + '-c-' + i;
        let sum = 0;
        if (percent) {
          opts.series.forEach(function (s) {
            const n = rawNum(row[s.key]);
            if (n != null) sum += Math.max(0, n);
          });
        }
        if (shared) {
          tipParts.push(
            buildInterestTip(catId, {
              title: String(name),
              items: sharedItemsForRow(opts.series, row, opts),
            }).tipHtml
          );
        }
        const bars = opts.series
          .map(function (s, si) {
            const raw = rawNum(row[s.key]);
            const v =
              percent && sum > 0 && raw != null
                ? (Math.max(0, raw) / sum) * 100
                : raw == null
                  ? 0
                  : raw;
            const seriesLabel = s.label || s.key;
            const id = shared ? catId : base + '-b-' + i + '-' + safeIdPart(s.key);
            const colorDecl = seriesColorDecl(si, s);
            const styleParts = [colorDecl];
            const shown = percent
              ? resolveFormat(opts, 'left')
                ? formatValue(round2(v), opts, 'left')
                : round2(v) + '%'
              : formatValue(raw, opts, 'left');
            let interest = '';
            if (useTips) {
              if (!shared) {
                const tip = buildInterestTip(id, {
                  title: name,
                  series: s.key,
                  seriesLabel: seriesLabel,
                  value: shown,
                  colorDecl: colorDecl,
                });
                tipParts.push(tip.tipHtml);
              }
              interest = ' interestfor="' + escapeHtml(id) + '"';
              styleParts.push('anchor-name: --' + id);
            }
            const describedby = useTips
              ? ' aria-describedby="' + escapeHtml(id) + '"'
              : '';
            return (
              '<button type="button" class="cc-bar" data-series="' +
              escapeHtml(s.key) +
              '" data-v="' +
              round2(v) +
              '" data-label="' +
              escapeHtml(name) +
              '" style="' +
              styleParts.join('; ') +
              '" aria-label="' +
              escapeHtml(name) +
              ', ' +
              escapeHtml(seriesLabel) +
              ': ' +
              escapeHtml(shown) +
              '"' +
              describedby +
              interest +
              '>' +
              '<span class="cc-bar-fill" aria-hidden="true"></span>' +
              '<span class="cc-bar-value" aria-hidden="true">' +
              escapeHtml(shown) +
              '</span></button>'
            );
          })
          .join('');

        const catTip =
          shared && useTips
            ? ' interestfor="' +
              escapeHtml(catId) +
              '" style="anchor-name: --' +
              catId +
              '"'
            : '';

        if (layout === 'horizontal') {
          return (
            '<div class="cc-cat" data-label="' +
            escapeHtml(name) +
            '"' +
            catTip +
            '>' +
            '<span class="cc-cat-label" aria-hidden="true">' +
            escapeHtml(name) +
            '</span>' +
            '<div class="cc-cat-bars">' +
            bars +
            '</div></div>'
          );
        }
        return (
          '<div class="cc-cat" data-label="' +
          escapeHtml(name) +
          '"' +
          catTip +
          '>' +
          '<div class="cc-cat-bars">' +
          bars +
          '</div></div>'
        );
      })
      .join('');

    const xTicks =
      layout === 'horizontal' ? '' : xAxisHtml(data, nameKey, opts);
    const yAxis =
      layout === 'horizontal' ? '' : yAxisHtml(ticks, 'left', opts);

    const legend = showLegend
      ? legendHtml(opts.series, Object.assign({}, opts, { legend: true }))
      : '';

    const tips =
      useTips && tipParts.length
        ? '<div class="cc-tips">' + tipParts.join('') + '</div>'
        : '';

    const srTable =
      opts.srTable === false
        ? ''
        : dataTableHtml(
            data,
            opts.series,
            Object.assign({}, opts, { type: 'bar' })
          );

    el.classList.add('cc-chart');
    el.setAttribute('data-type', 'bar');
    el.setAttribute('data-layout', layout);
    if (percent) el.setAttribute('data-stack-type', 'percent');
    else el.removeAttribute('data-stack-type');
    applyChartA11y(el, opts, 'bar');
    applyChromeAttrs(el, opts);
    el.style.setProperty('--cc-max', String(max));
    el.style.setProperty('--cc-min', String(min));
    applyGridDivisions(el, ticks.length);
    if (opts.height) el.style.setProperty('--cc-h', opts.height);
    else if (spark) el.style.setProperty('--cc-h', '72px');

    el.innerHTML =
      srTable +
      '<div class="cc-frame">' +
      yAxis +
      '<div class="cc-plot-wrap">' +
      gridHtml(opts) +
      refLinesHtml(opts, min, max) +
      '<div class="cc-plot">' +
      cats +
      '</div></div>' +
      xTicks +
      '</div>' +
      legend +
      tips;

    const plot = el.querySelector('.cc-plot');
    bindLegend(el);
    if (typeof document !== 'undefined') {
      wireShellControls((el.closest && el.closest('.cc-shell')) || document);
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        staggerPlot(plot);
      });
    } else {
      staggerPlot(plot);
    }

    return { max: max, stagger: function () { staggerPlot(plot); }, el: el };
  }

  /**
   * Bar + line on one plot. series[].type: 'bar'|'line' (default bar).
   * series[].axis: 'left'|'right' (default left). Right axis via maxRight/minRight.
   */
  function renderCombo(el, opts) {
    if (!el || !opts) return null;
    if (!opts.series || !opts.series.length) return clearChart(el);
    const data = normalizeData(opts.data);
    if (!data.length) return clearChart(el);

    const nameKey = opts.nameKey || 'name';
    const n = data.length;
    const all = opts.series.map(function (s, si) {
      const copy = Object.assign({}, s);
      copy._si = si;
      copy._kind = seriesType(s, opts.type === 'line' ? 'line' : 'bar');
      copy._right = isRightAxis(s);
      return copy;
    });
    const barSeries = all.filter(function (s) {
      return s._kind === 'bar';
    });
    const lineSeries = all.filter(function (s) {
      return s._kind === 'line';
    });
    const leftSeries = all.filter(function (s) {
      return !s._right;
    });
    const rightSeries = all.filter(function (s) {
      return s._right;
    });
    const hasRight = rightSeries.length > 0;

    let layout = opts.layout || (barSeries.length > 1 ? 'group' : 'simple');
    if (layout === 'horizontal') {
      layout = barSeries.length > 1 ? 'group' : 'simple';
    }

    const leftBars = barSeries.filter(function (s) {
      return !s._right;
    });
    const leftDomainSeries = leftSeries.length
      ? layout === 'stack' && leftBars.length
        ? leftBars
        : leftSeries
      : all;
    const percent = isPercentStack(opts, layout);
    const min = percent ? 0 : finiteMinOn(opts, 'left');
    const max = percent
      ? 100
      : finiteMaxOn(
          opts,
          domainValues(
            data,
            leftDomainSeries,
            layout === 'stack' ? 'stack' : 'group'
          ),
          min,
          'left'
        );
    const ticks = yTicks(max, opts.ticks || 5, min);

    let minRight = 0;
    let maxRight = 1;
    let ticksRight = [];
    if (hasRight) {
      const rightBars = barSeries.filter(function (s) {
        return s._right;
      });
      const rightDomainSeries =
        layout === 'stack' && rightBars.length ? rightBars : rightSeries;
      minRight = finiteMinOn(opts, 'right');
      maxRight = finiteMaxOn(
        opts,
        domainValues(
          data,
          rightDomainSeries,
          layout === 'stack' && rightBars.length ? 'stack' : 'group'
        ),
        minRight,
        'right'
      );
      ticksRight = yTicks(maxRight, opts.ticksRight || opts.ticks || 5, minRight);
    }

    const yLeft = yAtScale(min, max);
    const yRight = yAtScale(minRight, maxRight);
    const spark = isSparkline(opts);
    const showLegend =
      opts.legend === true ||
      (!spark && opts.legend !== false && all.length > 1);
    const useTips = opts.tooltip !== false && !spark;
    const shared = useTips && wantsSharedTooltip(opts, all);
    const base = tipBaseId(el);
    const tipParts = [];
    const showDots = opts.dots !== false;

    const cats = data
      .map(function (row, i) {
        const name = row[nameKey] != null ? row[nameKey] : 'Item ' + (i + 1);
        const catId = base + '-c-' + i;
        let sum = 0;
        if (percent) {
          barSeries.forEach(function (s) {
            if (s._right) return;
            const n = rawNum(row[s.key]);
            if (n != null) sum += Math.max(0, n);
          });
        }
        if (shared) {
          tipParts.push(
            buildInterestTip(catId, {
              title: String(name),
              items: sharedItemsForRow(all, row, opts),
            }).tipHtml
          );
        }
        const bars = barSeries
          .map(function (s) {
            const raw = rawNum(row[s.key]);
            const v =
              percent && !s._right && sum > 0 && raw != null
                ? (Math.max(0, raw) / sum) * 100
                : raw == null
                  ? 0
                  : raw;
            const seriesLabel = s.label || s.key;
            const id = shared
              ? catId
              : base + '-b-' + i + '-' + safeIdPart(s.key);
            const colorDecl = seriesColorDecl(s._si, s);
            const styleParts = [colorDecl];
            if (s._right) {
              styleParts.push('--cc-max: ' + maxRight, '--cc-min: ' + minRight);
            }
            const side = s._right ? 'right' : 'left';
            const shown =
              percent && !s._right
                ? resolveFormat(opts, 'left')
                  ? formatValue(round2(v), opts, 'left')
                  : round2(v) + '%'
                : formatValue(raw, opts, side);
            let interest = '';
            if (useTips) {
              if (!shared) {
                tipParts.push(
                  buildInterestTip(id, {
                    title: name,
                    series: s.key,
                    seriesLabel: seriesLabel,
                    value: shown,
                    colorDecl: colorDecl,
                  }).tipHtml
                );
              }
              interest = ' interestfor="' + escapeHtml(id) + '"';
              styleParts.push('anchor-name: --' + id);
            }
            const describedby = useTips
              ? ' aria-describedby="' + escapeHtml(id) + '"'
              : '';
            return (
              '<button type="button" class="cc-bar" data-series="' +
              escapeHtml(s.key) +
              '" data-v="' +
              round2(v) +
              '" data-label="' +
              escapeHtml(name) +
              '" style="' +
              styleParts.join('; ') +
              '" aria-label="' +
              escapeHtml(name) +
              ', ' +
              escapeHtml(seriesLabel) +
              ': ' +
              escapeHtml(shown) +
              '"' +
              describedby +
              interest +
              '>' +
              '<span class="cc-bar-fill" aria-hidden="true"></span>' +
              '<span class="cc-bar-value" aria-hidden="true">' +
              escapeHtml(shown) +
              '</span></button>'
            );
          })
          .join('');

        const catTip =
          shared && useTips
            ? ' interestfor="' +
              escapeHtml(catId) +
              '" style="anchor-name: --' +
              catId +
              '"'
            : '';
        return (
          '<div class="cc-cat" data-label="' +
          escapeHtml(name) +
          '"' +
          catTip +
          '>' +
          '<div class="cc-cat-bars">' +
          bars +
          '</div></div>'
        );
      })
      .join('');

    const layerHtml = lineSeries.length
      ? buildLineLayers(data, lineSeries, {
          nameKey: nameKey,
          opts: opts,
          base: base,
          tipParts: tipParts,
          useTips: useTips,
          showDots: showDots,
          labels: opts.labels,
          lineWidth: opts.lineWidth,
          shared: shared,
          sharedIdAt: function (i) {
            return base + '-c-' + i;
          },
          xAt: function (i) {
            return n <= 1 ? 50 : ((i + 0.5) / n) * 100;
          },
          yAt: function (s, v) {
            return s._right ? yRight(v) : yLeft(v);
          },
        })
      : '';

    const xTicks = xAxisHtml(data, nameKey, opts);

    const yRightHtml = hasRight ? yAxisHtml(ticksRight, 'right', opts) : '';
    const legend = showLegend
      ? legendHtml(all, Object.assign({}, opts, { legend: true }))
      : '';
    const tips =
      useTips && tipParts.length
        ? '<div class="cc-tips">' + tipParts.join('') + '</div>'
        : '';
    const srTable =
      opts.srTable === false
        ? ''
        : dataTableHtml(
            data,
            all,
            Object.assign({}, opts, { type: 'combo' })
          );

    el.classList.add('cc-chart');
    el.setAttribute('data-type', 'combo');
    el.setAttribute('data-layout', layout);
    if (hasRight) el.setAttribute('data-axis-right', '');
    else el.removeAttribute('data-axis-right');
    applyChartA11y(el, opts, 'combo');
    applyChromeAttrs(el, opts);
    if (!showDots) el.setAttribute('data-dots', 'false');
    else el.removeAttribute('data-dots');
    el.style.setProperty('--cc-max', String(max));
    el.style.setProperty('--cc-min', String(min));
    if (hasRight) {
      el.style.setProperty('--cc-max-right', String(maxRight));
      el.style.setProperty('--cc-min-right', String(minRight));
    }
    applyGridDivisions(el, ticks.length);
    if (opts.height) el.style.setProperty('--cc-h', opts.height);
    else if (spark) el.style.setProperty('--cc-h', '72px');

    el.innerHTML =
      srTable +
      '<div class="cc-frame">' +
      yAxisHtml(ticks, 'left', opts) +
      '<div class="cc-plot-wrap">' +
      gridHtml(opts) +
      refLinesHtml(opts, min, max, minRight, maxRight) +
      '<div class="cc-plot">' +
      cats +
      layerHtml +
      (!barSeries.length && shared ? hitsHtml(data, base, opts) : '') +
      '</div></div>' +
      xTicks +
      yRightHtml +
      '</div>' +
      legend +
      tips;

    const plot = el.querySelector('.cc-plot');
    bindLegend(el);
    if (typeof document !== 'undefined') {
      wireShellControls((el.closest && el.closest('.cc-shell')) || document);
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        staggerPlot(plot);
      });
    } else {
      staggerPlot(plot);
    }

    return {
      max: max,
      maxRight: hasRight ? maxRight : undefined,
      stagger: function () {
        staggerPlot(plot);
      },
      el: el,
    };
  }

  /**
   * Render multi-series line chart — pure HTML + CSS only.
   * Area via shape() + drop-shadow; dots as buttons; interestfor tips.
   */
  function renderLine(el, opts) {
    if (!el || !opts) return null;
    if (!opts.series || !opts.series.length) return clearChart(el);
    const data = normalizeData(opts.data);
    if (!data.length) return clearChart(el);

    const nameKey = opts.nameKey || 'name';
    const min = finiteMin(opts);
    const max = finiteMax(opts, domainValues(data, opts.series), min);
    const n = data.length;
    const ticks = yTicks(max, opts.ticks || 5, min);
    const spark = isSparkline(opts);
    const showLegend =
      opts.legend === true ||
      (!spark && opts.legend !== false && opts.series.length > 1);
    const useTips = opts.tooltip !== false && !spark;
    const shared = useTips && wantsSharedTooltip(opts, opts.series);
    const base = tipBaseId(el);
    const tipParts = [];
    const yAt = yAtScale(min, max);
    const showDots = opts.dots !== false;
    const lineSeries = opts.series.map(function (s, si) {
      const copy = Object.assign({}, s);
      copy._si = si;
      return copy;
    });

    if (shared) {
      data.forEach(function (row, i) {
        const name = row[nameKey] != null ? row[nameKey] : i;
        tipParts.push(
          buildInterestTip(base + '-c-' + i, {
            title: String(name),
            items: sharedItemsForRow(lineSeries, row, opts),
          }).tipHtml
        );
      });
    }

    if (!showDots) el.setAttribute('data-dots', 'false');
    else el.removeAttribute('data-dots');
    if (
      opts.curve &&
      opts.curve !== false &&
      opts.curve !== 'straight' &&
      opts.curve !== 'linear'
    ) {
      el.setAttribute('data-curve', 'smooth');
    } else {
      el.removeAttribute('data-curve');
    }

    const layerHtml = buildLineLayers(data, lineSeries, {
      nameKey: nameKey,
      opts: opts,
      base: base,
      tipParts: tipParts,
      useTips: useTips,
      showDots: showDots,
      labels: opts.labels,
      lineWidth: opts.lineWidth,
      shared: shared,
      sharedIdAt: function (i) {
        return base + '-c-' + i;
      },
      xAt: function (i) {
        return n <= 1 ? 0 : (i / (n - 1)) * 100;
      },
      yAt: function (s, v) {
        return yAt(v);
      },
    });

    const legend = showLegend
      ? legendHtml(opts.series, Object.assign({}, opts, { legend: true }))
      : '';

    const tips =
      useTips && tipParts.length
        ? '<div class="cc-tips">' + tipParts.join('') + '</div>'
        : '';

    const srTable =
      opts.srTable === false
        ? ''
        : dataTableHtml(
            data,
            opts.series,
            Object.assign({}, opts, { type: 'line' })
          );

    el.classList.add('cc-chart');
    el.setAttribute('data-type', 'line');
    applyChartA11y(el, opts, 'line');
    applyChromeAttrs(el, opts);
    el.style.setProperty('--cc-max', String(max));
    el.style.setProperty('--cc-min', String(min));
    applyGridDivisions(el, ticks.length);
    if (opts.height) el.style.setProperty('--cc-h', opts.height);
    else if (spark) el.style.setProperty('--cc-h', '72px');

    el.innerHTML =
      srTable +
      '<div class="cc-frame">' +
      yAxisHtml(ticks, 'left', opts) +
      '<div class="cc-plot-wrap">' +
      gridHtml(opts) +
      refLinesHtml(opts, min, max) +
      '<div class="cc-plot">' +
      layerHtml +
      (shared ? hitsHtml(data, base, opts) : '') +
      '</div></div>' +
      xAxisHtml(data, nameKey, opts) +
      '</div>' +
      legend +
      tips;

    bindLegend(el);
    return { max: max, el: el };
  }

  function syncBarColMeta(col) {
    const v = Number(col.getAttribute('data-v')) || 0;
    const label = col.getAttribute('data-label') || '';
    col.setAttribute('data-band', bandForValue(v));
    col.setAttribute('aria-label', label ? label + ', ' + v : String(v));
    const tipId = col.getAttribute('interestfor');
    const tip = tipId ? document.getElementById(tipId) : null;
    const strong = tip && tip.querySelector('strong');
    if (strong) strong.textContent = label ? label + ' · ' + v : String(v);
  }

  function bindBarLegacy(chart, opts) {
    const plotEl = chart.querySelector('.cc-bar-plot');
    if (!plotEl) return null;
    if (chart.dataset.ccLegacyBound) {
      plotEl.querySelectorAll('.cc-bar-col').forEach(syncBarColMeta);
      return { stagger: function () { staggerPlot(plotEl); } };
    }
    chart.dataset.ccLegacyBound = '1';

    const cols = Array.prototype.slice.call(plotEl.querySelectorAll('.cc-bar-col'));
    cols.forEach(syncBarColMeta);

    const shell = chart.closest('.cc-shell') || chart.parentElement;
    const modeBtns = shell
      ? Array.prototype.slice.call(shell.querySelectorAll('[data-cc-bar-mode]'))
      : [];
    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const mode = btn.getAttribute('data-cc-bar-mode') || 'data';
        chart.dataset.mode = mode;
        modeBtns.forEach(function (b) {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });

    function runStagger() {
      plotEl.classList.remove('is-running');
      void plotEl.offsetWidth;
      plotEl.classList.add('is-running');
    }

    const replay = shell && shell.querySelector('[data-cc-bar-replay]');
    if (replay) replay.addEventListener('click', runStagger);
    if (!opts || opts.autoStagger !== false) requestAnimationFrame(runStagger);

    const shuffle = shell && shell.querySelector('[data-cc-bar-shuffle]');
    if (shuffle) {
      shuffle.addEventListener('click', function () {
        cols.forEach(function (col) {
          const v = 28 + Math.round(Math.random() * 67);
          col.setAttribute('data-v', String(v));
          syncBarColMeta(col);
        });
        if (chart.dataset.mode !== 'wave') runStagger();
      });
    }

    return { stagger: runStagger };
  }

  function bindLineLegacy() {
    /* legacy playground line/bead lab removed */
    return null;
  }

  function wireShellControls(scope) {
    const root = scope || document;
    /* Replay stagger for any chart in the same .cc-shell (cartesian + legacy) */
    root.querySelectorAll('[data-cc-bar-replay]').forEach(function (btn) {
      if (btn.dataset.ccReplayBound) return;
      btn.dataset.ccReplayBound = '1';
      btn.addEventListener('click', function () {
        const shell = btn.closest('.cc-shell') || root;
        shell.querySelectorAll('.cc-plot, .cc-bar-plot').forEach(function (plot) {
          staggerPlot(plot);
        });
      });
    });
  }

  function init(root, opts) {
    const scope = root || document;
    const barOpts = opts && opts.bar;

    scope.querySelectorAll('.cc-chart[data-type="bar"], .cc-chart[data-type="combo"]').forEach(function (el) {
      /* Only bind chrome if already rendered (has plot) */
      if (!el.querySelector('.cc-plot')) return;
      syncAllBars(el, barOpts);
      bindLegend(el);
      if (!barOpts || barOpts.autoStagger !== false) {
        requestAnimationFrame(function () {
          staggerPlot(el.querySelector('.cc-plot'));
        });
      }
    });

    scope.querySelectorAll('.cc-chart[data-type="line"]').forEach(function (el) {
      if (!el.querySelector('.cc-plot')) return;
      bindLegend(el);
    });

    scope.querySelectorAll('.cc-bar-legacy').forEach(function (el) {
      bindBarLegacy(el, barOpts);
    });

    wireShellControls(scope);

    return true;
  }

  return {
    /** JSON/array → DOM (primary API) */
    render: render,
    renderBar: renderBar,
    renderLine: renderLine,
    renderPie: renderPie,
    renderCombo: renderCombo,
    pieWedgeShape: pieWedgeShape,
    normalizeData: normalizeData,
    init: init,
    wireShellControls: wireShellControls,
    bindBar: bindBarLegacy,
    bindLine: bindLineLegacy,
    bindLegend: bindLegend,
    syncBarMark: syncBarMark,
    syncAllBars: syncAllBars,
    syncBarCol: syncBarColMeta,
    bandForValue: bandForValue,
    staggerPlot: staggerPlot,
    niceMax: niceMax,
    formatValue: formatValue,
    yTicks: yTicks,
    domainValues: domainValues,
    seriesToken: seriesToken,
    DEFAULTS: DEFAULTS,
  };
});
