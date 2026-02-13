---
title: Runtime Policy
description: Superuser-owned runtime policy controls (snapshot + audit).
sidebar:
  order: 2
---

**Spec version:** v1.0  
**Date:** 2026-02-12  
**Sources:** `docs/ongoing-tasks/complete/0211-admin-optimization-controls-spec.md`, `docs/ongoing-tasks/complete/0211-admin-config-registry.md`  
**Status:** Canonical — implemented and verified in production

---

## Scope

This page defines the **runtime policy control plane**: the superuser-owned configuration surface that controls worker behavior (caching, batching, defaults) **without redeploys**, while preventing mid-run drift via **run-time snapshots** and providing **auditability**.

It does **not** define schema authoring UX (wizard/advanced editor) or review/export behavior.

---

<!-- BEGIN VERBATIM COPY from docs/ongoing-tasks/complete/0211-admin-optimization-controls-spec.md (Sections 1-6) -->

## 1) Non-negotiables

1. **Policy values are mutable; semantics are fixed.**
2. **Effective policy is snapshotted at run creation.**
   - Mid-run superuser edits must not change in-flight behavior.
3. **Every control must show effective value provenance**:
   - `effective=<value> (source=<layer>)`
4. **Every superuser change is auditable**:
   - `who/when/from/to` (and optional reason)

---

## 2) Standard control pattern

For every policy key, specify:

1. Control type (toggle / slider / dropdown / numeric).
2. Scope (what this controls; explicit non-scope).
3. Precedence (override chain).
4. Snapshot behavior (new runs only).
5. Safety & validation (bounds; unset/invalid behavior).
6. Audit record fields.

This pattern is canonical in `0211-admin-config-registry.md` and must remain consistent.

---

## 3) Policy keys (Priority 6 surface)

These keys are the intended superuser-controlled policy surface. They may start as hardcoded but must converge into superuser config ownership.

### Models + defaults

- `models.provider_registry` (catalog of providers exposed in Settings)
- `models.platform_default_model`
- `models.platform_default_temperature`
- `models.platform_default_max_tokens`

### Worker execution policy

- `worker.claim_batch_size` (default/min/max bounds)
- `worker.claim_ordering` (must preserve numeric `block_index` contract)
- `worker.default_system_prompt`
- `worker.default_block_prompt`
- `worker.max_retries` (if promoted from env override)

### Optimization controls

- `worker.prompt_caching.enabled` (Priority 4)
- `worker.prompt_caching.mode` (if needed later; default is simplest possible)
- `worker.batching.enabled` (Priority 5)
- `worker.batching.safety_margin` (if needed later)

### Upload policy

- `upload.max_files_per_batch`
- `upload.allowed_extensions`

---

## 4) Control designs (v0)

### 4.1 `models.platform_default_temperature`

Use the standard design in `0211-admin-config-registry.md` (slider + exact input + provenance + snapshot + audit).

### 4.2 `worker.prompt_caching.enabled` (Priority 4)

- Control: toggle `Off/On`
- Scope: enables provider caching directives for worker LLM calls
- Snapshot: applies to new runs only (run records caching enabled in snapshot)
- Provenance: show whether effective is from run snapshot vs admin baseline
- Safety: if provider ignores caching, treat as non-fatal (warn/telemetry; do not fail runs)
- Audit: log toggle flips

### 4.3 `worker.batching.enabled` (Priority 5)

- Control: toggle `Off/On`
- Scope: enables multi-block batching behavior (when implemented)
- Snapshot: applies to new runs only
- Safety: batching must preserve deterministic mapping to `(run_id, block_uid)` and must not introduce data-loss risk
- Audit: log toggle flips

---

## 5) What this spec does not decide

1. Exact baseline values (e.g., temperature number) beyond initial defaults used today.
2. Vendor/model catalogs beyond what is required for current core execution gates.
3. Any assistant/KG/vector/MCP policy (explicitly deferred behind core gates).

---

## 6) Implementation direction locked (2026-02-12)

1. Single superuser-only page under app settings:
   - route: `/app/settings/superuser`
   - single-page layout with category side nav + detail panel
2. Backend-first control plane:
   - persistent policy store (`admin_runtime_policy`)
   - audit log (`admin_runtime_policy_audit`)
   - superuser-only edge API for read/update + audit writes
3. Snapshot semantics enforced in run lifecycle:
   - effective policy snapshot persisted at run creation
   - worker consumes run snapshot defaults so mid-run admin edits do not drift in-flight behavior

<!-- END VERBATIM COPY -->

