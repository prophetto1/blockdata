# Spec Enforcement System Plan
Date: 2026-02-13  
Status: Proposed  
Audience: Maintainers, reviewers, and external assessors evaluating concern separation and spec reliability

## 1) Purpose

Define a deterministic enforcement system that ensures spec outputs:

- stay grounded in source authority (no unsourced requirements),
- decompose into atomic `Action | Decision | Policy` items,
- map to architecture ownership (`module/component/container`),
- produce implementation-viable work sets with explicit verification.

This plan is executable and resolves mechanism choices, artifact formats, and closure rules.

## 2) Scope

In scope:

- Spec authoring and reconciliation workflow for `Action | Decision | Policy`.
- Mapping every atomic item to architecture/module ownership.
- Merge-blocking checks when enforcement requirements are not met.

Out of scope:

- Product feature behavior changes outside governance/tooling.
- Runtime dependency on spec-tracker data.

## 3) Canonical Terms

- Atomic item: one `Action`, `Decision`, or `Policy` entry with unique ID.
- Source authority: upstream docs/implementation artifacts that justify an atomic item.
- Module Catalog: machine-checkable list of modules/components tied to repo paths and contracts.
- RTM: Requirements Traceability Matrix; one row per atomic item.
- Work Set: implementation-viable group generated from RTM mappings.

## 4) Non-Negotiable Invariants

### 4.1 Source Traceability

Every atomic item MUST include:

- `source_doc` (`D#`),
- `source_anchor` (section and/or line),
- optional `source_quote_hash`.

Canonical specs disallow unsourced items. `INFERENCE` is disallowed.

### 4.2 Ownership

Every atomic item MUST include:

- exactly one `primary_module_id`,
- optional `secondary_module_ids`.

### 4.3 Contract Type

Every atomic item MUST declare one contract type:

- `migration/table/index/rls/grant`
- `edge_endpoint`
- `rpc`
- `route/nav`
- `ui_control/state_machine`
- `env_flag/rollout_gate`
- `test/evidence`

### 4.4 Verification Payload

Every atomic item MUST include verification payload suitable to contract type:

- status codes and error matrix for endpoints/RPCs,
- DDL/constraints and access posture for DB contracts,
- algorithm steps and examples for derivation/hashing logic,
- UI control states and gating rules for UI contracts,
- test body and deterministic smoke sequence for verification contracts.

Items without verification payload cannot progress beyond `Implemented`.

### 4.5 Completeness

- Unmapped atomic items = `0`
- Unassigned primary module = `0`
- Unassigned work set = `0`
- Work set coverage = `100%`

## 5) Canonical Artifacts and Paths

All governance artifacts live under `spec-governance/`.

1. `spec-governance/source-map.yaml`
- `doc_key`, `path`, optional `sha256`, optional `expected_line_count`.

2. `spec-governance/module-catalog.yaml`
- `module_id`, `container`, `owned_paths`, `public_interfaces`, `responsibility`, `owner_role`.

3. `spec-governance/rtm.yaml`
- one row per atomic item with:
  - `item_id`, `type`, `summary`
  - `source_doc`, `source_anchor`
  - `primary_module_id`, `secondary_module_ids`
  - `contract_type`, `concern_class`, `work_set_id`
  - `verification_required`, `closure_evidence`

4. Compiler outputs
- `spec-governance/out/items.json`
- `spec-governance/out/rtm.json`
- `spec-governance/out/report.md`
- `spec-governance/out/report.json`

5. Generated human docs
- `-personal-/master-spec/tbdv2.md` is generated output only.

## 6) Enforcement Stack (Selected)

The repo adopts this combined mechanism:

1. Local fast gate (advisory)
- `core.hooksPath=.githooks`
- pre-commit and pre-push run fast deterministic checks.

2. CI hard gate (mandatory)
- Required status check `spec-gate` runs full compile + validation and fails on violations.

3. Platform merge controls
- Branch protection/rulesets require `spec-gate` success.
- CODEOWNERS required for governance paths.

4. Compiler-only output path
- Canonical data edited in `spec-governance/*`.
- `tbdv2.md` regenerated from compiler output.
- Direct manual edits to generated output are blocked by gate.

## 7) Validation Gates (Required)

1. `ContractGate`
- Canonical files present and structurally valid.

2. `TraceGate`
- Every item has `D#` + anchor.
- Anchors resolve in mapped source file.

3. `OwnershipGate`
- Exactly one primary module; module exists in module catalog.

4. `TypeGate`
- Contract type value is in allowed enum.

5. `VerificationGate`
- Required verification fields exist by contract type.

6. `CoverageGate`
- Every item assigned to work set; no empty work sets; 100% coverage.

7. `GenerationGate`
- Generated outputs are up to date (`tbdv2.md` matches compiler output).

8. `DriftGate` (Phase 2 required)
- Source changes that affect anchors require revalidation.

## 8) Work Set Rules (Coding-Viable)

Work set key:

- `primary_module_id + contract_type + concern_class`

Every work set MUST satisfy:

- one shippable objective,
- bounded change surface (prefer <= 3 modules),
- explicit verification path,
- rollout/rollback note for runtime-gated changes.

Failing sets must be split before execution.

## 9) Closure Rules

State model:

- `Draft -> Ready -> In Progress -> Implemented -> Verified -> Accepted -> Closed`

Transition requirements:

1. `Implemented`
- requires `implementation_refs`.

2. `Verified`
- requires `verification_refs` with deterministic evidence artifact.

3. `Accepted`
- requires `review_signoff` from primary module owner role.

4. `Closed`
- requires all gate checks pass and no open dependency blockers.

## 10) Execution Plan

### Phase 0 (Bootstrap, mandatory)

Deliverables:

1. Create `spec-governance/` directory structure.
2. Add `source-map.yaml`, `module-catalog.yaml`, `rtm.yaml`.
3. Backfill RTM for current canonical inventory (`D1..D8` atomic items).

Exit criteria:

- `rtm.yaml` contains all atomic items from current canonical extraction.
- `CoverageGate` reports `100%`.

### Phase 1 (Compiler + Validators)

Deliverables:

1. Add gate runner script: `spec-governance/scripts/spec-gate.ps1`.
2. Add compiler script: `spec-governance/scripts/spec-compile.ps1`.
3. Produce deterministic outputs in `spec-governance/out/`.
4. Add generation of `-personal-/master-spec/tbdv2.md` from canonical RTM.

Exit criteria:

- `spec-gate.ps1 -Mode local` passes on clean repo.
- `GenerationGate` fails if `tbdv2.md` is edited manually.

### Phase 2 (Repo Enforcement)

Deliverables:

1. Add `.githooks/pre-commit` and `.githooks/pre-push`.
2. Add CI workflow `.github/workflows/spec-gate.yml`.
3. Add `.github/CODEOWNERS` coverage for `spec-governance/**` and `-personal-/master-spec/**`.
4. Add PR template requiring gate report summary.

Exit criteria:

- Pull requests cannot merge unless `spec-gate` passes.
- Governance file changes require CODEOWNERS approval.

### Phase 3 (Hardening)

Deliverables:

1. Implement `DriftGate`.
2. Add strict verification minima for high-risk contracts (`edge_endpoint`, `rpc`, `migration/...`).
3. Store CI compliance artifacts per run (`report.json`, `report.md`).

Exit criteria:

- Anchor drift is detected and blocks merge.
- No item can be `Verified` without contract-appropriate evidence.

## 11) Operating Policies

1. Canonical edits happen only in `spec-governance/*`.
2. Generated files are treated as build artifacts.
3. Source anchor quality is mandatory; unresolved anchors block merges.
4. Work set generation is deterministic from RTM fields; no ad-hoc manual grouping in release flow.
5. Enforcement data must be isolated from product runtime dependencies.

## 12) Decision Record (Resolved)

1. Enforcement mechanism: Option `A + C + D` now, Option `B` later if needed.
2. Canonical RTM format: YAML (`rtm.yaml`) with deterministic compiled outputs.
3. `INFERENCE` policy: disallowed in canonical spec.
4. Verification minimums: contract-type specific and merge-blocking.
5. Artifact storage: versioned outputs in repo plus CI run artifacts.

## 13) Immediate Next Actions

1. Create `spec-governance/source-map.yaml` from current `D1..D8` paths.
2. Create initial `spec-governance/module-catalog.yaml` for `web|edge|db|service|docs`.
3. Backfill `spec-governance/rtm.yaml` using current canonical `tbdv2` item IDs.
4. Add `spec-governance/scripts/spec-gate.ps1` with `ContractGate..CoverageGate`.
5. Add `spec-governance/scripts/spec-compile.ps1` to generate `tbdv2.md`.
6. Add `.github/workflows/spec-gate.yml` and protect merge on this check.

## Appendix A: Module Catalog Template

```yaml
modules:
  - module_id: M01
    container: web
    owned_paths:
      - web/src/router.tsx
      - web/src/components/shell/**
    public_interfaces:
      - route:/app/*
    responsibility: App shell, routing, and navigation
    owner_role: frontend
```

## Appendix B: RTM Row Template

```yaml
- item_id: D8-A04
  type: action
  summary: Implement schema_ref derivation when not provided
  source_doc: D8
  source_anchor: "10.4"
  primary_module_id: M05
  secondary_module_ids: [M02]
  contract_type: edge_endpoint
  concern_class: API
  work_set_id: G-API-SCHEMAS-001
  verification_required:
    - status_codes: [200, 400, 405, 409]
    - algorithm_steps:
        - "$id tail -> title -> 'schema'"
        - "slugify rules: lowercase, invalid chars to _, trim, collapse, truncate 64"
  closure_evidence:
    - code_ref: supabase/functions/schemas/index.ts
    - test_ref: supabase/functions/schemas/index.test.ts
```

## Appendix C: Isolation From Product Runtime

If enforcement data is stored, it must remain isolated from product runtime:

- repo-only artifacts and CI artifacts are preferred,
- any database storage must remain in an isolated spec-tracking boundary,
- no triggers/functions affecting product tables,
- no runtime code path dependency on spec-tracker data.
