# Platform AI Provider Management Assessment

**Plan source:** [2026-03-16-platform-ai-provider-management.md](E:\writing-system\docs\plans\2026-03-16-platform-ai-provider-management.md)  
**Date reviewed:** 2026-03-16  
**Reviewer:** Codex

## Verdict

**Conditional Pass**

The updated plan is directionally aligned with the current platform direction:

- it moves new admin/control-plane work into FastAPI
- it removes direct browser writes for admin-managed data
- it phases chat/runtime migration separately instead of pretending this plan completes cutover

However, it still has a few concrete implementation-contract issues that should be fixed before execution.

## Findings

### Major

1. The proposed `admin_runtime_policy` read uses the wrong schema contract.

The plan reads:

- `select("value")`
- `policy_row.data["value"]`

for `admin_runtime_policy` in the proposed `admin_ai_providers.py` route.

But the real table schema in [20260212114500_018_admin_runtime_policy_controls.sql](E:\writing-system\supabase\migrations\20260212114500_018_admin_runtime_policy_controls.sql) stores:

- `value_jsonb`
- `value_type`

There is no `value` column. As written, the route code would not work.

Required change:

- change the plan to use `value_jsonb`
- define the exact JSON shape expected for `secret_storage.encryption_key`
- confirm whether that policy key already exists or requires a migration/seed step

2. The plan introduces a new encryption-key policy without defining its lifecycle.

The plan now improves over the previous version by not reusing `SUPABASE_SERVICE_ROLE_KEY`, but it still assumes an internal secret at:

- `admin_runtime_policy.policy_key = "secret_storage.encryption_key"`

That is directionally better, but incomplete. The plan does not define:

- how the key is seeded
- who can rotate it
- whether rotation must preserve access to previously encrypted rows
- whether audit entries should be written for key changes

This is not a direction failure, but it is not execution-ready until the lifecycle is explicit.

3. Provider validation still places the Google API key in the query string.

The plan’s Google validation route builds:

- `https://generativelanguage.googleapis.com/v1beta/models?key={key}`

Even if the upstream API supports this, query-string secret transmission is not ideal because it is more likely to leak into request logs, traces, and error surfaces.

Required change:

- if Google’s API contract allows a header-based alternative, use it
- if not, call out the logging requirement explicitly and ensure server logs never include the full URL

### Minor

4. The plan uses RPC-style admin routes where cleaner resource-style routes would be more conventional.

Examples:

- `/admin/model-roles/toggle`
- `/admin/model-roles/delete`

This is not wrong, but the cleaner long-term pattern would usually be:

- `GET /admin/model-roles`
- `POST /admin/model-roles`
- `PATCH /admin/model-roles/{id}`
- `DELETE /admin/model-roles/{id}`

5. The validation route returns sanitized provider errors for some cases, but still falls back to raw exception text.

The plan returns:

- `str(e)[:200]`

in the generic exception path.

Better practice:

- log the detailed exception server-side
- return a generic client-safe error message

## Direction Check

This version is **not directionally inconsistent** with the broader direction established in current repo work.

What aligns well:

- FastAPI as the new backend/control-plane surface
- no new edge-function investment for new admin features
- admin-managed writes moved off direct browser Supabase access
- runtime migration deferred into a separate phase

What still needs tightening:

- the internal secret-storage contract
- the exact `admin_runtime_policy` data access shape
- key rotation and audit expectations

## Required Changes Before Implementation

1. Fix the `admin_runtime_policy` contract in the plan:
   - use `value_jsonb`, not `value`
   - define the expected JSON payload shape

2. Add a small migration or seed step for `secret_storage.encryption_key` if it does not already exist.

3. Define key lifecycle explicitly:
   - initial seed
   - rotation behavior
   - whether previous ciphertext remains decryptable after rotation

4. Replace raw exception echoing in the validation endpoint with server-side logging plus sanitized client error messages.

5. Revisit the Google validation path to avoid or tightly control query-string key exposure.

## Verification Expectations

Before calling this implementation complete, verify:

1. FastAPI can read the configured encryption key from `admin_runtime_policy` using the real schema.
2. A platform key can be saved, listed, and deleted via FastAPI only.
3. Model role toggles and deletes succeed through FastAPI and no longer depend on direct browser writes.
4. The superuser UI uses only `platformApiFetch` for these admin surfaces.
5. Existing Edge Functions remain unchanged and continue working during this phase.
6. The internal encryption-key source is auditable and not exposed to browser clients.

## Recommendation

**Go, after fixing the policy-schema mismatch and explicitly defining the secret-key lifecycle.**

This is a much better version than the earlier draft. The remaining issues are plan-hardening issues, not evidence that the direction is wrong.
