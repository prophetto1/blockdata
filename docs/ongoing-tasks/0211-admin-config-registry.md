# Admin / Superuser Config Registry (Canonical)

**Date:** 2026-02-11  
**Status:** Active  
**Purpose:** Single source of truth for platform runtime config defaults, hardcoded values, and admin-control targets.  
**Verification:** Cross-checked against current repo files on 2026-02-11.  
**Depends on:** Priority 3 (registry lock) and Priority 6 (admin controls) in `0211-core-priority-queue-and-optimization-plan.md`

---

## 1) Why This Matters

The platform currently has at least ~20 config defaults and hardcoded values spread across worker, UI, ingest/conversion, and DB migration layers.

Current risks:

1. Duplicate defaults across layers with no single source of truth.
2. Inconsistent defaults (for example, worker temperature fallback vs UI/DB defaults).
3. Values that directly affect optimization behavior (batching, output budget) are not centrally governed.
4. Multi-provider UI exists, but worker provider resolution is still Anthropic-specific.

This registry catalogs those values and defines the target admin config surface.

---

## 2) Confirmed Inventory

### A. Worker Execution (`supabase/functions/worker/index.ts`)

| Config | Current Value | Line | Conflict? | Notes |
|---|---|---:|---|---|
| Claim batch size (default) | `25` | 86 | Yes | Queue-claim size currently couples with one-block call loop behavior |
| Claim batch size (min) | `1` | 86 | No | Lower bound |
| Claim batch size (max) | `100` | 86 | Possibly | May need adjustment after true multi-block packing |
| Max retries fallback | `getEnv("WORKER_MAX_RETRIES", "3")` | 90 | No | Env fallback present |
| Platform API key fallback | `getEnv("ANTHROPIC_API_KEY", "")` | 93 | No | Env fallback present but provider-specific |
| Default system prompt fallback | `"You are a document analysis assistant..."` | 203 | Yes | Should be policy-controlled fallback |
| Default per-block prompt fallback | `"Extract the following fields..."` | 206 | Yes | Should be policy-controlled fallback |
| Default model fallback | `getEnv("WORKER_DEFAULT_MODEL", "claude-sonnet-4-5-20250929")` | 214 | Yes | Duplicated with UI/DB defaults |
| Default temperature fallback | `0.2` | 219 | Yes | Inconsistent with UI/DB `0.3` |
| Default max tokens per block fallback | `2000` | 225 | Yes | Strong effect on batch sizing and output budget |
| Anthropic endpoint | `https://api.anthropic.com/v1/messages` | 36 | Yes | Worker path is endpoint-specific |
| Anthropic version header | `2023-06-01` | 41 | No | Provider-specific version pin |
| Provider key filter | `.eq("provider", "anthropic")` | 166 | Yes | User key resolution is Anthropic-only |
| Tool name / protocol | `extract_fields`, `tool_choice` | 27, 55 | Possibly | Fixed protocol choice in code |

### B. Upload (`web/src/pages/Upload.tsx`)

| Config | Current Value | Line | Conflict? | Notes |
|---|---|---:|---|---|
| Max files per batch | `10` | 48 | No | Operational limit, should be policy-driven |
| Allowed extensions | `['.md', '.docx', '.pdf', '.pptx', '.xlsx', '.html', '.csv', '.txt']` | 49 | No | Should stay aligned with backend conversion capability |

### C. Provider Registry (`web/src/pages/Settings.tsx`)

| Config | Current Value | Lines | Conflict? | Notes |
|---|---|---|---|---|
| `PROVIDERS[]` catalog | anthropic/openai/google/custom + model lists | 54-113 | Yes | Frontend-owned provider catalog can drift from backend policy |
| Anthropic default model | `claude-sonnet-4-5-20250929` | 69 | Yes | Duplicated default |
| OpenAI default model | `gpt-4.1-mini` | 87 | No | UI default |
| Google default model | `gemini-2.5-flash` | 103 | No | UI default |
| UI default temperature | `0.3` | 133 | Yes | Conflicts with worker fallback `0.2` |
| UI default max tokens | `2000` | 134 | No | Matches DB/worker fallback |

### D. DB Defaults (`supabase/migrations/20260210191613_014_user_api_keys.sql` and hardening migration)

| Config | Current Value | Source | Conflict? | Notes |
|---|---|---|---|---|
| Column default model | `claude-sonnet-4-5-20250929` | `014_user_api_keys.sql:9` | Yes | Duplicated with worker/UI |
| Column default temperature | `0.3` | `014_user_api_keys.sql:10` | Yes | Conflicts with worker fallback |
| Column default max tokens | `2000` | `014_user_api_keys.sql:11` | No | Matches fallback |
| RPC default model/temp/tokens (`COALESCE`) | same values | `014_user_api_keys.sql` and `20260210200122_user_api_keys_security_hardening.sql` | Yes | Duplicated default policy in SQL layer |

### E. Custom provider schema/RPC drift

| Config | Current Value | Source | Conflict? | Notes |
|---|---|---|---|---|
| `user_api_keys.base_url` persistence contract | Expected by app and edge function logic | `web/src/pages/Settings.tsx:119`, `supabase/functions/user-api-keys/index.ts:95` | Yes | App/edge code reads and writes `base_url`, but migration table definition does not codify that column |
| RPC `p_base_url` contract | Expected by PATCH path | `supabase/functions/user-api-keys/index.ts:117-123` | Yes | Edge function sends `p_base_url`, but migration RPC signatures currently omit `p_base_url` |

### F. Ingest / Conversion

| Config | Current Value | Source | Conflict? | Notes |
|---|---|---|---|---|
| Storage bucket default fallback | `getEnv("DOCUMENTS_BUCKET", "documents")` | `ingest/index.ts:43`, `conversion-complete/index.ts:80` | Possibly | Env-backed, but duplicated fallback literal in two functions |

### G. Claim RPC ordering

| Config | Current Value | Source | Conflict? | Notes |
|---|---|---|---|---|
| Overlay claim ordering | `ORDER BY bo.block_uid` | `supabase/migrations/20260210053649_010_claim_overlay_batch_rpc.sql:20` | Yes | Two ordering risks: (1) immediate lexicographic bug (`...:10` sorts before `...:2`) vs numeric `block_index`; (2) future cross-document interleaving risk if batching scope expands beyond single-run/single-`conv_uid` boundaries |

### H. Listings / Pagination

| Config | Current Value | Source | Conflict? | Notes |
|---|---|---|---|---|
| Schemas list limit | `.limit(50)` | `web/src/pages/Schemas.tsx:31` | No | Arbitrary query cap |
| WorkspaceHome recent items | `.limit(6)` | `web/src/pages/WorkspaceHome.tsx:73` | No | UI list cap |

---

## 3) Conflict Summary

### Critical conflicts (blocks optimization/multi-provider correctness)

1. Default model duplicated across worker, UI, and DB defaults.
2. Temperature mismatch: worker fallback `0.2` vs UI/DB `0.3`.
3. Max tokens per block fixed at `2000`, which heavily constrains multi-block output budgeting if treated as per-block reserve.
4. Claim size and future LLM pack size are not represented as separate policy controls.
5. Worker provider path is Anthropic-specific despite multi-provider key UI.
6. Custom provider `base_url` persistence/RPC contract is used by app code but not fully codified in migrations.
7. Current claim ordering uses `block_uid`, which is unsafe as canonical execution order for pack-based batching; current run scope avoids cross-document mixing today, but numeric ordering is still incorrect and cross-document grouping becomes relevant if/when batching spans more than one run.

### Non-critical but worth centralizing

1. Worker prompt fallbacks are hardcoded.
2. Upload limits and extension allowlist are UI constants.
3. Provider model catalog in Settings is static code.
4. Bucket fallback literal duplicated.

---

## 4) Target Admin Config Schema

### Worker execution

| Key | Type | Suggested default | Notes |
|---|---|---|---|
| `worker.claim_batch_size` | integer | `25` | Queue claim size per invocation |
| `worker.claim_ordering` | enum | `block_index` | Deterministic claim/pack sequencing key for batching workflows |
| `worker.max_retries` | integer | `3` | Retry ceiling |
| `worker.default_system_prompt` | text | current fallback | Used when schema lacks prompt config |
| `worker.default_block_prompt` | text | current fallback | Used when schema lacks prompt config |

### LLM optimization

| Key | Type | Suggested default | Notes |
|---|---|---|---|
| `llm.prompt_caching_enabled` | boolean | `true` | Master switch; provider-specific (Anthropic) until equivalent support exists for other providers |
| `llm.batching_enabled` | boolean | `false` initially | Enable after rollout |
| `llm.min_blocks_per_call` | integer | `1` | Lower pack bound |
| `llm.max_blocks_per_call` | integer | `40` | Upper pack bound |
| `llm.context_utilization_pct` | integer | `80` | Safety control |
| `llm.output_tokens_per_block_estimate` | integer | `300` | Packing estimator input |
| `llm.output_reserve_pct` | integer | `15` | Reserve for output variance |
| `llm.processing_mode` | enum | `realtime` | `realtime` or `batch_api` |

### Model/provider policy

| Key | Type | Suggested default | Notes |
|---|---|---|---|
| `models.platform_default_model` | string | `claude-sonnet-4-5-20250929` | Single source of truth |
| `models.platform_default_temperature` | number | `0.3` | Resolve drift |
| `models.platform_default_max_tokens` | integer | `2000` | Default upper bound |
| `models.provider_registry` | jsonb | current provider map | Provider/model catalog and enable flags |

### Upload/ingest policy

| Key | Type | Suggested default | Notes |
|---|---|---|---|
| `upload.max_files_per_batch` | integer | `10` | UI/backend consistency |
| `upload.allowed_extensions` | string[] | current list | Should align with conversion support |
| `storage.bucket_name` | string | `documents` | Single source for bucket default |

---

## 5) Ownership Model

### Layer A: Environment (deployment-level)

Examples: secrets, provider host/version pins, bucket fallback.

### Layer B: Admin policy (superuser page)

Examples: batching, caching, default model policy, upload limits, provider enablement.

### Layer C: Run/schema/user scope

Examples: schema `prompt_config`, run `model_config`, user key defaults.

**Rule:** Snapshot effective policy at run creation (for example `runs_v2.config_snapshot`) so mid-run admin changes do not alter in-flight behavior.

---

## 6) Rollout Sequence

1. Create config storage and seed from current runtime values.
2. Move worker optimization keys to config reads with existing fallbacks retained.
3. Move provider/model defaults and upload limits to config reads.
4. Add admin UI for policy management.
5. Remove stale hardcoded duplicates after verification.

---

## 7) Priority Mapping

| Priority in queue | Focus |
|---|---|
| Priority 3 | Lock this registry and resolve policy conflicts |
| Priority 4 | Prompt caching with policy toggle |
| Priority 5 | Adaptive batching with policy controls |
| Priority 6 | Admin controls UI + auditability |

