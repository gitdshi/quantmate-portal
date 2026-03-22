# QuantMate Portal (Frontend)

## Documentation

All project documentation lives in the dedicated docs repository:

- https://github.com/gitdshi/QuantMate-docs

This frontend repo intentionally does **not** keep a `docs/` folder to avoid duplication.

## Quick Start

See the docs repo for the authoritative steps:

- Development entry: https://github.com/gitdshi/QuantMate-docs/tree/main/development/frontend

## Strategies Workspace

- The strategies page now uses the real backend strategy APIs for list, detail, save, delete, built-in metadata, and code-history restore flows.
- Built-in strategy metadata comes from `/api/v1/strategies/builtin/list`, but starter source code is still composed in the frontend because that endpoint does not return template code.
- Strategy page copy is maintained under `src/i18n/locales/en/strategies.json` and `src/i18n/locales/zh/strategies.json`.
- Stable selectors for automated coverage are exposed through `data-testid` attributes on the strategies workspace, list, detail, template grid, and primary actions.

