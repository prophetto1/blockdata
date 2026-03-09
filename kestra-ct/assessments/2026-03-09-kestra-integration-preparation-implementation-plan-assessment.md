# Kestra Integration Preparation Plan Assessment

## Plan Metadata

- Source path: `kestra-ct/plans/2026-03-09-kestra-integration-preparation-implementation-plan.md`
- Date reviewed: `2026-03-09`
- Reviewer: `Codex`

## Verdict

`Conditional Pass`

## Findings

### Critical

1. The plan carries the wrong identity model into the Kestra effort.
   The alignment directive says `namespace` is an alias of `project_id`, but the live `kt` schema is Kestra-native and does not have `project_id` columns on `kt.flows`, `kt.executions`, `kt.logs`, `kt.triggers`, or related tables. Those tables expose `namespace`, `flow_id`, and `tenant_id` as generated columns from the stored JSONB document. If workers follow the current directive, they will build the adapter around a Blockdata flow model instead of the `kt.*` schema that actually backs this effort.

2. The plan does not define the HTTP compatibility surface that lets `web-kt` talk to Supabase.
   `web-kt` resolves API calls to `/api/v1/main` through `web-kt/src/override/utils/route.ts`, and its flow store already calls `/flows/search` and `/flows/{namespace}/{id}` under that base. Supabase edge functions live at `/functions/v1/...`. The plan says “adapter layer in Supabase edge functions” but never decides whether the project will use a proxy, rewrite layer, dedicated backend gateway, or a frontend base-path override. Without that decision, workers can generate types and packet docs but still have no agreed runtime path for the first page.

### Major

1. Repo-to-live migration drift is real, but the plan understates how early it must be handled.
   The live project already has the `kt` schema and live migration history includes `add_kt_kestra_schema`, while the local repo still stops at `20260308150000_072_registry_superuser_profiles.sql`. The plan records that drift, but it postpones reconciliation until after baseline capture. That is too late for type generation. If `database.types.ts` is generated from live state before the repo has a matching migration artifact, workers will code against a schema the repo cannot reproduce.

2. The plan does not yet decompose preparatory work into worker-safe ownership slices.
   The context requirement says the work should be broken into smaller parts for separate workers. The plan enumerates eight tasks, but it does not say which tasks may run in parallel, which write scopes are exclusive, or which tasks are blocked on earlier tasks. That leaves too much room for workers to create overlapping edits in `kestra-ct/`, `_shared/`, and generated artifacts.

3. The runtime baseline step needs one more explicit check: `web-kt` is Kestra OSS UI, not a thin page library.
   The copied UI has global router, tenant, auth, plugin, and Axios assumptions. The plan mentions “auth/runtime assumptions” at a high level, but it should explicitly require tracing the route base, Axios base-path behavior, and the minimum config payloads needed to boot the first page. Otherwise the first worker may discover basic boot blockers after the prep phase is already marked complete.

### Minor

1. Task 4 should define the backend OpenAPI generation tool now, not later.
   The plan says to generate contract types from `openapi.yml`, but it does not lock the generator or output shape. That is minor because the direction is clear, but fixing the tool choice early will prevent different workers from producing incompatible outputs.

2. The plan should state whether the first generated database type file is `kt` only or `public,kt`.
   The current text says start with `--schema kt` and expand only if needed. That is acceptable, but it should be an explicit decision in the plan, not a deferred guess during execution.

## Specific Gaps, Contradictions, And Ambiguity

- The plan says compatibility work is backed by `kt.*`, but it also imports a Blockdata-specific `namespace = project_id` rule that does not exist in the `kt` schema.
- The plan names the adapter storage layer and the frontend contract source, but not the transport path between them.
- The plan correctly records live-vs-repo drift, but it does not add a mandatory reconciliation task ahead of type generation.
- The plan expects controlled worker execution, but it does not define disjoint write ownership for preparatory tasks.

## Required Changes Before Implementation

1. Remove the `namespace = project_id` directive from this plan, or replace it with a Kestra-specific identity rule grounded in `kt.*`.
2. Add a new early task that reconciles repo migration history with the live `kt` schema before any type generation runs.
3. Add an explicit API-surface decision:
   choose the proxy/rewrite/gateway strategy that will expose `web-kt` to a Kestra-style `/api/v1/main/...` backend.
4. Split the preparatory tasks into worker-safe ownership units and document which tasks may run in parallel.
5. Expand the `web-kt` runtime baseline task to trace base URL resolution, auth/config dependencies, and first-page boot prerequisites.
6. Lock the OpenAPI generation tool and the initial database schema scope in the plan.

## Verification Expectations

- Confirm live Supabase `kt.*` tables and migration history against the repo before generating any shared types.
- Verify `web-kt` still has generated Kestra client files and a stable boot command.
- Verify the chosen backend contract generation command produces stable output in a committed location.
- Verify the chosen HTTP compatibility path can serve at least the `Flows list` route shape expected by `web-kt`.
- Verify the control-tower files created during preparation are discoverable from `kestra-ct/` without relying on chat history.

## Acceptance Criteria Check

- Alignment with product direction and constraints: `Partial`
- Clear scope boundaries: `Pass`
- API/data contract clarity: `Fail`
- Dependency and sequencing correctness: `Partial`
- Risk handling and rollback strategy: `Partial`
- Security/auth implications: `Partial`
- Operational readiness: `Partial`
- Test/verification clarity: `Partial`

## Final Recommendation

`No-Go` until the three blocking issues are fixed: identity-model contamination, missing HTTP compatibility decision, and missing migration-reconciliation task ahead of type generation.

After those corrections, the plan is viable and should return for a short re-review before preparatory execution starts.
