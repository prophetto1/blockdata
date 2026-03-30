# Plan Evaluation: AG chain Models Surface Implementation Plan

**Plan reviewed:** `docs/plans/__complete/2026-03-26-agchain-models-surface-implementation-plan.md`
**Evaluation date:** 2026-03-27
**Evaluator context:** Full read of the plan, the InspectAI reference analysis, the platform requirements doc, the existing on-disk migration, the existing `AgchainModelsPage` placeholder, `platform-api` auth/route/OTel patterns, the router and shell layout, and all seam directories listed in the evaluation request.

**Summary:** The plan proposes a global AG chain model-target registry backed by a new Supabase migration, six new `platform-api` endpoints, a code-owned provider catalog, comprehensive OTel instrumentation, and a table/toolbar/inspector frontend surface at `/app/agchain/models`.

---

## Structural Verdict: Structurally Complete With Gaps

All required sections are present. The plan is well above average in specificity — locked contracts, frozen seam boundaries, inventory counts, file inventory, explicit risks, and a clear scope fence are all present and internally consistent. Four structural gaps prevent a clean "Structurally Complete" verdict.

### Structural Gaps

1. **PATCH mutable vs. immutable fields not enumerated.** The PATCH contract says "any mutable subset of the POST contract except immutable identity fields" but never lists which fields are immutable. The implementer must guess whether `provider_slug`, `qualified_model`, `model_name`, or `provider_qualifier` are identity-locked. This should be a short explicit list.

2. **Column-level authenticated SELECT grants not declared in the locked migration contract.** The existing on-disk migration correctly uses column-level `GRANT SELECT (...)` to exclude `credential_source_jsonb` from the authenticated role. The plan's locked migration contract says only "grants authenticated SELECT only" without specifying column-level restrictions. Since `credential_source_jsonb` can hold sensitive credential metadata, this omission matters — an implementer following the plan text alone could grant full-row SELECT.

3. **`qualified_model` derivation rule unspecified.** The plan stores both `model_name` and `qualified_model` as independent NOT NULL text columns. It never states whether `qualified_model` is computed from `provider_slug + "/" + model_name`, freely provided by the operator, or validated against a pattern. Two independent free-text fields for overlapping identity invite divergence. The plan should declare the derivation rule or validation.

4. **NULL-safe uniqueness constraint not specified.** The plan declares "identity uniqueness across `provider_slug`, optional qualifier, `qualified_model`, and optional `api_base`." In Postgres, a standard `UNIQUE(a, b, c, d)` constraint treats NULLs as distinct — two rows with `(openai, NULL, gpt-4o, NULL)` would not collide. The constraint syntax must use `NULLS NOT DISTINCT` (Postgres 15+), a `COALESCE`-based unique index, or a partial unique index. The plan should specify which.

---

## Quality Findings

### Critical

None.

### Significant

**S1 — Migration file already exists on disk and diverges from the plan.**
The file `supabase/migrations/20260326170000_agchain_model_targets.sql` already exists in the working tree. Its schema uses a flat `provider TEXT` column, a `transport_kind` enum, no `provider_slug`/`provider_qualifier`/`model_name`/`model_args_jsonb`/`probe_strategy` columns, and a simpler `UNIQUE (provider, qualified_model)` constraint. Task 1 says "rewrite the migration" and the InspectAI reference analysis documents exactly why this rewrite is needed. However:

- The locked file inventory lists this migration under "New files." It is not new — it is an existing file being rewritten. The inventory should say "Modified" or "Rewritten."
- The health checks table on disk is also missing `provider_slug` and `probe_strategy` columns that the plan requires.

This is not architecturally wrong — the plan's provider-slug model is the correct direction per the InspectAI analysis. But the inventory classification is inaccurate and the implementer should know they are overwriting an existing file, not creating one.

**S2 — No pagination on the list endpoint.**
`GET /agchain/models` returns `items: []` with no `offset`, `limit`, `cursor`, or `total` mechanism. The provider catalog endpoint similarly returns a flat list. For a level-1 surface with a handful of model targets this works, but the pattern should be established now rather than retrofitted. Every other list-style endpoint in `platform-api` that could grow should declare whether it paginates or explicitly state it does not need to (with a reasoning bound like "expected cardinality < 100").

**S3 — No DELETE endpoint and no explicit justification.**
The plan declares six endpoints but omits `DELETE /agchain/models/{model_target_id}`. The migration grants `DELETE` to `service_role` and the health checks table uses `ON DELETE CASCADE`. The plan presumably intends operators to disable targets via the `enabled` field rather than delete them. This is a defensible choice, but it should be stated explicitly. Without it, an implementer may add delete, and a reviewer may flag its absence — both wasting time because the plan is silent.

**S4 — `credential_status` derivation logic is underspecified.**
The list endpoint response includes `credential_status` described as "derived from read-only joins/lookups into `public.user_api_keys`, `public.user_provider_connections`." The plan never specifies:
- What `credential_status` values are valid (enum? free text?)
- What constitutes "ready" vs. "missing" vs. "expired" for a given provider
- Whether credential readiness is per-user or global (the model registry is global, but API keys are user-scoped — whose keys determine readiness?)

This is the most architecturally ambiguous point in the plan. A global model registry reporting per-user credential readiness creates a conceptual mismatch. The plan should specify whose credential state is reported (the requesting user's? the superuser's? any user's?) and what values `credential_status` can take.

### Minor

**M1 — `api_base_display` masking rule not specified.**
The list endpoint returns `api_base_display` and the observability rules forbid "full `api_base`" in trace attributes. The plan should state the truncation or masking rule applied to produce `api_base_display` (e.g., scheme + host only, last N characters redacted, etc.).

**M2 — Frontend test commands omit `web/` working directory.**
Task 4 and Task 5 specify `npm test -- src/pages/agchain/AgchainModelsPage.test.tsx` without noting the command must run from the `web/` directory. The backend test commands correctly reference the full path from project root. Both should follow the same convention.

**M3 — Task 1 migration reference filenames use shorthand.**
Task 1 says "check naming and policy style against... `022_provider_connections.sql` and `014_user_api_keys.sql`." The actual filenames are `20260213181000_022_provider_connections.sql` and `20260210191613_014_user_api_keys.sql`. This is unambiguous in context but the full filenames are more robust.

**M4 — No `updated_at` trigger declared.**
The `agchain_model_targets` table has `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` but the plan does not declare a trigger or application-level mechanism to update this column on PATCH. Other tables in the project may or may not use triggers for this — the plan should state who owns the update (trigger vs. application code in the PATCH handler).

### Observations

**O1 — Scope boundaries are exceptionally clear.** The frozen global models contract, the explicit exclusions list, and the locked product decisions form a strong scope fence. This is one of the plan's strongest qualities. The explicit statement that runtime-policy comparison "is first-class for the platform, but it belongs to later benchmark, runner, and results plans" prevents the most likely scope creep vector.

**O2 — The code-owned provider catalog is the right call for this phase.** Storing provider definitions in code rather than a database table avoids premature admin/catalog complexity. The plan correctly acknowledges this as an accepted risk (Risk 3) and frames it as a phase decision, not a permanent one.

**O3 — InspectAI alignment is well-calibrated.** The plan adopts InspectAI's provider-identity model (`provider_slug` + qualifier) without over-adopting its pass-through args pattern. Storing `model_args_jsonb` explicitly rather than relying on runtime kwargs is the right choice for a persisted registry. The plan also correctly avoids pulling InspectAI's sandbox, solver, or scorer patterns into this scope.

**O4 — Observability is a strength.** Seven trace spans, seven metrics (5 counters + 2 histograms), four structured logs, and explicit allowed/forbidden attribute lists is thorough and proportionate for a CRUD+probe surface. The provider-probe-specific span (`agchain.models.provider_probe`) with outcome classification is a good pattern that will pay off when health debugging matters.

**O5 — Auth boundary is appropriate despite platform requirements nuance.** The platform requirements doc states AG chain "should not require a special superuser-only guard as part of its product definition." The plan uses `require_superuser` for writes and `require_user_auth` for reads. This is correct for a global model registry — any authenticated user can see available models, but only admins can register or modify them. The distinction between "AG chain as a product doesn't require superuser access" and "a global configuration surface within AG chain uses superuser for writes" is sound.

---

## Approval Recommendation: Approve With Notes

The plan is structurally complete with minor gaps and architecturally sound. No critical findings. The four significant findings should be addressed before handing to an implementer:

1. **S1**: Reclassify the migration file from "New" to "Rewritten" in the file inventory.
2. **S2**: Either add `offset`/`limit` params to the list endpoint or add a locked decision stating pagination is intentionally deferred with a cardinality bound.
3. **S3**: Add an explicit statement that DELETE is intentionally excluded (disable via `enabled` instead) or add the DELETE endpoint.
4. **S4**: Specify `credential_status` enum values and whose credential state is reported for a global registry entry.

The four structural gaps (PATCH immutable fields, column-level grants, `qualified_model` derivation, NULL-safe uniqueness) should also be resolved with one-line additions to the relevant sections.

**Overall impression:** This is a well-constructed plan that correctly navigates the hardest design tension — keeping the global model registry separate from benchmark-local concerns while establishing the provider-catalog seam that later plans will depend on. The InspectAI-informed provider identity model is the right foundation. The plan is ready for implementation after the noted revisions, none of which require rethinking the architecture.
