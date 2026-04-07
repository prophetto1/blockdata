# Repo Analysis Output Contract v1
> Purpose: Convert any repository study into a single, implementation-ready one-pager.
>
> Scope: Use this for future architecture reviews and borrowing decisions across AGChain-adjacent or comparable repos.

## 0) Metadata
- `repo_name`:
- `repo_path`:
- `analysis_date`:
- `analyst`:
- `analysis_request`:
- `platform_context`:
- `scope` (e.g., "registry, runtime, workbench for AGChain"):

## 1) Decision Summary (30s)
- `fit_decision`: **high-fit | partial-fit | low-fit**
- `thesis`:  
  One-line statement of why this repo is relevant or irrelevant.
- `go_no_go`:  
  One-line recommendation (approve, prototype, no-go).
- `confidence`: **High / Medium / Low**

## 2) Borrowing Matrix (Required)
| Domain | Repo Evidence (exact file / function names) | Borrow Decision | Why | Integration Cost |
|---|---|---|---|---|
| Registry / Plugin mechanism |  | Lift / Adapt / Rework |  | 1-day / 3-day / 1-week+ |
| Provider resolution |  | Lift / Adapt / Rework |  |  |
| Model / workflow execution orchestration |  | Lift / Adapt / Rework |  |  |
| Tool / action execution |  | Lift / Adapt / Rework |  |  |
| Async messaging / event transport |  | Lift / Adapt / Rework |  |  |
| Persistence / history / journaling |  | Lift / Adapt / Rework |  |  |
| Auth / permission boundaries |  | Lift / Adapt / Rework |  |  |
| API lifecycle (CRUD + publish lifecycle + validation + cancelation) |  | Lift / Adapt / Rework |  |  |
| UI workbench / admin patterns |  | Lift / Adapt / Rework |  |  |
| Observability / auditability |  | Lift / Adapt / Rework |  |  |

## 3) Extractable Architecture Map

### 3.1 Registry Layer
- `definitions_to_extract`:
- `extension_points`:
- `state_inputs`:
- `state_outputs`:
- `runtime_contracts`:

### 3.2 Runtime / Orchestration Layer
- `definitions_to_extract`:
- `extension_points`:
- `state_inputs`:
- `state_outputs`:
- `runtime_contracts`:

### 3.3 Workbench / Command Surface
- `definitions_to_extract`:
- `extension_points`:
- `state_inputs`:
- `state_outputs`:
- `workbench_contracts`:

## 4) Extract List (Implementation Artifacts)
- `interfaces_and_contracts`:
- `runtime_paths`:
- `registry_contracts`:
- `state_model`:
- `configuration_model`:
- `error_patterns`:
- `security_boundaries`:
- `observability`:
- `schema_validation_points`:
- `idempotency_and_concurrency_controls`:

## 5) Evidence Inventory
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
  - 

## 6) Risks and Mismatch
- `assumptions_to_validate`:
  1. 
  2. 
  3. 
- `platform_mismatch`:
  1. 
  2. 
  3. 
- `fit_breakers`:
  - 
- `non_starters`:
  - 
  - 

## 7) Product-Fit Assignment
- `goes_to_registry_plane`:
- `goes_to_runtime_plane`:
- `goes_to_workbench_plane`:
- `do_not_adapt`:
  - 
  - 

## 8) Roadmap (Smallest Useful Sequence)
- `first_cut_backlog`:
  1. 
  2. 
- `next_wave`:
  1. 
  2. 
  3. 
- `phase_outs`:
  - 

## 9) Hard Invariants (must enforce)
- 
- 
- 

## 10) Security and Authorization Matrix
- `read_permissions`:
- `write_permissions`:
- `publish_permissions`:
- `run_permissions`:
- `cancel_permissions`:
- `audit_visibility_requirements`:

## 11) Recommendation
- **If approved**:
- **If not approved**:
  - blocker(s):
  - required follow-up:

## 12) Optional Contract Appendix (for AGChain-adjacent analyses)

Use this section to capture the canonical contracts if the repo is a candidate fit:

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
