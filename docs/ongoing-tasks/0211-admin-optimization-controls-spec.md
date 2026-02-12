# Spec: Admin / Superuser Optimization Controls (Priority 6)

**Date:** 2026-02-12  
**Status:** Draft spec (control patterns + key list); implementation deferred until Priority 6 execution  
**Purpose:** Define the superuser controls that govern runtime policy (caching, batching, defaults) without introducing drift or ambiguity.

---

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

