# NATS Coordination Runtime Runbook

## Purpose

This runbook covers the writing-system coordination substrate built on NATS + JetStream for phases `0/1/2`.

The runtime contract is:

- JON hosts the only broker as Windows service `nats-coordination`.
- Each machine runs the repo-managed coordination client from its own local checkout.
- `services/platform-api` owns the authenticated runtime bridge.
- `web` consumes that bridge through the superuser runtime page.
- `_collaborate/` is not part of the runtime substrate.

## Phase Ownership

### Phase 0

- JON runs the broker install, start, status, and smoke verification commands.
- BUDDY connects remotely over `COORDINATION_NATS_URL` and uses the CLI for create, watch, and event proof.
- `platform-api`, `web`, and browser verification are not required for the broker-only phase.

### Phase 1

- JON still owns the broker host role and may run the coordination CLI locally for claim and event actions.
- BUDDY still owns the remote host proof that the substrate works cross-machine.
- `platform-api`, `web`, and browser verification remain optional unless you are troubleshooting ahead of phase `2`.

### Phase 2

- JON runs the broker, `platform-api`, and `web`.
- Browser verification runs on JON against `/app/superuser/coordination-runtime`.
- BUDDY continues to act as the second host that creates tasks, watches events, and proves cross-host delivery.

## Locked Config Contract

| Setting | Contract |
|---|---|
| Windows service name | `nats-coordination` |
| Broker host | JON |
| Client connection env | `COORDINATION_NATS_URL` |
| Runtime root env | `COORDINATION_RUNTIME_ROOT` |
| Runtime enable flag | `COORDINATION_RUNTIME_ENABLED` |
| Optional broker binary override | `NATS_SERVER_EXE` |
| Broker runtime root | `<repo>/.codex-tmp/nats-runtime/` |
| Coordination runtime root | `<repo>/.codex-tmp/coordination-runtime/` |

Defaults and locked behavior:

- `COORDINATION_RUNTIME_ROOT` defaults to `<repo>/.codex-tmp/coordination-runtime/`.
- `COORDINATION_RUNTIME_ENABLED=false` disables the platform runtime bridge.
- JON and BUDDY must each run the coordination adapter from their own local checkout, not an SMB-mounted checkout.
- Host-local outbox and audit fallback live under `.codex-tmp/coordination-runtime/`.

## Expected Stream And KV Inventory

Phase `0/1/2` requires the following JetStream inventory:

- Stream: `COORD_EVENTS`
- KV bucket: `COORD_TASK_STATE`
- KV bucket: `COORD_TASK_PARTICIPANTS`
- KV bucket: `COORD_AGENT_PRESENCE`
- KV bucket: `COORD_TASK_CLAIMS`

`APP_EVENTS` is deferred beyond phase `0/1/2` and is not part of this runbook.

## Broker Operations On JON

Run these from `E:\writing-system`.

### Install Or Update The Service

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\install-service.ps1
```

If `nats-server` is not already on `PATH`, point the scripts at the binary first:

```powershell
$env:NATS_SERVER_EXE = 'C:\path\to\nats-server.exe'
powershell -ExecutionPolicy Bypass -File scripts\nats\install-service.ps1
```

### Start The Broker

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\start-service.ps1
```

### Check Service Status

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\status-service.ps1
```

The status output should show:

- service name `nats-coordination`
- rendered config under `.codex-tmp\nats-runtime\nats-server.rendered.conf`
- runtime root under `.codex-tmp\nats-runtime`

### Smoke Verify Broker Ports

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\verify-smoke.ps1
```

Expected smoke conditions:

- service state is `Running`
- client port `4222` is open
- monitor port `8222` is open

### Stop The Broker

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\stop-service.ps1
```

### Remove The Service

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\remove-service.ps1
```

## Coordination CLI Reference

Run these from `E:\writing-system`.

Common identity flags:

- `--host <HOST>`
- `--agent-id <AGENT>`
- `--timeout-ms <MILLISECONDS>`

Useful commands:

```powershell
node scripts/coordination/agent-coord.mjs status --host JON --agent-id jon-runtime
node scripts/coordination/agent-coord.mjs broker-probe --host JON --agent-id jon-runtime
node scripts/coordination/agent-coord.mjs presence-heartbeat --host JON --agent-id jon-runtime
node scripts/coordination/agent-coord.mjs task-create --task-id e2e-001 --host BUDDY --agent-id buddy-smoke --json '{"title":"dual-host smoke"}'
node scripts/coordination/agent-coord.mjs task-claim --task-id e2e-001 --host JON --agent-id jon-runtime
node scripts/coordination/agent-coord.mjs task-event --task-id e2e-001 --event-kind progress --host JON --agent-id jon-runtime --json '{"note":"claimed on JON"}'
node scripts/coordination/agent-coord.mjs task-complete --task-id e2e-001 --host JON --agent-id jon-runtime --json '{"result":"complete"}'
node scripts/coordination/agent-coord.mjs task-watch --task-id e2e-001 --count 2 --timeout-ms 10000 --host BUDDY --agent-id buddy-smoke
node scripts/coordination/agent-coord.mjs outbox-flush --host BUDDY --agent-id buddy-smoke
```

### Broker Contract Smoke

After the broker is running, verify the expected stream and bucket contract:

```powershell
npm run coordination:smoke
```

This command should fail fast if the broker is unreachable or if `COORD_EVENTS` or any required KV bucket is missing.

## Dual-Host Walkthrough

This is the standard operator proof that the runtime works between JON and BUDDY.

### 1. Start The Broker On JON

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\install-service.ps1
powershell -ExecutionPolicy Bypass -File scripts\nats\start-service.ps1
powershell -ExecutionPolicy Bypass -File scripts\nats\verify-smoke.ps1
npm run coordination:smoke
```

### 2. Set Runtime Env On Both Hosts

On JON:

```powershell
$env:COORDINATION_NATS_URL = 'nats://127.0.0.1:4222'
$env:COORDINATION_RUNTIME_ENABLED = 'true'
```

On BUDDY, point to JON by machine name or LAN IP:

```powershell
$env:COORDINATION_NATS_URL = 'nats://JON:4222'
$env:COORDINATION_RUNTIME_ENABLED = 'true'
```

Optional explicit runtime root on either host:

```powershell
$env:COORDINATION_RUNTIME_ROOT = 'E:\writing-system\.codex-tmp\coordination-runtime'
```

### 3. Create The Task On BUDDY

```powershell
node scripts/coordination/agent-coord.mjs task-create --task-id e2e-001 --host BUDDY --agent-id buddy-smoke --json '{"title":"dual-host smoke","owner":"BUDDY"}'
```

### 4. Start A Watcher On BUDDY

```powershell
node scripts/coordination/agent-coord.mjs task-watch --task-id e2e-001 --count 2 --timeout-ms 10000 --host BUDDY --agent-id buddy-smoke
```

Leave this running while JON publishes the next events.

### 5. Claim And Publish On JON

```powershell
node scripts/coordination/agent-coord.mjs task-claim --task-id e2e-001 --host JON --agent-id jon-runtime
node scripts/coordination/agent-coord.mjs task-event --task-id e2e-001 --event-kind progress --host JON --agent-id jon-runtime --json '{"note":"claimed on JON"}'
node scripts/coordination/agent-coord.mjs task-complete --task-id e2e-001 --host JON --agent-id jon-runtime --json '{"result":"complete"}'
```

Expected result:

- BUDDY sees the streamed task events within seconds.
- JON can read status without direct browser-to-broker access.

### 6. Bring Up The Runtime Bridge On JON For Phase 2

Open two terminals on JON from `E:\writing-system`:

```powershell
npm run platform-api:dev
```

```powershell
cd web
npm run dev
```

Then open the browser on JON and verify:

- route: `http://localhost:5374/app/superuser/coordination-runtime`
- status page loads through `platform-api`
- event feed updates without direct browser connection to `nats://...`

## Local Outbox And Audit Recovery

Host-local coordination fallback lives under:

- root: `.codex-tmp/coordination-runtime/`
- outbox: `.codex-tmp/coordination-runtime/coordination-outbox/<host>/<agentId>/`
- audit fallback: `.codex-tmp/coordination-runtime/coordination-audit/`

Buffered event files are day-partitioned `.ndjson` files. Example:

```text
E:\writing-system\.codex-tmp\coordination-runtime\coordination-outbox\BUDDY\buddy-smoke\2026-04-09.ndjson
```

### Recovery After Broker Outage

1. On JON, restart the broker:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\nats\start-service.ps1
powershell -ExecutionPolicy Bypass -File scripts\nats\verify-smoke.ps1
```

2. On the affected host, inspect backlog:

```powershell
node scripts/coordination/agent-coord.mjs status --host BUDDY --agent-id buddy-smoke
```

3. Flush buffered events:

```powershell
node scripts/coordination/agent-coord.mjs outbox-flush --host BUDDY --agent-id buddy-smoke
```

4. Re-run the watcher or status command to confirm the backlog is reduced.

## Failure Modes

### Broker Outage

Expected behavior:

- CLI publish attempts may buffer locally instead of dropping the event.
- `platform-api` status returns `200` with degraded broker state rather than crashing startup.
- the SSE route stays open and can emit degraded control envelopes while reconnect is in progress.

Operator response:

- restart the JON broker service
- run smoke verification
- inspect host-local outbox backlog
- flush the outbox once the broker is healthy

### Claim Conflict

Expected behavior:

- conflicting claim attempts raise `TaskRevisionConflictError`
- the stable error code is `task_claim_conflict`

Operator response:

- inspect the current claim owner before retrying
- do not force a second owner onto the same task
- release or complete the task from the current owner before re-claiming

### Disabled Runtime Mode

Expected behavior:

- `GET /admin/runtime/coordination/status` returns `503`
- `GET /admin/runtime/coordination/tasks/{task_id}` returns `503`
- `GET /admin/runtime/coordination/events/stream` returns `503`
- the stable error code is `coordination_runtime_disabled`
- the superuser runtime page shows the disabled state instead of the live feed

Operator response:

- set `COORDINATION_RUNTIME_ENABLED=true`
- restart `platform-api`
- reload the runtime page

### Outbox Saturation

Expected behavior:

- local buffering stops when the outbox exceeds the cap
- the exact message is `Local coordination outbox cap exceeded`
- the stable error code is `coordination_outbox_full`

Operator response:

- restore broker connectivity quickly
- inspect `.codex-tmp/coordination-runtime/coordination-outbox/<host>/<agentId>/`
- flush backlog after broker recovery
- do not keep publishing indefinitely against a saturated outbox

## Quick Verification Checklist

- JON broker service installed as `nats-coordination`
- `scripts\nats\verify-smoke.ps1` passes
- `npm run coordination:smoke` passes
- BUDDY can create and watch a task over `COORDINATION_NATS_URL`
- JON can claim and publish task events
- JON runtime page loads at `/app/superuser/coordination-runtime`
- browser feed is powered by `platform-api`, not direct browser-to-broker access
