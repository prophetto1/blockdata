# Dual-PC Internal Setup README

This document reflects the current state of this machine as verified on April 7, 2026 from `E:\blockdata-agchain`.

In one sentence: this PC hosts its own local working tree at `E:\blockdata-agchain`, currently has live dev services on `5374`, `5375`, `4421`, and `8000`, and can also reach the other PC through mapped SMB drives.

## Purpose

- Keep one place that explains how this `E:\blockdata-agchain` machine relates to the other PC.
- Capture what is shared across frontend, backend, database, docs, and generated scaffolds.
- Record what is specific to this PC so local setup stays easy to reason about.

## This PC

### Repo and workspace

- Primary working copy on this PC:
  - `E:\blockdata-agchain`
- This tree already contains the main project surfaces locally, including:
  - `web`
  - `web-docs`
  - `services`
  - `supabase`
  - `scripts`
  - `docs`
  - `engine`
  - `integrations`
  - `_agchain`
  - `__start-here`
- Tooling and local-state folders also exist at the top level on this machine, including:
  - `.agents`
  - `.codex`
  - `.worktrees`
  - `.vscode`
  - `node_modules`
  - `output`
- This copy is still not a Git repo from the top level:
  - there is no top-level `.git` directory in `E:\blockdata-agchain`

### Local machine and runtime facts

- Computer name:
  - `BUDDY`
- Active Windows account:
  - `buddy\buddy`
- Windows user profile:
  - `C:\Users\buddy`
- Git:
  - `2.53.0.windows.2`
- Node.js:
  - `v24.14.1`
- npm:
  - `11.11.0`
- Python:
  - `3.12.10`
- GitHub CLI:
  - `gh` is not installed on this PC
- Docker:
  - Docker CLI is not installed on this PC
- Supabase CLI:
  - Supabase CLI is not installed on this PC

### Current local service status

These were verified as live on April 7, 2026 from this PC:

- Web app primary:
  - `http://127.0.0.1:5374`
  - HTTP status: `200`
- Web app alternate:
  - `http://127.0.0.1:5375`
  - HTTP status: `200`
- Docs site:
  - `http://127.0.0.1:4421`
  - HTTP status: `200`
- Platform API:
  - `http://127.0.0.1:8000`
  - health: `http://127.0.0.1:8000/health`
  - HTTP health status: `200`

The live web and docs processes were launched from `E:\blockdata-agchain`. The managed Platform API state file also points back to this repo root.

### Local service commands

- Web app primary:
  - `cd web && npm.cmd run dev`
- Web app alternate:
  - `cd web && npm.cmd run dev:alt`
- Docs site:
  - `cd web-docs && npm.cmd run dev`
- Platform API:
  - `npm.cmd run platform-api:dev`
- Platform API recovery:
  - `npm.cmd run platform-api:recover`

Important Windows note:

- In PowerShell on this PC, bare `npm` is blocked by execution policy because `npm.ps1` is disabled.
- Use `npm.cmd` in this shell unless the execution policy changes.

### Local Python and editor state

- `.vscode/settings.json` currently points `python.defaultInterpreterPath` to:
  - `C:\Users\jwchu\AppData\Roaming\uv\python\cpython-3.11-windows-x86_64-none\python.exe`
- That interpreter path is legacy and machine-specific.
- `services/platform-api/.venv/Scripts/python.exe` exists on this PC and reports:
  - `Python 3.12.10`
- The managed Platform API state file currently records this local interpreter for approved bootstraps:
  - `E:\blockdata-agchain\services\platform-api\.venv\Scripts\python.exe`

### Local Supabase state

- The repo still expects the usual local Supabase port family when running a local stack:
  - API: `54321`
  - Postgres: `54322`
  - Studio: `54323`
  - Inbucket: `54324`
- On this PC, those ports were closed during the April 7, 2026 verification pass.
- Docker and Supabase CLI are both missing on this machine right now, so a local Supabase stack is not currently active.
- Hosted Supabase configuration in the repo `.env` is still part of the shared app and backend contract.

## The Other PC

### Active network-visible paths from this machine

The other PC is currently reachable through these active mapped drives:

- `P:` -> `\\JON\ES`
- `Q:` -> `\\JON\CS`
- `R:` -> `\\JON\GS`
- `S:` -> `\\JON\IS`

Most relevant currently reachable project paths include:

- `P:\writing-system`
  - this path exposes a near-full project-family tree, including `engine`, `integrations`, `services`, `supabase`, `web`, `web-docs`, `_agchain`, and `__start-here`
- `P:\engine`
- `R:\agchain-blockdata`
- `S:\agchain`

### Stale mappings

These remembered mappings are still registered on this PC but are currently unavailable:

- `V:` -> `\\JON\H`
- `W:` -> `\\JON\I$`
- `X:` -> `\\JON\G$`
- `Y:` -> `\\JON\E$`
- `Z:` -> `\\JON\C$`

New PowerShell sessions on this PC still print:

- `Attempting to perform the InitializeDefaultDrives operation on the 'FileSystem' provider failed.`

That message lines up with the stale remembered mappings above.

## Shared Project Architecture

### Root repo shape

- Root package manager:
  - `npm`
- Top-level app and service surfaces on this machine include:
  - `web`
  - `web-docs`
  - `services/platform-api`
  - `supabase`
  - `engine`
  - `integrations`
- Root scripts currently include:
  - `capture-server`
  - `platform-api:dev`
  - `platform-api:recover`
  - Supabase workflow and migration guardrail tests

### Frontend app

- Location:
  - `web`
- Stack:
  - React 19
  - TypeScript
  - Vite 7
  - Vitest
  - ESLint
- Standard local ports:
  - `5374`
  - `5375`

### PDF.js Express

- PDF.js Express depends on runtime assets served from:
  - `web/public/vendor/pdfjs-express`
- The current repo model is:
  - assets are committed
  - refresh is manual
- Maintenance command:
  - `cd web && npm.cmd run pdfjs-express:assets:refresh`

### Platform API backend

- Location:
  - `services/platform-api`
- Stack:
  - FastAPI
  - Uvicorn
  - Python 3.12 on this PC
- Standard local port:
  - `8000`
- The repo start script prefers local interpreters in this order:
  - `services/platform-api/.venv/Scripts/python.exe`
  - repo-root `.venv/Scripts/python.exe`
  - `python.exe` on `PATH`
  - `py.exe`
- The frontend proxies `/platform-api` to this backend during local dev.

### Docs site

- Location:
  - `web-docs`
- Stack:
  - Astro
  - Starlight
  - React
  - Tailwind
- Standard local port:
  - `4421`

### Database and Supabase

- Location:
  - `supabase`
- Shared env contract still includes:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `AUTH_REDIRECT_ORIGINS`
  - `VITE_AUTH_REDIRECT_ORIGIN`
- The repo assumes frontend, backend, scripts, and workers are speaking to the same Supabase project family unless intentionally overridden.

## Shared Services and Shared State

These are logically shared across both PCs unless deliberately split:

- Frontend source and build structure
- Platform API source and API surface
- Supabase schema, migrations, and edge functions
- Docs source
- Root `.env` contract
- OAuth redirect origin contract for frontend ports `5374` and `5375`
- Generated scaffold families such as `engine` and `integrations`

Important distinction:

- Shared contract does not mean shared process.
- Each PC can run its own local web server, docs server, and Platform API process.
- External services such as hosted Supabase may still be shared even when compute is local to each machine.

## Divergence Already Visible

This PC and the other PC are not identical.

Known visible differences include:

- this PC uses `E:\blockdata-agchain` as the active working copy
- this PC is `BUDDY`; the mapped remote shares are exposed from `\\JON\...`
- this local tree already contains `engine` and `integrations`
- this copy currently has no top-level Git metadata
- `.vscode/settings.json` still contains a legacy Python interpreter path for another user and machine context
- `gh`, Docker, and Supabase CLI are currently missing on this PC
- local PowerShell sessions still emit the `InitializeDefaultDrives` error because stale remembered mappings remain registered
- local service availability is currently confirmed on `5374`, `5375`, `4421`, and `8000`

Assume drift is possible until both sides are intentionally normalized.

## Working Model for Parallel Development

- Treat the two machines as parallel development environments on the same LAN.
- Treat `E:\blockdata-agchain` as a local working tree, not just a thin copy target.
- Use Git for source-code movement whenever possible once top-level repo wiring is restored where needed.
- Use SMB copy only when it is the practical choice for:
  - generated scaffolds
  - data bundles
  - docs snapshots
  - emergency patch transfer
  - one-off bootstrap sync

Recommended rule:

- Prefer Git for code.
- Reserve SMB copy for data, generated artifacts, or temporary bootstrap work.

## Operational Warnings

- Do not let Windows metadata touch `.git` directories.
- `desktop.ini` pollution can break Git behavior and create noisy repo state.
- This machine already hides `desktop.ini` in VS Code and search settings; keep that protection in place.
- Avoid relying on stale remembered network-drive mappings.
- If both PCs continue to share external services like Supabase or cloud storage, config changes on one machine may affect the other immediately.

## Practical Next Steps

- Re-establish top-level Git wiring for `E:\blockdata-agchain` if this copy is meant to be a first-class repo.
- Normalize `.vscode/settings.json` so the Python interpreter path reflects this machine instead of `C:\Users\jwchu\...`.
- Decide which machine is authoritative for `engine` and `integrations` now that those directories exist both locally and on the mapped remote tree.
- Clean up stale mapped drives `V:` through `Z:` if the PowerShell startup error should be eliminated.
- Install `gh`, Docker, and Supabase CLI only if this PC is expected to handle GitHub workflows or local Supabase development directly.
- Keep this document updated whenever this machine's repo path, mappings, ports, or runtime layout change.
