---
title: gcp-benchmark-access
description: Public VM addresses, service URLs, and current readiness notes for the benchmark agent instances in agchain.
---

## Scope

This page records the current GCP benchmark instance addresses and intended access URLs for the three agent systems still staged in `agchain`.

Project:

- `agchain`

Zone:

- `us-east1-b`

Equal VM spec:

- `e2-standard-2`
- `2 vCPU`
- `8 GB RAM`
- `100 GB pd-standard`
- `ubuntu-2204-lts`

## Public VM Addresses

| Service | VM name | Internal IP | Public IP |
| --- | --- | --- | --- |
| OpenClaw | `bd-bench-openclaw` | `10.142.0.5` | `34.26.128.79` |
| LocalAI | `bd-bench-localai` | `10.142.0.4` | `35.243.166.206` |
| LocalAGI | `bd-bench-localagi` | `10.142.0.6` | `34.148.58.215` |

## Browser And Service URLs

| Service | URL | Notes |
| --- | --- | --- |
| OpenClaw | `http://34.26.128.79:18789` | Gateway install completed. |
| LocalAI | `http://35.243.166.206:8080` | Install completed. |
| LocalAGI | `http://34.148.58.215:3000` | Public VM address is assigned, but the startup install last ended in failure. Treat this as the intended app URL, not a verified live endpoint. |

## Current Readiness

- `OpenClaw`
  - VM is running.
  - Startup install emitted `BENCH_INSTALL_OK openclaw`.
  - Public access target: `http://34.26.128.79:18789`

- `LocalAI`
  - VM is running.
  - Startup install emitted `BENCH_INSTALL_OK localai`.
  - Public access target: `http://35.243.166.206:8080`

- `LocalAGI`
  - VM is running.
  - Last startup run ended with `exit status 1`.
  - Public access target remains `http://34.148.58.215:3000`, but it should not be treated as benchmark-ready until re-verified.

## Upstream Repository URLs

- `OpenClaw`: `https://github.com/openclaw/openclaw.git`
- `LocalAI`: `https://github.com/mudler/LocalAI.git`
- `LocalAGI`: `https://github.com/mudler/LocalAGI.git`
