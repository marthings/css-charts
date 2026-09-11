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

  if (typeof CssCharts !== 'undefined') {
    CssCharts.init();
  }
})();
