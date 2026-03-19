# OpenClaw And LocalAGI Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clone OpenClaw and one similar open-source agent system into this workspace and verify both can start locally.

**Architecture:** Create a dedicated `external/` area in this workspace for third-party source checkouts so the main repo stays clean. Use each upstream project's documented local-development path where possible, and fall back to the lightest runnable verification path that does not require production credentials.

**Tech Stack:** Git, Node.js, pnpm, Docker Compose, OpenClaw, LocalAGI

### Task 1: Discover prerequisites and target repositories

**Files:**
- Create: `docs/plans/2026-03-18-openclaw-and-localagi-setup.md`

**Step 1: Confirm toolchain availability**

Run: `node -v`, `pnpm -v`, `git --version`, `docker --version`
Expected: Versions are printed or missing tools are identified.

**Step 2: Confirm upstream repositories**

Run: inspect upstream docs for:
- `https://github.com/openclaw/openclaw`
- `https://github.com/mudler/LocalAGI`

Expected: Build or quick-start commands are identified for both.

### Task 2: Clone repositories into the workspace

**Files:**
- Create: `external/openclaw/`
- Create: `external/LocalAGI/`

**Step 1: Create clone target directory**

Run: `mkdir -p external`
Expected: `external/` exists.

**Step 2: Clone OpenClaw**

Run: `git clone https://github.com/openclaw/openclaw.git external/openclaw`
Expected: The repository is present at `external/openclaw`.

**Step 3: Clone LocalAGI**

Run: `git clone https://github.com/mudler/LocalAGI.git external/LocalAGI`
Expected: The repository is present at `external/LocalAGI`.

### Task 3: Install dependencies and perform runnable verification

**Files:**
- Modify: `external/openclaw/*`
- Modify: `external/LocalAGI/*`

**Step 1: Install OpenClaw dependencies**

Run: `pnpm install`
Working directory: `external/openclaw`
Expected: Workspace dependencies install successfully.

**Step 2: Build OpenClaw**

Run: `pnpm ui:build && pnpm build`
Working directory: `external/openclaw`
Expected: Build completes and runnable artifacts or scripts are available.

**Step 3: Verify OpenClaw CLI starts**

Run: `pnpm openclaw --help`
Working directory: `external/openclaw`
Expected: CLI help renders without crashing.

**Step 4: Install or start LocalAGI using its documented quick-start**

Run: project-specific quick-start command from upstream docs
Working directory: `external/LocalAGI`
Expected: LocalAGI services start or the main entrypoint responds.

**Step 5: Verify LocalAGI responds locally**

Run: quick health or help command from upstream docs
Working directory: `external/LocalAGI`
Expected: A local HTTP endpoint or CLI responds successfully.

### Task 4: Capture run notes for this environment

**Files:**
- Modify: `docs/plans/2026-03-18-openclaw-and-localagi-setup.md`

**Step 1: Record exact commands and caveats**

Document:
- installed tool versions
- repo paths
- what started successfully
- any missing credentials or optional integrations

Expected: Another engineer can reproduce the setup in this workspace.

## Environment Notes

- Workspace root: `/home/jon/BD2`
- OpenClaw repo: `/home/jon/BD2/external/openclaw`
- LocalAGI repo: `/home/jon/BD2/external/LocalAGI`
- Host toolchain observed:
  - `node v20.19.4`
  - `pnpm 9.15.4`
  - `git 2.51.0`
  - `docker 29.2.1`
  - `bun` missing
  - `go` missing

## OpenClaw Actual Run Path

OpenClaw requires Node `>=22.16.0`, so the host toolchain was not sufficient for a source run. The validated path here uses the published container image with workspace-local state:

```bash
cd /home/jon/BD2/external/openclaw
mkdir -p .state/config .state/workspace

docker pull ghcr.io/openclaw/openclaw:latest

docker run --rm \
  -v /home/jon/BD2/external/openclaw/.state/config:/home/node/.openclaw \
  -v /home/jon/BD2/external/openclaw/.state/workspace:/home/node/.openclaw/workspace \
  ghcr.io/openclaw/openclaw:latest \
  node dist/index.js config set gateway.mode local

# Then set gateway.bind/controlUi in .state/config/openclaw.json and start:
OPENCLAW_IMAGE=ghcr.io/openclaw/openclaw:latest \
OPENCLAW_GATEWAY_BIND=lan \
OPENCLAW_CONFIG_DIR=/home/jon/BD2/external/openclaw/.state/config \
OPENCLAW_WORKSPACE_DIR=/home/jon/BD2/external/openclaw/.state/workspace \
docker compose up -d --force-recreate openclaw-gateway

curl http://127.0.0.1:18789/healthz
```

Validated result:

- `docker compose ps` reported `Up ... (healthy)` for `openclaw-gateway`
- `curl http://127.0.0.1:18789/healthz` returned `{"ok":true,"status":"live"}`
- The generated gateway token is stored in `/home/jon/BD2/external/openclaw/.state/config/openclaw.json`

## LocalAGI Status

LocalAGI was cloned successfully to `/home/jon/BD2/external/LocalAGI`.

It was not started in this pass because:

- the host lacks both `go` and `bun` for the source build path
- the default Docker path brings up a larger multi-container local-model stack (`localai`, `postgres`, `dind`, `sshbox`, `localagi`) and will download model/runtime assets

Documented quick start for later:

```bash
cd /home/jon/BD2/external/LocalAGI
docker compose up
```

## GCP Benchmark Instances

Date recorded: `2026-03-19`

Project:

- `agchain`

Zone:

- `us-east1-b`

Equal VM spec for all benchmark instances:

- machine type: `e2-standard-2`
- vCPU: `2`
- memory: `8 GB`
- boot disk: `100 GB pd-standard`
- image: `ubuntu-2204-lts`
- network mode: internal IP only, no external IP
- outbound package access: shared Cloud NAT in `us-east1`

### Repository URLs

- `OpenClaw`: `https://github.com/openclaw/openclaw.git`
- `LocalAI`: `https://github.com/mudler/LocalAI.git`
- `LocalAGI`: `https://github.com/mudler/LocalAGI.git`

### Instance Addresses

- `bd-bench-openclaw`: `10.142.0.5`
- `bd-bench-localai`: `10.142.0.4`
- `bd-bench-localagi`: `10.142.0.6`

### Intended Service URLs

These are internal VPC addresses, not public URLs.

- `OpenClaw`: `http://10.142.0.5:18789`
- `LocalAI`: `http://10.142.0.4:8080`
- `LocalAGI`: `http://10.142.0.6:3000`

### Current Benchmark Install Status

- `OpenClaw`
  - VM: `bd-bench-openclaw`
  - repo URL: `https://github.com/openclaw/openclaw.git`
  - success marker observed: `BENCH_INSTALL_OK openclaw`
  - intended URL: `http://10.142.0.5:18789`

- `LocalAI`
  - VM: `bd-bench-localai`
  - repo URL: `https://github.com/mudler/LocalAI.git`
  - success marker observed: `BENCH_INSTALL_OK localai`
  - intended URL: `http://10.142.0.4:8080`

- `LocalAGI`
  - VM: `bd-bench-localagi`
  - repo URL: `https://github.com/mudler/LocalAGI.git`
  - current state at last check: still building or pulling its Docker stack during startup-script execution
  - intended URL: `http://10.142.0.6:3000`
