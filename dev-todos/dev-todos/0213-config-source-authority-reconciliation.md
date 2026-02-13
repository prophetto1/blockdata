# Config Source Authority Reconciliation

Date: 2026-02-13  
Status: Draft (required before further config implementation)

## 1) Why this exists

Configuration decisions are currently being pulled from mixed-era documents with conflicting assumptions. This creates regressions and false certainty when one short note is treated as final authority.

## 2) Evidence of conflict (direct excerpts)

1. Historical defaults in older implementation specs still show `max_tokens_per_block: 2000` and older temperature defaults:
   - `dev-todos/must-read-implementation-details/0209-unified-remaining-work.md:98`
   - `dev-todos/must-read-implementation-details/0209-unified-remaining-work.md:234`
   - `dev-todos/must-read-implementation-details/consolidated-02-ui-hardening-and-meta-config.md:623-625`
   - `dev-todos/must-read-implementation-details/meta-configurator-integration/spec.md:120-122`

2. Priority-3 lock doc explicitly froze baseline to `2000` during that phase:
   - `dev-todos/complete/0211-admin-config-registry.md:15`
   - `dev-todos/complete/0211-admin-config-registry.md:34`
   - `dev-todos/complete/0211-admin-config-registry.md:45`
   - `dev-todos/complete/0211-admin-config-registry.md:51`

3. Later decision log introduces a new precedence contract and states `2000` is fallback-only:
   - `dev-todos/config-decision-log.md:97-105`
   - Note: this entry is marked `Status: Proposed` at `dev-todos/config-decision-log.md:106`.

4. Runtime policy seed still persisted old baseline:
   - `supabase/migrations/20260212114500_018_admin_runtime_policy_controls.sql:60`

5. Worker precedence path is policy-driven at run creation, but hard fallbacks remain code-backed:
   - `supabase/functions/runs/index.ts:74-83`

## 3) Root cause

There is no enforced source-authority hierarchy for config decisions across:

- legacy/must-read implementation narrative docs,
- phase lock completion docs,
- active decision log entries (`Proposed` vs `Implemented`),
- and live code/migrations.

## 4) Required authority order (proposed)

For configuration behavior decisions, use this order only:

1. **Implemented canonical artifacts (highest):**
   - current migration state,
   - current edge/runtime code,
   - explicit completion docs with verification.
2. **Approved active decision entries (`Implemented` only):**
   - `dev-todos/config-decision-log.md` entries with `Status: Implemented`.
3. **Proposed entries / plans (non-authoritative for behavior):**
   - may guide next work, but cannot be treated as current truth.
4. **Historical must-read/consolidated docs (reference only):**
   - useful context, not default authority when conflicting with higher layers.

## 5) Immediate guardrail

Until this is ratified, no config default changes should be merged unless the change includes:

1. Authority citation block (at least one source from tier 1 and one from tier 2 if available).
2. Explicit precedence statement.
3. Migration + runtime + UI alignment proof.
4. Done-log entry and changelog line.

## 6) Open resolution required

1. Confirm final baseline for `models.platform_default_max_tokens`.
2. Confirm whether `CFG-004` is now `Implemented` or remains `Proposed`.
3. Backfill doc hygiene pass:
   - add "historical baseline" labels to old 0209/0210 implementation docs where values are no longer authoritative.
