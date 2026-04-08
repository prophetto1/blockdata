# Dual-PC Internal Setup README

This document explains the relationship between the two active working copies involved in the current AGChain and Blockdata work.

It was originally written on April 7, 2026 and was updated on April 8, 2026 to make the path and Git relationship explicit.

In one sentence: this PC has its own local repo at `E:\blockdata-agchain`, it can also see the other PC's repo through the mapped `P:` drive, and the most common source of confusion is that the same remote folder appears as `P:\writing-system` here but as `E:\writing-system` on the other machine.

## Purpose

- Keep one place that explains how this `E:\blockdata-agchain` machine relates to the other PC.
- Capture what is shared across frontend, backend, database, docs, and generated scaffolds.
- Record what is specific to this PC so local setup stays easy to reason about.

## Read This First

If you only read one section, read this one.

- There are two active working copies involved right now.
- This machine's local repo is `E:\blockdata-agchain`.
- The other machine's repo is visible from here at `P:\writing-system`.
- `P:\writing-system` on this machine is the same remote folder as `E:\writing-system` on the other PC.
- Drive letters are machine-local labels. The folder can be the same even when the drive letter is different.
- These are not one magically shared working tree. They are two repos or working copies that can drift until code is fetched, merged, copied, or committed on purpose.

## Path Translation Cheat Sheet

| What you see on this PC | What it means on the other PC | What to assume |
|---|---|---|
| `E:\blockdata-agchain` | no direct equivalent implied | This is this machine's own local repo |
| `P:\writing-system` | `E:\writing-system` | Same remote folder, different drive letter |
| `P:/writing-system/.git` | `E:\writing-system\.git` | The Git repo on the other PC |
| `otherpc` Git remote | `P:/writing-system/.git` | The local Git name used here for the other PC repo |

## Mental Model

Use this model when talking to anyone about paths, branches, or file locations.

- `E:\blockdata-agchain` is the local repo on `BUDDY`.
- `P:\writing-system` is not a second local copy on `BUDDY`; it is the other PC's repo exposed over SMB.
- When someone on this machine says `P:\writing-system\...`, a person sitting at the other PC should mentally translate that to `E:\writing-system\...`.
- When someone on the other PC says `E:\writing-system\...`, a person on this machine should mentally translate that to `P:\writing-system\...`.
- Do not tell someone on the other PC to open `P:`. That drive letter only exists on this machine.
- Do not assume a change made in one repo automatically appears in the other. Shared network visibility does not mean shared Git state.

## Repo Relationship

For current Git work, treat the setup like this:

- This machine's active branch is currently `buddy` in `E:\blockdata-agchain`.
- GitHub is still `origin`.
- The other PC repo is currently available here as the `otherpc` remote pointing to `P:/writing-system/.git`.
- That means code can be fetched directly from the other machine without going through GitHub first.

Practical rule:

- Use Git to move code between repos when possible.
- Use SMB copy for generated artifacts, data bundles, snapshots, and emergency one-off transfers.
- When discussing audit fixes, always say which repo you mean: `E:\blockdata-agchain` on this PC, or `P:\writing-system` here which means `E:\writing-system` there.

## This PC

### Repo and workspace

- Primary working copy on this PC:
  - `E:\blockdata-agchain`
- This tree is now a top-level Git repo on this machine:
  - `.git` exists at `E:\blockdata-agchain\.git`
- Current local branch:
  - `buddy`
- Current Git remotes:
  - `origin` -> `https://github.com/prophetto1/blockdata.git`
  - `otherpc` -> `P:/writing-system/.git`
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
  - this path is the other PC's `E:\writing-system`
  - this path exposes a near-full project-family tree, including `engine`, `integrations`, `services`, `supabase`, `web`, `web-docs`, `_agchain`, and `__start-here`
- `P:\engine`
- `R:\agchain-blockdata`
- `S:\agchain`

### How to talk about the other PC without confusing people

- On this machine, say `P:\writing-system` when you mean the other PC repo as seen from here.
- When giving instructions to someone physically on the other PC, translate `P:\writing-system` to `E:\writing-system`.
- If a note or audit mentions `P:\...`, that path is from the perspective of this machine.
- If a note or audit mentions `E:\writing-system\...`, that path is from the perspective of the other PC.
- If a note or audit mentions `E:\blockdata-agchain\...`, that is this machine's own local repo, not the remote-mapped one.

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
- Shared network visibility does not mean shared branch state. Git state still moves by fetch, merge, rebase, restore, or copy.

## Divergence Already Visible

This PC and the other PC are not identical.

Known visible differences include:

- this PC uses `E:\blockdata-agchain` as the active working copy
- this PC is `BUDDY`; the mapped remote shares are exposed from `\\JON\...`
- the other PC's repo appears here at `P:\writing-system` but appears there as `E:\writing-system`
- this local tree already contains `engine` and `integrations`
- this copy now has top-level Git metadata and currently tracks `origin` plus the `otherpc` remote
- `.vscode/settings.json` still contains a legacy Python interpreter path for another user and machine context
- `gh`, Docker, and Supabase CLI are currently missing on this PC
- local PowerShell sessions still emit the `InitializeDefaultDrives` error because stale remembered mappings remain registered
- local service availability is currently confirmed on `5374`, `5375`, `4421`, and `8000`

Assume drift is possible until both sides are intentionally normalized.

## Working Model for Parallel Development

- Treat the two machines as parallel development environments on the same LAN.
- Treat `E:\blockdata-agchain` as this machine's local working tree.
- Treat `P:\writing-system` as the other PC's working tree as seen from here.
- Use Git for source-code movement whenever possible.
- Use SMB copy only when it is the practical choice for:
  - generated scaffolds
  - data bundles
  - docs snapshots
  - emergency patch transfer
  - one-off bootstrap sync

Recommended rule:

- Prefer Git for code.
- Reserve SMB copy for data, generated artifacts, or temporary bootstrap work.
- When in doubt, name both the machine view and the translated path in the same sentence.
  - Example: "Fetch from `otherpc`, which is `P:\writing-system` here and `E:\writing-system` on JON."

## Operational Warnings

- Do not let Windows metadata touch `.git` directories.
- `desktop.ini` pollution can break Git behavior and create noisy repo state.
- This machine already hides `desktop.ini` in VS Code and search settings; keep that protection in place.
- Avoid relying on stale remembered network-drive mappings.
- If both PCs continue to share external services like Supabase or cloud storage, config changes on one machine may affect the other immediately.

## Practical Next Steps

- Keep the path-translation rule at the top of any audit or handoff that mentions both repos.
- Re-establish or keep Git-first movement between the two repos through `origin` or the `otherpc` remote.
- Normalize `.vscode/settings.json` so the Python interpreter path reflects this machine instead of `C:\Users\jwchu\...`.
- Decide which machine is authoritative for `engine` and `integrations` now that those directories exist both locally and on the mapped remote tree.
- Clean up stale mapped drives `V:` through `Z:` if the PowerShell startup error should be eliminated.
- Install `gh`, Docker, and Supabase CLI only if this PC is expected to handle GitHub workflows or local Supabase development directly.
- Keep this document updated whenever this machine's repo path, mappings, ports, or runtime layout change.
