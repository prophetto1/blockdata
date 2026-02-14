# 2026-0213-1005-bootstrap-spec-enforcement-phase0-phase1

filename (UID): `2026-0213-1005-bootstrap-spec-enforcement-phase0-phase1.md`
problem: Spec enforcement Phase 0 and Phase 1 are defined but the required governance data model, compiler outputs, and local gates are not implemented as deterministic repo artifacts.
solution: Build the Phase 0+1 stack end to end by creating canonical governance files, backfilling RTM rows, implementing compiler and local validator scripts, and proving deterministic outputs with evidence.
scope: Spec enforcement bootstrap and deterministic local validation for Phase 0 and Phase 1 only.

## Included Implementation Rules

1. Every atomic item row must carry `item_id`, `type`, `source_doc`, `source_anchor`, one `primary_module_id`, `contract_type`, `work_set_id`, and `verification_required`.
2. Allowed contract types are `migration/table/index/rls/grant`, `edge_endpoint`, `rpc`, `route/nav`, `ui_control/state_machine`, `env_flag/rollout_gate`, and `test/evidence`.
3. Canonical governance inputs live under `spec-governance/` and are edited there only.
4. Compiler outputs are `spec-governance/out/items.json`, `spec-governance/out/rtm.json`, `spec-governance/out/report.md`, and `spec-governance/out/report.json`.
5. Generated human output `-personal-/master-spec/tbdv2.md` is compiler-generated only and must fail validation when manually edited.
6. Phase 0+1 exit metrics are `unmapped_atomic_items = 0`, `unassigned_primary_module = 0`, and `work_set_coverage = 100%`.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Create the Phase 0 governance input files `source-map.yaml`, `module-catalog.yaml`, and `rtm.yaml` under `spec-governance/`, and include schema-valid field skeletons aligned to Included Implementation Rules so the compiler and gates have deterministic inputs. | `spec-governance/source-map.yaml`, `spec-governance/module-catalog.yaml`, and `spec-governance/rtm.yaml` (repo state: all missing) |
| 2 | Backfill `rtm.yaml` with one row per atomic item from current canonical inventory (`D1..D8`) and populate source anchors, ownership, contract type, verification payload, and work-set assignment fields with no placeholder null rows. | Populated `spec-governance/rtm.yaml` with complete atomic-item rows (repo state: missing) |
| 3 | Implement `spec-governance/scripts/spec-compile.ps1` to load canonical YAML inputs and deterministically emit `items.json`, `rtm.json`, `report.md`, and `report.json`, then regenerate `-personal-/master-spec/tbdv2.md` from compiled data only. | `spec-governance/scripts/spec-compile.ps1`, `spec-governance/out/items.json`, `spec-governance/out/rtm.json`, `spec-governance/out/report.md`, `spec-governance/out/report.json`, and regenerated `-personal-/master-spec/tbdv2.md` (repo state: all missing) |
| 4 | Implement `spec-governance/scripts/spec-gate.ps1` with local deterministic checks for ContractGate, TraceGate, OwnershipGate, TypeGate, VerificationGate, CoverageGate, and GenerationGate; each failing check must return non-zero exit status and emit a failure reason in report output. | `spec-governance/scripts/spec-gate.ps1` plus failing/passing gate run output in `spec-governance/out/report.json` (repo state: missing) |
| 5 | Run the Phase 0+1 verification sequence (`spec-compile` then `spec-gate -Mode local`) on a clean working tree and publish a dated evidence note that records commands, gate results, and measured values for all three exit metrics. | `dev-todos/_complete/2026-0213-spec-enforcement-phase0-1-evidence.md` (repo state: missing) |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Canonical-input lock: all three governance YAML files exist and parse successfully.
2. RTM lock: `rtm.yaml` contains all atomic items with zero missing required fields.
3. Compiler lock: all required `spec-governance/out/*` files are generated deterministically from canonical inputs.
4. Generation lock: manual edits to generated `-personal-/master-spec/tbdv2.md` cause GenerationGate failure.
5. Local-gate lock: `spec-gate.ps1 -Mode local` passes with zero contract, trace, ownership, type, verification, and coverage violations.
6. Coverage lock: evidence confirms `unmapped_atomic_items = 0`, `unassigned_primary_module = 0`, and `work_set_coverage = 100%`.
7. Final-output lock: `dev-todos/_complete/2026-0213-spec-enforcement-phase0-1-evidence.md` exists and records the passing command outputs.
