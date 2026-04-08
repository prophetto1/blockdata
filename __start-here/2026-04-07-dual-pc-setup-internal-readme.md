# Dual-PC Internal Setup README

This document records how the project is currently split across two PCs on the same local network, what is shared between them, and what is machine-specific.

## Purpose

- Keep one place that explains how the local `E:\writing-system` machine and the remote `Y:\blockdata-agchain` machine relate to each other.
- Capture the shared project architecture across frontend, backend, database, docs site, and supporting tooling.
- Make it easier to work on both machines in parallel, copy files between them when needed, and split them into separate Git remotes later without losing track of shared services.

## Network Relationship

- The two machines are on the same local network.
- From this PC, the other PC is reachable over SMB as `\\BUDDY\E$`.
- That remote admin share is mapped locally as `Y:\`.
- The current project copy on the other PC is visible at `Y:\blockdata-agchain`.
- The current project copy on this PC is at `E:\writing-system`.

## This PC

### Repo and workspace

- Primary repo path: `E:\writing-system`
- Current Git remote for this repo: `origin = https://github.com/prophetto1/blockdata.git`
- Root workspaces:
  - `web`
  - `web-docs`
- Related project/data folder on the remote machine:
  - `Y:\blockdata-agchain`
  - `Y:\blockdata-agchain\_agchain`

### Local Python and backend setup

- Workspace Python interpreter is set in `.vscode/settings.json` to:
  - `C:\Users\jwchu\AppData\Local\Programs\Python\Python311\python.exe`
- That interpreter matches the currently running Platform API process on this PC.
- `services/platform-api/pyproject.toml` requires Python `>=3.11`.
- Platform API is started through the repo script:
  - `npm run platform-api:dev`
- Recovery command:
  - `npm run platform-api:recover`
- The start script loads the repo-root `.env` file and launches:
  - `python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`

### Current local service ports

- Web app:
  - default: `http://localhost:5374`
  - alternate: `http://localhost:5375`
- Platform API:
  - `http://127.0.0.1:8000`
- Docs site:
  - `http://localhost:4421`
- Supabase local stack:
  - API: `http://127.0.0.1:54321`
  - Postgres: `localhost:54322`
  - Studio: `http://127.0.0.1:54323`
  - Inbucket: `http://127.0.0.1:54324`

### Local machine-specific notes

- Desktop was redirected into OneDrive at `C:\Users\jwchu\OneDrive\Desktop`, even though OneDrive did not appear to be actively running as a sync client during inspection.
- Google Drive is installed and running on this PC and is the more likely source of active Explorer overlay badges.
- `desktop.ini` files had been sprayed into `.git` metadata on this machine, which broke Git ref scanning and fetch behavior until cleaned up.
- This PC can mount the other PC through `Y:\`, which makes ad hoc file copy possible without Git.

## That PC

### Visible repo copy from this machine

- Remote project path visible over SMB:
  - `Y:\blockdata-agchain`
- Additional project data/workspace path:
  - `Y:\blockdata-agchain\_agchain`
- From this machine's view, `Y:\blockdata-agchain` looks like a full project working copy with:
  - `web`
  - `web-docs`
  - `services`
  - `supabase`
  - `scripts`
  - `.vscode`
  - `.env.example`
  - `package.json`
  - `package-lock.json`
- From this machine's view, `Y:\blockdata-agchain` does not currently expose a top-level `.git` directory.
  - Treat it as a parallel working copy from an operational standpoint.
  - If it is meant to become a first-class fork, it still needs its own explicit Git remote wiring.

### Remote machine editor/runtime settings visible from this machine

- `Y:\blockdata-agchain\.vscode\settings.json` currently points Python at:
  - `C:\Users\jwchu\AppData\Roaming\uv\python\cpython-3.11-windows-x86_64-none\python.exe`
- That differs from this PC, which now uses:
  - `C:\Users\jwchu\AppData\Local\Programs\Python\Python311\python.exe`
- If the two machines are meant to behave the same in editor tooling, interpreter settings should be aligned intentionally rather than left to drift.

### Remote machine-specific filesystem notes

- `Y:\blockdata-agchain\_agchain` is not a Git repo, but it had heavy `desktop.ini` pollution throughout nested folders.
- A cleanup pass removed all `desktop.ini` files under:
  - `Y:\blockdata-agchain\_agchain`
- The nested reference repo at:
  - `Y:\blockdata-agchain\_agchain\_reference\context-mode`
  also had `desktop.ini` files inside its `.git` directory, which is exactly the kind of Windows metadata leakage that can corrupt Git behavior.

## Shared Project Architecture

### Root repo

- Root package manager: `npm`
- Root workspaces:
  - `web`
  - `web-docs`
- Root scripts include:
  - `capture-server`
  - `platform-api:dev`
  - `platform-api:recover`
  - Supabase workflow guardrail tests

### Frontend app

- Location: `web`
- Stack:
  - React 19
  - TypeScript
  - Vite 7
  - Vitest
  - ESLint
- The frontend depends on:
  - `@supabase/supabase-js`
  - `@scalar/api-client`
  - `@pdftron/pdfjs-express`
  - `pdfjs-dist`
  - several editor/UI libraries including TipTap, Monaco, and Ark UI
- Dev commands:
  - `cd web && npm run dev`
  - `cd web && npm run dev:alt`
  - `cd web && npm run test`
  - `cd web && npm run build`

### PDF.js Express note

- PDF.js Express is not a pure bundled dependency in practice.
- It needs runtime assets served from `web/public/vendor/pdfjs-express`.
- The repo now treats those assets as committed runtime assets.
- Manual refresh command:
  - `cd web && npm run pdfjs-express:assets:refresh`
- `dev` and `build` no longer block on a preflight asset-copy step.

### Platform API backend

- Location: `services/platform-api`
- Stack:
  - FastAPI
  - Uvicorn
  - Python 3.11+
- Major dependency areas in `requirements.txt`:
  - `fastapi`
  - `uvicorn[standard]`
  - `supabase`
  - `docling`
  - `eyecite`
  - `tree-sitter` language packages
  - `pymongo`
  - `google-cloud-storage`
  - OpenTelemetry packages
- Runtime behavior:
  - Loads `.env` from repo root
  - Serves health endpoints:
    - `/health`
    - `/health/ready`
- The frontend proxies `/platform-api` to this backend in local dev.

### Database and Supabase

- Location: `supabase`
- Shared local CLI config is in `supabase/config.toml`
- Local ports:
  - API `54321`
  - DB `54322`
  - Studio `54323`
  - Inbucket `54324`
- Shared hosted project alias in `.env.example`:
  - `SUPABASE_PROJECT_REF=dbdzzhshmigewyprahej`
- Shared env aliases include:
  - `SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `VITE_SUPABASE_URL`
- The repo assumes the frontend, backend, scripts, and workers are all speaking to the same Supabase project family unless intentionally overridden.

### Docs site

- Location: `web-docs`
- Stack:
  - Astro
  - Starlight
  - React
  - Tailwind
- Dev command:
  - `cd web-docs && npm run dev`
- Default local docs port:
  - `4421`

## Shared Services and Shared State

These are the main things that are logically shared across both PCs unless deliberately split:

- Frontend source and build structure
- Platform API source and API surface
- Supabase schema/migrations/functions
- Docs site source
- Root `.env` contract
- Supabase project reference and URL aliases
- OAuth redirect origins for local frontend ports `5374` and `5375`
- GCS user storage bucket naming contract
- OpenTelemetry variable contract

Important distinction:

- Shared contract does not mean shared process.
- Each PC can run its own local web server, its own Platform API process, and its own local Supabase CLI stack.
- The hosted Supabase project and any real external services can still be shared even when compute is local to each PC.

## Divergence Already Visible

- This PC and the other PC are not guaranteed to be identical.
- Known visible differences already include:
  - different Python interpreter settings in `.vscode/settings.json`
  - the remote copy has an extra root dev dependency `zod`
  - the remote copy is visible as a working tree without a top-level `.git` directory from this PC
- Assume drift is possible until both sides are intentionally normalized.

## Working Model for Parallel Development

- Treat the two machines as parallel development environments on the same LAN.
- They share the same conceptual project, but they should be allowed to diverge intentionally for feature work.
- If they get separate Git remotes later, the clean model is:
  - each machine keeps its own repo and branch history
  - shared changes move by Git whenever possible
  - one-off file copy is reserved for data, snapshots, generated assets, or emergency sync

Recommended rule:

- Use Git for source code whenever possible.
- Use SMB copy between `E:\writing-system` and `Y:\blockdata-agchain` only for:
  - data bundles
  - docs snapshots
  - generated artifacts
  - temporary patch transfer when Git is not ready yet

## Operational Warnings

- Do not let OneDrive, Google Drive, or Explorer metadata touch `.git` directories.
- `desktop.ini` files inside `.git` can break fetch, ref scanning, and other core Git operations.
- If either machine is going to remain under a synced folder, `.git` should be excluded from any sync/indexing behavior.
- If the two machines continue to share services like Supabase or GCS buckets, config changes on one machine may affect the other immediately.

## Practical Next Steps

- Decide whether `Y:\blockdata-agchain` should become a full Git repo with its own remote.
- Align Python interpreter settings across both machines on purpose.
- Decide which services stay shared:
  - Supabase
  - GCS
  - telemetry sinks
  - auth redirect origins
- Decide which assets can still be copied over SMB and which must move only through Git.
- Keep this document updated whenever either machine's runtime, interpreter, ports, or remote layout changes.

