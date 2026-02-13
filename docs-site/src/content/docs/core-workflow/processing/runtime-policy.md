---
title: Runtime Policy
description: Superuser-owned runtime policy controls for upload routing, worker behavior, and model defaults.
sidebar:
  order: 2
---

**Spec version:** v2.0  
**Date:** 2026-02-13  
**Status:** Implemented

## Scope

Runtime policy is the superuser-owned control plane for:

- model defaults,
- worker execution controls,
- upload limits and ingest routing.

Values are mutable at runtime. Semantics are fixed by code and policy validation.

## Control Plane

Runtime policy is stored in `admin_runtime_policy` with an audit trail in `admin_runtime_policy_audit`.
Superusers manage values from `/app/settings/superuser` through `admin-config`.

Core properties:

- updates apply to new work only (run snapshots prevent mid-run drift),
- every write is auditable (`changed_by`, `changed_at`, old/new JSON),
- invalid combinations are rejected before persistence.

## Upload Routing Model

Ingest routing uses a two-layer policy model:

1. Capability catalog (`upload.track_capability_catalog`)
2. Runtime enablement and routing (`upload.track_enabled`, `upload.extension_track_routing`, `upload.allowed_extensions`)

### Upload keys

- `upload.max_files_per_batch`
- `upload.allowed_extensions`
- `upload.track_enabled`
- `upload.extension_track_routing`
- `upload.track_capability_catalog`

### Validation invariants

- every allowed extension must have a routing entry,
- every routed track must be enabled for allowed extensions,
- routing target must be one of `mdast | docling | pandoc`,
- routed extension must exist in that track's capability list.

This prevents runtime policy drift between extension allow-list, track enablement, and declared track capability.

## Public Upload Policy API

The upload page reads policy at runtime via:

- `GET /functions/v1/upload-policy`

Response includes:

- `upload.max_files_per_batch`
- `upload.allowed_extensions`

This removes hardcoded frontend upload lists and keeps UI gating aligned with backend policy.
