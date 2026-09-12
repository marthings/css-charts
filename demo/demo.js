/**
 * Demo page helpers: theme toggle + CssCharts.init()
 */
(function () {
  const STORAGE_KEY = 'css-charts-theme';

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.dataset.themeState = theme;
      btn.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      );
      const label = btn.querySelector('.theme-toggle-label');
      if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
    }
  }

  function initTheme() {
    let theme = 'dark';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        theme = saved;
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        theme = 'light';
      }
    } catch {
      /* ignore */
    }
    applyTheme(theme);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const next =
        document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    });
  }

  initTheme();

  function cssSupports(property, value) {
    try {
      return typeof CSS !== 'undefined' && CSS.supports(property, value);
    } catch {
      return false;
    }
  }

  function initSupportBanner() {
    const features = [
      [
        'border-shape',
        () =>
          cssSupports(
            'border-shape',
            'shape(from 0% 0%, line to 100% 0%, close)'
          ),
      ],
      [
        'shape()',
        () =>
          cssSupports(
            'clip-path',
            'shape(from 0% 0%, line to 100% 0%, close)'
          ),
      ],
      [
        'typed attr()',
        () =>
          cssSupports('height', 'calc(attr(data-v type(<number>)) * 1%)'),
      ],
      [
        'sibling-index()',
        () => cssSupports('animation-delay', 'calc(sibling-index() * 1s)'),
      ],
      ['corner-shape', () => cssSupports('corner-shape', 'squircle')],
    ];

    const results = features.map(([name, test]) => {
      let ok = false;
      try {
        ok = Boolean(test());
      } catch {
        ok = false;
      }
      return { name, ok };
    });

    let banner = document.getElementById('support-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'support-banner';
      banner.className = 'support-banner';
      banner.setAttribute('role', 'status');
      const host =
        document.querySelector('.page-lede') ||
        document.querySelector('.hero') ||
        document.querySelector('main');
      if (!host) return;
      host.insertAdjacentElement('afterend', banner);
    }

    const missing = results.filter((r) => !r.ok);
    const yes = results.length - missing.length;
    banner.replaceChildren();

    const summary = document.createElement('span');
    summary.className = 'support-chip summary';
    summary.textContent =
      yes + '/' + results.length + ' chart CSS features in this browser';
    banner.appendChild(summary);

    results.forEach(({ name, ok }) => {
      const chip = document.createElement('span');
      chip.className = 'support-chip ' + (ok ? 'yes' : 'no');
      chip.title = ok
        ? 'Supported — native paint'
        : 'Not supported — fallback CSS is in use';
      chip.textContent = name + (ok ? ' ✓' : ' → fallback');
      banner.appendChild(chip);
    });

    if (missing.length) {
      const note = document.createElement('p');
      note.className = 'support-fallback-copy';
      note.textContent =
        'Missing features use @supports fallbacks (clip-path or conic-gradient for pie, inline --v for bars). Charts still render.';
      banner.appendChild(note);
    }
  }

  initSupportBanner();

  if (typeof CssCharts !== 'undefined') {
    CssCharts.init();
  }
})();
