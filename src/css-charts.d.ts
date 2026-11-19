export type ChartType =
  | 'bar'
  | 'line'
  | 'combo'
  | 'pie'
  | 'scatter'
  | 'gauge'
  | 'heatmap'
  | 'radar';

export type BarLayout =
  | 'simple'
  | 'group'
  | 'stack'
  | 'horizontal'
  | 'range'
  | 'waterfall';

export interface SeriesSpec {
  key: string;
  label?: string;
  type?: 'bar' | 'line' | 'area';
  axis?: 'left' | 'right';
  yAxisId?: 'left' | 'right';
  color?: string;
  area?: boolean;
  curve?: boolean | string;
}

export interface SelectionPayload {
  el: Element;
  series: string | null;
  label: string | null;
  value: number | null;
  index: number;
  type: ChartType | string | null;
}

export interface RenderOptions {
  type?: ChartType;
  data: Array<Record<string, unknown>> | string;
  series?: SeriesSpec[];
  layout?: BarLayout;
  max?: number;
  min?: number;
  height?: string;
  nameKey?: string;
  valueKey?: string;
  labels?: boolean;
  legend?: boolean;
  tooltip?: boolean;
  selectable?: boolean;
  onSelect?: (payload: SelectionPayload | null) => void;
  fallbackNotes?: boolean;
  ariaLabel?: string;
  caption?: string;
  srTable?: boolean;
  donut?: boolean;
  innerRadius?: number;
  sparkline?: boolean;
  [key: string]: unknown;
}

export interface ChartInstance {
  el: HTMLElement;
  select(query?: Element | number | { series?: string; label?: string; index?: number } | null): SelectionPayload | null;
  getSelection(): SelectionPayload | null;
  clearSelection(): SelectionPayload | null;
  destroy(): null;
  [key: string]: unknown;
}

export interface PolyfillUrls {
  interestfor?: string;
  popover?: string;
  anchor?: string;
}

export interface CssChartsApi {
  render(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderBar(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderLine(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderPie(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderCombo(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderScatter(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderGauge(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderHeatmap(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  renderRadar(el: HTMLElement, opts: RenderOptions): ChartInstance | null;
  init(root?: ParentNode | null, opts?: { bar?: Record<string, unknown> }): boolean;
  polyfill(urls?: PolyfillUrls): Promise<{
    interestfor: boolean;
    popover: boolean;
    anchor: boolean;
  }>;
  normalizeData(data: unknown): Array<Record<string, unknown>>;
  sanitizeCssColor(value: unknown): string;
  attachFallbacks(
    el: HTMLElement,
    needs: string[],
    opts?: { fallbackNotes?: boolean }
  ): void;
  [key: string]: unknown;
}

declare const CssCharts: CssChartsApi;
export default CssCharts;
