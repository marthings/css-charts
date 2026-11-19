/**
 * ESM entry that re-exports the UMD/CJS build.
 * Keeps zero runtime dependencies while supporting `import CssCharts from 'css-charts'`.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CssCharts = require('./css-charts.js');

export default CssCharts;
export const {
  render,
  renderBar,
  renderLine,
  renderPie,
  renderCombo,
  renderScatter,
  renderGauge,
  renderHeatmap,
  renderRadar,
  init,
  polyfill,
  normalizeData,
  sanitizeCssColor,
  attachFallbacks,
} = CssCharts;
