# Admin / Superuser Config Registry (Canonical)

**Date:** 2026-02-12  
**Status:** Priority 3 locked (baseline contracts codified); Priority 6 runtime policy controls passed  
**Purpose:** Single source of truth for runtime config ownership, defaults, and interim hardcoded policy handling.  
**Verification:** Repo + runtime cross-check completed on 2026-02-12.  
**Depends on:** Priority 3 (registry lock) and Priority 6 (admin controls) in `0211-core-priority-queue-and-optimization-plan.md`

---

## 1) Priority 3 Lock Outcomes (Critical Conflicts Closed)

| Conflict | Resolution | Enforced By | Status |
|---|---|---|---|
| Worker/UI/DB default drift (`model`, `temperature`, `max_tokens`) | Locked canonical baseline to `claude-sonnet-4-5-20250929`, `0.3`, `2000`; worker fallback temperature aligned from `0.2` -> `0.3` | `supabase/functions/worker/index.ts`, `web/src/pages/Settings.tsx`, `supabase/migrations/20260210191613_014_user_api_keys.sql` | Closed |
| `base_url` persistence and RPC parity | Codified `user_api_keys.base_url` in repo migration history and locked RPC signatures with `p_base_url` | `supabase/migrations/20260211091818_add_base_url_multi_provider.sql`, runtime migration `add_base_url_multi_provider` | Closed |
| Edge PATCH path not validating `base_url` contract | PATCH now uses same provider-aware URL validation as POST | `supabase/functions/user-api-keys/index.ts` (deployed `user-api-keys` v3) | Closed |
| Claim ordering lexicographic bug (`block_uid`) | Claim RPC now orders by numeric `blocks_v2.block_index` | `supabase/migrations/20260212004639_017_claim_overlay_batch_block_index_ordering.sql`, runtime migration `017_claim_overlay_batch_block_index_ordering` | Closed |
| Provider behavior ambiguity (multi-provider UI vs worker path) | Contract locked: runtime worker execution is Anthropic-only in core gates; multi-provider UI is key-management readiness for later policy-driven runtime | `supabase/functions/worker/index.ts`, `web/src/pages/Settings.tsx` | Closed (contract clarified) |

---

## 2) Locked Inventory (Post-Priority 3)

### A. Worker Execution (`supabase/functions/worker/index.ts`)

| Config | Current Value | Ownership | Priority 3 Status | Notes |
|---|---|---|---|---|
| Claim batch size bounds | `worker.claim_batch_size.default/min/max` in `admin_runtime_policy` (seed `25/1/100`) | Admin policy (superuser-managed) | Implemented in Priority 6 | Snapshotted into run at creation; consumed by worker from run policy snapshot |
| Max retries fallback | `getEnv("WORKER_MAX_RETRIES", "3")` | Environment | Locked | Deployment-level override |
| Platform API key fallback | `getEnv("ANTHROPIC_API_KEY", "")` | Environment | Locked | Provider-specific by current contract |
| Default model fallback | `getEnv("WORKER_DEFAULT_MODEL", "claude-sonnet-4-5-20250929")` | Environment -> policy fallback | Locked | Aligned with UI/DB baseline |
| Default temperature fallback | `0.3` | Policy fallback | Locked | Drift resolved |
| Default max tokens fallback | `2000` | Policy fallback | Locked | Aligned with UI/DB baseline |
| Default prompt fallbacks | hardcoded system/block prompt strings | Admin policy (interim hardcoded) | Deferred by design | Move to admin policy keys in Priority 6 |
| Provider key selection | `.eq("provider", "anthropic")` | Runtime contract | Locked | Explicitly Anthropic-only for core gate phase |

### B. Provider Registry + User Defaults (`web/src/pages/Settings.tsx`)

| Config | Current Value | Ownership | Priority 3 Status | Notes |
|---|---|---|---|---|
| `PROVIDERS[]` catalog | anthropic/openai/google/custom | Admin policy (interim hardcoded) | Deferred by design | Will move to `models.provider_registry` in Priority 6 |
| Anthropic default model | `claude-sonnet-4-5-20250929` | Policy baseline | Locked | Matches worker/DB |
| UI default temperature | `0.3` | Policy baseline | Locked | Matches worker/DB |
| UI default max tokens | `2000` | Policy baseline | Locked | Matches worker/DB |

### C. DB Defaults + RPCs (`user_api_keys`)

| Config | Current Value | Ownership | Priority 3 Status | Notes |
|---|---|---|---|---|
| Column defaults | model `claude-sonnet-4-5-20250929`, temp `0.3`, max tokens `2000` | Policy baseline | Locked | Aligns with worker/UI |
| `base_url` column | present (`TEXT`) | Run/schema/user scope | Locked | Codified in repo migration history |
| `save_api_key` signature | includes `p_base_url` | Run/schema/user scope | Locked | Signature parity complete |
| `update_api_key_defaults` signature | includes `p_base_url` | Run/schema/user scope | Locked | PATCH parity complete |

### D. Claim RPC Ordering

| Config | Current Value | Ownership | Priority 3 Status | Notes |
|---|---|---|---|---|
| Claim ordering key | `ORDER BY b.block_index ASC, bo.block_uid ASC` | Admin policy/runtime contract | Locked | Numeric ordering contract codified for batching workflows |

---

## 3) Ownership Model (Locked)

### Layer A: Environment (deployment-level)

- Secrets and deployment overrides:
  - `ANTHROPIC_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WORKER_MAX_RETRIES`
  - `WORKER_DEFAULT_MODEL`
  - `DOCUMENTS_BUCKET`

### Layer B: Admin policy (superuser-owned; runtime store implemented in Priority 6)

- Runtime policy keys:
  - `worker.claim_batch_size`
  - `worker.claim_ordering`
  - `worker.default_system_prompt`
  - `worker.default_block_prompt`
  - `models.provider_registry`
  - `models.platform_default_model`
  - `models.platform_default_temperature`
  - `models.platform_default_max_tokens`
  - `upload.max_files_per_batch`
  - `upload.allowed_extensions`

### Layer C: Run/schema/user scope

- Per-user and per-run overrides:
  - `schemas.prompt_config.*`
  - `runs_v2.model_config`
  - `user_api_keys.default_model`
  - `user_api_keys.default_temperature`
  - `user_api_keys.default_max_tokens`
  - `user_api_keys.base_url`

**Rule:** Snapshot effective policy at run creation so mid-run admin changes do not alter in-flight behavior (Priority 6 implementation item).

---

## 4) Interim Hardcoded Handling (Explicit)

These values remain intentionally hardcoded after Priority 6 because they are out of the current control-plane scope:

1. Worker claim batch bounds (`25`, `1`, `100`).
2. Worker fallback system/block prompts.
3. Frontend `PROVIDERS[]` model catalog.
4. Upload caps/allowlist in UI.
5. Bucket fallback literal duplicated in ingest/conversion functions.

Interim contract for Priority 3: no conflicting defaults, no ambiguous ownership, and no undocumented behavior drift.

---

## 5) Superuser Control Design Standard (Priority 6)

This section defines the **standard UX + contract pattern** for every superuser-controlled config value.

The core idea:
- The **value** is adjustable at superuser discretion.
- The **control-plane semantics** are fixed and must not drift.

### 5.1 Standard pattern (apply to every policy key)

For each policy key, the spec must state:

1. **Control**: toggle / slider / dropdown / numeric input (+ exact input if needed).
2. **Scope**: what behavior this key controls (and what it explicitly does not).
3. **Precedence**: where it sits in the override chain (admin baseline vs run/schema/user/env).
4. **Effective value + provenance**: always show `effective=<value> (source=<layer>)`.
5. **Snapshot**: policy changes apply to **new runs only**; runs snapshot effective values at creation.
6. **Safety + validation**: min/max bounds, type validation, and behavior when unset/invalid.
7. **Audit**: record `who/when/from/to` (and optional reason).

### 5.2 Example: `models.platform_default_temperature`

**Goal:** a minimal, playground-style temperature control that is easy to tune without introducing ambiguity.

- **Control**
  - Slider: `0.0 → 1.0` with step `0.05`
  - Numeric input: exact value (validated to the same bounds)
  - Label anchors (UX only): `0.0 Deterministic`, `0.3 Balanced`, `0.8 Creative`
- **Scope**
  - Sets the admin baseline temperature used **only when** no run/schema/user override provides a temperature.
  - Does not force an in-flight run to change behavior.
- **Precedence**
  - `schemas.prompt_config.temperature` → `runs_v2.model_config.temperature` → `user_api_keys.default_temperature` → **admin policy baseline** → env fallback → hardcoded fallback
- **Effective value + provenance**
  - Display: `effective=0.30 (source=admin policy baseline)`
  - If overridden: `effective=0.20 (source=run override)`
- **Snapshot**
  - Applies to runs created after `<timestamp>`.
  - Each run stores a snapshot so mid-run edits do not alter in-flight behavior.
- **Safety + validation**
  - Reject values outside `[0.0, 1.0]`.
  - If unset, fall back to the baseline defined in this registry (and record the source as fallback).
- **Audit**
  - Log: `changed_by`, `changed_at`, `old_value`, `new_value`.

---

## 6) Verification Evidence (2026-02-12)

1. Runtime migration history includes:
   - `add_base_url_multi_provider` (`20260211091818`)
   - `017_claim_overlay_batch_block_index_ordering` (`20260212004639`)
2. Runtime function definition check:
   - `claim_overlay_batch` now joins `blocks_v2` and orders by `block_index`.
3. Transactional ordering proof (`BEGIN ... ROLLBACK`):
   - `claimed_in_order = [0,1,2,3,4,5,6,7,8,9,10,11]`
   - `expected_first_12 = [0,1,2,3,4,5,6,7,8,9,10,11]`
   - `matches_expected = true`
4. Edge deploy verification:
   - `user-api-keys` deployed at version `3`.
   - `worker` deployed at version `7`.

---

## 7) Priority Mapping

| Priority in queue | Focus |
|---|---|
| Priority 3 | Lock this registry and resolve policy conflicts |
| Priority 4 | Prompt caching with policy toggle |
| Priority 5 | Adaptive batching with policy controls |
| Priority 6 | Admin controls UI + auditability |

---

## 8) Priority 6 closure evidence (2026-02-12)

Priority 6 is now closed for the runtime optimization policy surface implemented in migration `018`.

1. Final policy key list approved and deployed:
   - `models.platform_default_model`
   - `models.platform_default_temperature`
   - `models.platform_default_max_tokens`
   - `worker.prompt_caching.enabled`
   - `worker.batching.enabled`
   - `worker.batching.pack_size`
   - `worker.batching.pack_size_max`
   - `worker.batching.text_heavy_max_pack_size`
   - `worker.batching.context_window_tokens`
   - `worker.batching.output_reserve_tokens`
   - `worker.batching.tool_overhead_tokens`
   - `worker.batching.max_output_tokens`
   - `worker.batching.per_block_output_tokens`
   - `worker.claim_batch_size.default`
   - `worker.claim_batch_size.min`
   - `worker.claim_batch_size.max`
   - `worker.max_retries`
   - `upload.max_files_per_batch`
   - `upload.allowed_extensions`
2. Runtime deploy complete:
   - `admin-config`, `runs`, and `worker` deployed with `verify_jwt=false` + internal auth checks.
   - `SUPERUSER_EMAIL_ALLOWLIST` configured as an edge secret.
   - migration `20260212114500_018_admin_runtime_policy_controls` applied remotely (policy row count = `19`).
3. New-run policy proof:
   - toggled `worker.prompt_caching.enabled: true -> false`
   - run `d9e80ff2-a61a-49d4-a093-89a7b4b0421e` snapshot kept `true` (pre-toggle)
   - run `63cfa335-7f99-4cc0-a3ca-a8ca4d60a7d9` snapshot captured `false` (post-toggle)
4. Mid-run drift prevention proof:
   - run `640cf4b0-6c6f-445b-bd13-ae80c1f2e73f` created while policy was `false`
   - worker invocation 1: `prompt_caching=false`, `remaining_pending=24`
   - policy restored globally to `true`
   - worker invocation 2 on same run: `prompt_caching=false`, `remaining_pending=19`
   - result: in-flight run behavior stayed on its run snapshot.
5. Audit visibility proof:
   - both policy toggles produced audit rows in `admin-config` API response (with reasons).
   - UI audit pane reads the same payload (`SuperuserSettings` uses `GET admin-config?audit_limit=100` and renders `auditRows`).
