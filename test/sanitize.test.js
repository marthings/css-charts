const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CssCharts = require('../src/css-charts.js');

describe('sanitizeCssColor', () => {
  it('allows common color tokens', () => {
    assert.equal(CssCharts.sanitizeCssColor('red'), 'red');
    assert.equal(CssCharts.sanitizeCssColor('#0af'), '#0af');
    assert.equal(CssCharts.sanitizeCssColor('oklch(0.7 0.1 40)'), 'oklch(0.7 0.1 40)');
  });

  it('rejects attribute breakouts', () => {
    assert.equal(CssCharts.sanitizeCssColor('red" onclick=x'), '');
    assert.equal(CssCharts.sanitizeCssColor('url(javascript:1)'), '');
    assert.equal(CssCharts.sanitizeCssColor('blue; color: red'), '');
  });
});

describe('normalizeData', () => {
  it('accepts arrays and JSON arrays', () => {
    assert.deepEqual(CssCharts.normalizeData([{ a: 1 }]), [{ a: 1 }]);
    assert.deepEqual(CssCharts.normalizeData('[{"a":1}]'), [{ a: 1 }]);
  });

  it('throws a clear error for invalid JSON', () => {
    assert.throws(
      () => CssCharts.normalizeData('{'),
      /not valid JSON/
    );
  });
});
