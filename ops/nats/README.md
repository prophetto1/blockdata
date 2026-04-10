# NATS Coordination Broker

This directory defines the checked-in broker contract for the writing-system coordination runtime.

## Phase 0/1/2 ownership

- JON hosts the only NATS + JetStream broker.
- The Windows service name is fixed as `nats-server`.
- BUDDY connects remotely over the LAN through `COORDINATION_NATS_URL`.

## Authoritative config

- Checked-in template: `ops/nats/nats-server.conf`
- Rendered runtime config: `.codex-tmp/nats-runtime/nats-server.rendered.conf`
- Runtime root on JON: `.codex-tmp/nats-runtime/`

The checked-in config is the source of truth for:

- broker listener ports
- HTTP monitoring port
- JetStream storage layout
- pid and log paths

The service scripts render the checked-in template into the host-local runtime root so the service never depends on SMB mappings or machine-specific hardcoded paths inside the tracked config file.

## Ports

- NATS client port: `4222`
- NATS monitoring HTTP port: `8222`

## Locked stream and KV inventory

Phase `0/1/2` creates and uses:

- stream: `COORD_EVENTS`
- KV bucket: `COORD_TASK_STATE`
- KV bucket: `COORD_TASK_PARTICIPANTS`
- KV bucket: `COORD_AGENT_PRESENCE`
- KV bucket: `COORD_TASK_CLAIMS`

`APP_EVENTS` is explicitly deferred beyond phase `0/1/2`.

## Runtime state

Host-local runtime state lives outside `_collaborate/` and under `.codex-tmp/`:

- `.codex-tmp/nats-runtime/` for broker data, logs, pid, and rendered config
- `.codex-tmp/coordination-runtime/` for host-local outbox and audit fallback

`_collaborate/` is not part of the runtime substrate. It may receive human-readable audit or handoff artifacts later, but broker correctness does not depend on it.

## Operator scripts

- `scripts/nats/install-service.ps1`
- `scripts/nats/start-service.ps1`
- `scripts/nats/stop-service.ps1`
- `scripts/nats/remove-service.ps1`
- `scripts/nats/status-service.ps1`
- `scripts/nats/verify-smoke.ps1`

## Required environment

- `COORDINATION_NATS_URL` is the only authoritative client connection setting.
- `COORDINATION_RUNTIME_ROOT` defaults to `<repo>/.codex-tmp/coordination-runtime/`.
- `COORDINATION_RUNTIME_ENABLED` controls whether the platform runtime bridge starts.
- `NATS_SERVER_EXE` may be used to point the service scripts at a specific `nats-server.exe` binary when it is not already on `PATH`.
