# Security Policy

## Supported versions

Security fixes are applied to the latest published release on `main`.

## Reporting a vulnerability

Please open a private GitHub security advisory on [marthings/css-charts](https://github.com/marthings/css-charts), or email the maintainer listed in the repository profile.

Do not open a public issue for unfixed injection or XSS reports.

## Data handling notes

`CssCharts.render()` builds HTML from caller-provided JSON. Text fields are escaped; `series[].color` is sanitized before it is written into `style=""`. Hosts that feed untrusted JSON should still treat chart options as untrusted input and keep a Content Security Policy appropriate for their site.
