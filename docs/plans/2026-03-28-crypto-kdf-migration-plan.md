# Crypto KDF Migration Plan

**Goal:** Replace the current legacy `enc:v1` key-derivation scheme with a versioned cross-runtime crypto contract that both Python and Deno can read and write safely, without breaking existing encrypted rows in `user_variables`, `user_provider_connections`, or `user_api_keys`.

**Architecture:** Keep AES-256-GCM as the envelope cipher. Introduce a new versioned envelope prefix `enc:v2:` whose 32-byte key is derived with HKDF-SHA256 from the configured root secret plus the logical crypto context. Deploy read compatibility first: all Python and Deno readers must be able to decrypt legacy Python `enc:v1`, legacy Deno `enc:v1`, and new `enc:v2` ciphertext before any writer switches to `enc:v2`. Existing `enc:v1` rows remain readable until a later measured retirement step.

**Tech Stack:** Python `cryptography`, Deno WebCrypto, FastAPI platform-api, Supabase edge functions, pytest, Deno tests, OpenTelemetry counters/logs.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-28

## Source Documents

- [docs/refactor-issue-checklist.md](/E:/writing-system/docs/refactor-issue-checklist.md)
- [docs/plans/2026-03-27-refactor-issue-checklist-remediation-plan-v2.md](/E:/writing-system/docs/plans/2026-03-27-refactor-issue-checklist-remediation-plan-v2.md)
- [docs/plans/__complete/2026-03-27-auth-secrets-variables-env-separation-implementation-plan-v2-1.md](/E:/writing-system/docs/plans/__complete/2026-03-27-auth-secrets-variables-env-separation-implementation-plan-v2-1.md)
- [crypto.py](/E:/writing-system/services/platform-api/app/infra/crypto.py)
- [api_key_crypto.ts](/E:/writing-system/supabase/functions/_shared/api_key_crypto.ts)
- [provider-connections/index.ts](/E:/writing-system/supabase/functions/provider-connections/index.ts)
- [user-api-keys/index.ts](/E:/writing-system/supabase/functions/user-api-keys/index.ts)
- [model_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py)
- [pipeline_embeddings.py](/E:/writing-system/services/platform-api/app/services/pipeline_embeddings.py)

## Verified Current State

- Python `crypto.py` derives AES-GCM keys as `sha256(secret + context)` and emits `enc:v1:{iv}:{ciphertext}`.
- Deno `_shared/api_key_crypto.ts` derives AES-GCM keys as `sha256(secret + "\n" + context + "\n")` and also emits `enc:v1:{iv}:{ciphertext}`.
- Both runtimes therefore share the same envelope prefix but not the same key derivation.
- Python writes new ciphertext for:
  - `/secrets` with context `user-variables-v1`
  - `/connections/connect` with context `provider-connections-v1`
- Deno writes new ciphertext for:
  - `provider-connections` edge function with context `provider-connections-v1`
  - `user-api-keys` edge function with context `user-api-keys-v1`
- Python readers are currently mixed:
  - [connection.py](/E:/writing-system/services/platform-api/app/infra/connection.py) uses `decrypt_with_fallback(...)`
  - [pipeline_embeddings.py](/E:/writing-system/services/platform-api/app/services/pipeline_embeddings.py) uses `decrypt_with_fallback(...)`
  - [model_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py) still calls `decrypt_with_context(...)` directly with `SUPABASE_SERVICE_ROLE_KEY`
- No stored metadata distinguishes legacy Python `enc:v1` rows from legacy Deno `enc:v1` rows.
- The current defect is not the AES-GCM envelope itself; it is the unversioned legacy derivation contract and the mixed runtime implementations behind the same `enc:v1` prefix.

## Locked Decisions

1. `enc:v1` semantics are frozen. No code may reinterpret existing `enc:v1` ciphertext as HKDF-derived data.
2. The new write format is `enc:v2:{base64url(iv)}:{base64url(ciphertext)}`. The envelope shape stays the same; only the derivation version changes.
3. `enc:v2` uses HKDF-SHA256 with a 32-byte output key, not PBKDF2, scrypt, or Argon2. The root secret is already high entropy; this is a key-expansion problem, not password hashing.
4. `enc:v2` derivation must be identical in Python and Deno. The plan is complete only when both runtimes share test vectors for the same `(secret, context, plaintext)` inputs.
5. All readers must support three decrypt paths before any writer changes:
  - legacy Python `enc:v1`
  - legacy Deno `enc:v1`
  - new `enc:v2`
6. Writer cutover happens only after read compatibility is deployed everywhere that can encounter encrypted rows. No partial cutover is allowed.
7. `model_registry.py` may not keep a bespoke legacy decrypt path. It must converge on the same shared compatibility helper used by other Python readers.
8. The initial migration is read-compatible and write-forward only. It does not require a row rewrite to ship safely.
9. Legacy decrypt support remains in place until telemetry proves `enc:v1` usage is exhausted or explicitly accepted as permanent compatibility debt.

## Locked Compatibility Contract

### Legacy `enc:v1`

- Prefix: `enc:v1:`
- Cipher: AES-256-GCM
- Legacy derivation variants that must both remain readable:
  - Python legacy: `sha256(secret + context)`
  - Deno legacy: `sha256(secret + "\n" + context + "\n")`

### New `enc:v2`

- Prefix: `enc:v2:`
- Cipher: AES-256-GCM
- KDF: HKDF-SHA256
- Output key length: `32` bytes
- IKM: UTF-8 bytes of the configured root secret
- Salt: UTF-8 bytes of a fixed public scheme salt, e.g. `agchain-crypto-v2`
- Info: UTF-8 bytes of the crypto context string, e.g. `user-api-keys-v1`

### Read Rules

- `decrypt_*` helpers must dispatch by prefix first.
- For `enc:v2`, try only the `v2` HKDF derivation with the configured root keys in the normal primary/fallback order.
- For `enc:v1`, try the legacy derivations in a locked order per root key:
  1. Python legacy derivation
  2. Deno legacy derivation
- Plaintext passthrough behavior is unchanged by this plan; it remains a separately instrumented legacy compatibility path.

### Write Rules

- No writer emits `enc:v2` until both runtimes can read all three supported formats.
- After cutover:
  - Python `encrypt_with_context(...)` emits `enc:v2`
  - Deno `encryptWithContext(...)` emits `enc:v2`
- No new code may emit legacy `enc:v1` after cutover except in an explicit rollback.

## Locked Rollout And Rollback Contract

### Rollout

1. Land shared compat tests and version-aware read helpers in Python and Deno.
2. Convert all Python readers to the shared compat helper, including `model_registry.py`.
3. Deploy read compatibility only.
4. Observe telemetry for legacy decrypt hits and unexpected decrypt failures.
5. Switch Python and Deno writers to `enc:v2` in one coordinated rollout window.
6. Observe `enc:v2` write/read success before considering any backfill.

### Rollback

- If `enc:v2` writes misbehave after cutover, rollback means switching writers back to `enc:v1` while leaving multi-version read support deployed.
- No rollback may remove `enc:v2` read support once `enc:v2` rows exist.
- No rollback may remove legacy Deno `enc:v1` read support until `user_api_keys` and any Deno-written `provider_connections` rows are known to be rewritten or obsolete.

## Manifest

### Platform API

No external HTTP request or response contract changes are intended. This is an internal crypto-compatibility migration.

### Python Runtime Surface

- [crypto.py](/E:/writing-system/services/platform-api/app/infra/crypto.py)
- [connection.py](/E:/writing-system/services/platform-api/app/infra/connection.py)
- [model_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py)
- [pipeline_embeddings.py](/E:/writing-system/services/platform-api/app/services/pipeline_embeddings.py)

### Supabase Edge Function Surface

- [api_key_crypto.ts](/E:/writing-system/supabase/functions/_shared/api_key_crypto.ts)
- [provider-connections/index.ts](/E:/writing-system/supabase/functions/provider-connections/index.ts)
- [user-api-keys/index.ts](/E:/writing-system/supabase/functions/user-api-keys/index.ts)

### Observability

- Counter: `platform.crypto.decrypt.legacy_python_v1.count`
- Counter: `platform.crypto.decrypt.legacy_deno_v1.count`
- Counter: `platform.crypto.encrypt.v2.count`
- Structured log: `crypto.decrypt.version_path` with attributes limited to `cipher.version`, `kdf.variant`, and `result`

### Database

- No schema migration is required for the compatibility deploy.
- Optional later backfill is an operational data rewrite, not a prerequisite schema change.

## Locked File Inventory

### Modified backend files

- `services/platform-api/app/infra/crypto.py`
- `services/platform-api/app/infra/connection.py`
- `services/platform-api/app/domain/agchain/model_registry.py`
- `services/platform-api/app/services/pipeline_embeddings.py`

### Modified edge-function files

- `supabase/functions/_shared/api_key_crypto.ts`
- `supabase/functions/provider-connections/index.ts`
- `supabase/functions/user-api-keys/index.ts`

### New or modified test files

- `services/platform-api/tests/test_crypto.py` or equivalent existing crypto test module
- `services/platform-api/tests/test_connections.py`
- `services/platform-api/tests/test_agchain_models.py`
- `services/platform-api/tests/test_pipeline_worker.py` or equivalent credential-loading coverage
- `supabase/functions/provider-connections/index.test.ts`
- `supabase/functions/user-api-keys/index.test.ts`
- new or expanded Deno tests for `_shared/api_key_crypto.ts`

## Tasks

## Task 1: Freeze legacy vector coverage before changing crypto behavior

**Step 1:** Add explicit Python and Deno test vectors for:
- legacy Python `enc:v1`
- legacy Deno `enc:v1`
- shared `enc:v2`

**Step 2:** Lock the current contexts that matter to migration safety:
- `user-variables-v1`
- `provider-connections-v1`
- `user-api-keys-v1`

**Step 3:** Add failing tests that prove current mixed-runtime incompatibility where it still exists.

## Task 2: Implement version-aware compat decrypt in both runtimes

**Step 1:** Add `enc:v2` HKDF encrypt/decrypt helpers in Python and Deno.
**Step 2:** Add `enc:v1` compat decrypt that can read both legacy derivation variants.
**Step 3:** Keep the helper boundary shared and centralized; no per-caller bespoke crypto branches.

## Task 3: Converge all Python readers on the shared compat helper

**Step 1:** Route [model_registry.py](/E:/writing-system/services/platform-api/app/domain/agchain/model_registry.py) off its direct `decrypt_with_context(...)` path and onto the shared compat helper.
**Step 2:** Verify `connection.py` and `pipeline_embeddings.py` use the same version-aware helper semantics.
**Step 3:** Add targeted tests for each reader path against legacy Python, legacy Deno, and `enc:v2` fixtures.

## Task 4: Deploy read compatibility and telemetry before writer cutover

**Step 1:** Ship the compat readers first.
**Step 2:** Confirm the new telemetry distinguishes:
- legacy Python decrypt hits
- legacy Deno decrypt hits
- `enc:v2` encrypt activity

## Task 5: Switch all writers to `enc:v2` in one coordinated rollout

**Step 1:** Switch Python write helpers to `enc:v2`.
**Step 2:** Switch Deno write helpers to `enc:v2`.
**Step 3:** Verify freshly written rows from each runtime can be decrypted by the other runtime.

## Task 6: Decide whether to backfill legacy rows or keep permanent read compatibility

**Step 1:** Measure remaining `enc:v1` row usage by table and context.
**Step 2:** If backfill is required, run a dedicated operational rewrite that:
- reads with compat decrypt
- rewrites as `enc:v2`
- is restart-safe and idempotent

**Step 3:** If backfill is not required, explicitly accept permanent `enc:v1` read compatibility as ongoing support debt.

## Verification

- `cd E:\\writing-system\\services\\platform-api && pytest -q`
- `cd E:\\writing-system\\supabase && deno test functions/provider-connections/index.test.ts functions/user-api-keys/index.test.ts`
- Cross-runtime fixture verification proving:
  - Python can decrypt Deno-written legacy `enc:v1`
  - Deno can decrypt Python-written legacy `enc:v1`
  - both runtimes can decrypt `enc:v2`

## Completion Criteria

1. A dedicated migration plan exists for `C2` with explicit read compatibility, write compatibility, rollout, and rollback rules.
2. The plan does not reinterpret existing `enc:v1` ciphertext or mix the KDF migration into unrelated checklist hardening work.
3. The plan forces all Python and Deno readers to converge on a shared compatibility contract before any writer cutover.
4. The plan defines a reversible rollout in which `enc:v2` writers can be rolled back without losing the ability to read `enc:v2` rows already written.
