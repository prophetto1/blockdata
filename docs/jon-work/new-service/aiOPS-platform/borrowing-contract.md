# Phase 4: Borrowing Assessment (Repo Analysis Contract)

Use this template when the user wants an implementation-ready borrowing decision — not just "is it compatible?"
but "what exactly do we lift, and how?"

Fill every field. If a field doesn't apply, write "N/A" with a one-line reason. Empty fields signal
incomplete analysis, not irrelevance.

---

## 4.0 — Metadata

- `repo_name`:
- `repo_path`:
- `analysis_date`:
- `analyst`:
- `analysis_request`:
- `platform_context`:
- `scope` (e.g., "registry, runtime, workbench for AGChain"):

## 4.1 — Decision Summary (30s)

The reader should be able to stop here and know the answer.

- `fit_decision`: **high-fit | partial-fit | low-fit**
- `thesis`: One-line statement of why this repo is relevant or irrelevant.
- `go_no_go`: One-line recommendation (approve, prototype, no-go).
- `confidence`: **High / Medium / Low**

## 4.2 — Borrowing Matrix

Every row requires exact file/function evidence. No hand-waving — if you can't point to a file, mark "Not found"
in the Evidence column. This is the single most important section; it's what the implementer acts on.

| Domain | Repo Evidence (exact file / function names) | Borrow Decision | Why | Integration Cost |
|---|---|---|---|---|
| Registry / Plugin mechanism |  | Lift / Adapt / Rework |  | 1-day / 3-day / 1-week+ |
| Provider resolution |  | Lift / Adapt / Rework |  |  |
| Model / workflow execution orchestration |  | Lift / Adapt / Rework |  |  |
| Tool / action execution |  | Lift / Adapt / Rework |  |  |
| Async messaging / event transport |  | Lift / Adapt / Rework |  |  |
| Persistence / history / journaling |  | Lift / Adapt / Rework |  |  |
| Auth / permission boundaries |  | Lift / Adapt / Rework |  |  |
| API lifecycle (CRUD + publish + validation + cancelation) |  | Lift / Adapt / Rework |  |  |
| UI workbench / admin patterns |  | Lift / Adapt / Rework |  |  |
| Observability / auditability |  | Lift / Adapt / Rework |  |  |

## 4.3 — Extractable Architecture Map

Concrete examples are included so analysts fill these consistently. Replace the italicized examples
with actual findings from the repo.

### 4.3.1 Registry Layer
- `definitions_to_extract`: _(e.g., RegistryArtifact interface, RegistryKind enum)_
- `extension_points`: _(e.g., custom RegistryKind plugin hook, schema validator override)_
- `state_inputs`: _(e.g., user-submitted YAML config, API POST body)_
- `state_outputs`: _(e.g., versioned artifact record in registry store)_
- `runtime_contracts`: _(e.g., "resolve(kind, slug, version) → artifact or throw NotFound")_

### 4.3.2 Runtime / Orchestration Layer
- `definitions_to_extract`: _(e.g., ExecutionPlan interface, StepRunner base class)_
- `extension_points`: _(e.g., custom step type handler, retry policy injection)_
- `state_inputs`: _(e.g., resolved plan + bound provider config)_
- `state_outputs`: _(e.g., execution journal with per-step status)_
- `runtime_contracts`: _(e.g., "execute(plan) → journal; idempotent on replay")_

### 4.3.3 Workbench / Command Surface
- `definitions_to_extract`: _(e.g., CommandDescriptor, MenuRegistration)_
- `extension_points`: _(e.g., custom panel registration, action bar plugin slot)_
- `state_inputs`: _(e.g., user selection context, active registry scope)_
- `state_outputs`: _(e.g., rendered view state, dispatched command payload)_
- `workbench_contracts`: _(e.g., "registerPanel(descriptor) → panel ID; must be idempotent")_

## 4.4 — Implementation Extract Checklist

Derived from §4.3. This is the flat, greppable list an implementer uses to pull artifacts out of the repo.
Each item traces back to a specific §4.3 layer.

| Extract | Source Layer | File(s) | Notes |
|---|---|---|---|
| Interfaces and contracts |  |  |  |
| Runtime paths |  |  |  |
| Registry contracts |  |  |  |
| State model |  |  |  |
| Configuration model |  |  |  |
| Error patterns |  |  |  |
| Security boundaries |  |  |  |
| Observability hooks |  |  |  |
| Schema validation points |  |  |  |
| Idempotency / concurrency controls |  |  |  |

## 4.5 — Evidence Inventory

- `top_5_files`:
  1.
  2.
  3.
  4.
  5.
- `high_confidence_sources`:
  - tests:
  - docs:
  - comments/notes:
- `confidence`:
  - Registry: High / Medium / Low
  - Runtime: High / Medium / Low
  - Workbench: High / Medium / Low
- `evidence_gaps`:

## 4.6 — Risks and Mismatch

- `assumptions_to_validate`:
  1.
  2.
  3.
- `platform_mismatch`:
  1.
  2.
  3.
- `license_compatibility`:
  - Source license:
  - Target license:
  - Conflict: **yes / no / needs-legal-review**
- `fit_breakers`:
- `non_starters`:

## 4.7 — Product-Fit Assignment

- `goes_to_registry_plane`:
- `goes_to_runtime_plane`:
- `goes_to_workbench_plane`:
- `do_not_adapt`:

## 4.8 — Roadmap (Smallest Useful Sequence)

- `first_cut_backlog`:
  1.
  2.
- `first_cut_gate`: _(integration test or acceptance criteria that must pass before next_wave begins)_
- `next_wave`:
  1.
  2.
  3.
- `phase_outs`:

## 4.9 — Hard Invariants (must enforce)

-
-
-

## 4.10 — Security and Authorization Matrix

- `read_permissions`:
- `write_permissions`:
- `publish_permissions`:
- `run_permissions`:
- `cancel_permissions`:
- `audit_visibility_requirements`:

## 4.11 — Recommendation

- **If approved**:
- **If not approved**:
  - blocker(s):
  - required follow-up:

## 4.12 — Optional Contract Appendix (AGChain-only)

> Omit this section for non-AGChain target platforms.

```ts
export type RegistryKind =
  | "provider"
  | "model"
  | "prompt"
  | "skill"
  | "plan"
  | "connector"
  | "workflow-template";

export type RegistryStatus = "draft" | "published" | "archived";

export interface RegistryIdentity {
  registry_id: string;
  kind: RegistryKind;
  slug: string;
  display_name: string;
  version: number;
  status: RegistryStatus;
  schema_version: string;
  tags: string[];
  owner_type: "system" | "user";
  created_by: string;
  created_at: string;
  updated_at: string;
  checksum_sha256: string;
}

export interface RegistryArtifact<TPayload, TMeta = Record<string, unknown>> {
  identity: RegistryIdentity;
  payload: TPayload;
  meta: TMeta;
  parent_version_id?: string;
  approval_required: boolean;
  immutable: true;
}
```
