# Runtime And Environment Contract Inventory

**Goal:** Define one flat, implementation-driving inventory of every active, defined, or planned runtime/environment item justified by the Legal-10 essential docs, without forcing a higher-level taxonomy first.

**Architecture:** Preserve the current build-time sealed bundle model and the current runtime staged-execution model. AGChain owns benchmark semantics, payload admission, carry-forward, structured message assembly, and canonical audit/provenance. InspectAI is treated as an execution substrate to wrap where compatible, especially for model/task/sandbox/tool infrastructure.

**Tech Stack:** Markdown, Legal-10 essential docs, supporting runtime docs, local `inspect_ai` clone, current 3-step runtime implementation, build-time bundle/sealing model.

**Status:** Draft
**Author:** Codex
**Date:** 2026-03-27

> **Authority:** This is the primary runtime/environment contract. See `2026-03-27-environment-and-runtime-profile-contract.md` for the secondary schema/modeling companion. See `2026-03-27-inspect-ai-substrate-gap-analysis.md` for the InspectAI comparison analysis.

## Manifest

### Platform API

No platform API changes are defined by this contract document.

This inventory is intentionally limited to the runtime/environment surface implied by the benchmark docs. It does not declare any new HTTP endpoints, request/response contracts, auth surfaces, or platform control-plane APIs.

### Observability

No new OpenTelemetry traces, metrics, or structured logs are introduced by this contract document.

This inventory does lock the benchmark-native audit/provenance artifacts that already belong to the runtime surface:

- `audit_log.jsonl`
- `run.jsonl`
- `run_manifest.json`
- `summary.json`
- `trace.jsonl`
- `candidate_state.json`

### Database Migrations

No database migrations are defined by this contract document.

The essential docs define build-time file/package contracts and runtime file/artifact contracts, not new relational schema changes.

### Edge Functions

No edge functions are created or modified by this contract document.

### Frontend Surface Area

No frontend changes are defined by this contract document.

This inventory is runtime/build oriented only.

### Developer Env Ownership

Developer-owned local environment configuration is repo-root only. `E:\writing-system\.env` is the single local env surface, and [`.env.example`](/e:/writing-system/.env.example) is the committed inventory of required keys.

`_agchain` is treated as a docs/research subtree, not an independently booted runtime. It does not maintain its own local `.env`. If `_agchain` later gains an executable runtime with its own cwd-resolved env loading, that runtime must introduce an intentional `_agchain/.env.example` contract rather than an ad hoc private `.env`.

## Pre-Implementation Contract

No major runtime, statefulness, payload-admission, sandbox, audit, or ownership decision may be improvised during later implementation. If implementation needs an item not declared here, the contract must be revised first.

## Locked Product Decisions

1. The contract should stay flat. It should inventory the runtime/environment surface directly instead of forcing an abstract split that the source docs do not consistently use.
2. AGChain owns benchmark semantics. InspectAI does not replace AGChain’s chain semantics, payload admission, structured windows, or canonical audit proof.
3. Build-time and run-time are both part of the same contract surface because the docs define a sealed build-time pipeline whose outputs become runtime inputs.
4. The benchmark remains sealed-evidence-first. No runtime retrieval is introduced by this contract.
5. The current 3-step MVP remains the active execution baseline. Future constructs can be listed, but they must be marked as defined or planned rather than treated as already active.

## Locked Acceptance Contract

This contract is only complete when all of the following are true:

1. Every item that materially affects the current or planned runtime/environment surface is listed explicitly.
2. Every listed item includes definition, inputs, outputs/effects, invariants, status, and ownership.
3. Zero-case statements for API, database, edge functions, and frontend are explicit.
4. The contract preserves the no-leak, staged-bytes, and audit/provenance invariants from the essential docs.
5. The AGChain vs InspectAI boundary is explicit for every item where substrate reuse is relevant.

## Flat Contract Inventory

| Item | Definition | Applies When | Inputs | Outputs / Effects | Invariants | Status | Ownership |
|---|---|---|---|---|---|---|---|
| Build Pipeline | Offline build-time process that turns local datasets and specs into benchmark artifacts. | Build-time | local `datasets/`, builder CLIs, source specs | benchmark package, EUs, manifests, signatures | no model calls; no network calls in M1; deterministic outputs | Active | AGChain-owned |
| Research Pack Builder | Build-time builder that assembles authority payloads per anchor case. | Build-time | ranked citations, syllabi/head-matter text, citation inventory, dataset DB/files | RP intermediate artifacts used to derive shipped EU payloads | deterministic authority selection; no runtime retrieval | Active | AGChain-owned |
| Evaluation Unit Builder | Build-time builder that produces per-EU `p1.json`, `p2.json`, and `ground_truth.json`. | Build-time | RP outputs, dataset DB/files, citation inventory | shipped EU payloads and runner-only ground truth | deterministic selection and derivation | Active | AGChain-owned |
| Benchmark Builder | Build-time builder that materializes benchmark metadata, plan, model step files, and judge prompt files. | Build-time | essential FDQ specs, prompt/rubric sources, builder code | `benchmark.json`, `plan.json`, step files, judge prompts | deterministic file generation; contract matches shipped 3-step MVP | Active | AGChain-owned |
| Sealed Bundle | Released bundle containing `benchmark/`, `eus/`, `manifest.json`, and `signature.json`. | Build-time artifact and runtime input | benchmark package + EU directories | sealed benchmark input for runtime execution | released bundle must be tamper-detectable and self-contained | Required | AGChain-owned |
| Manifest Inventory | Root `manifest.json` listing every bundle file with relative path, sha256, and byte count. | Build-time and runtime preflight | sealed bundle file tree | exhaustive file inventory for verification | deterministic ordering; excludes self-reference; normalized relative paths only | Required | AGChain-owned |
| Signature Proof | Root `signature.json` detached Ed25519 signature over manifest bytes. | Build-time and runtime preflight | manifest bytes + signing key | signature verification gate | runner must refuse invalid signature | Required | AGChain-owned |
| Benchmark Packet | Shared benchmark runtime input under `benchmark/` that defines system message, plan, model steps, and judge prompt(s). | Runtime | `benchmark.json`, `plan.json`, step files, judge prompt files | execution schedule and prompt contract for the runner | plan-driven execution; fixed step order | Active | AGChain-owned |
| Evaluation Unit | Per-case runtime package under `eus/<eu_id>/` containing visible payloads and runner-only truth. | Runtime | `p1.json`, `p2.json`, `ground_truth.json` | one execution target for a run | ground truth is never model-visible | Active | AGChain-owned |
| Anchor Payload (`p1`) | Candidate-visible anchor-case payload. | Runtime | shipped EU content | anchor text and metadata become admissible at specified steps | only visible when admitted; staged bytes only | Active | AGChain-owned |
| Authorities Payload (`p2`) | Candidate-visible research-pack payload shipped with the EU. | Runtime | shipped EU content | authority texts become admissible at specified steps | only visible when admitted; no implicit retrieval | Active | AGChain-owned |
| Ground Truth Package | Runner-only evaluation truth used for deterministic scoring and integrity checks. | Runtime | shipped EU content | scorer inputs and inventory checks | never staged; never enters candidate messages or candidate state | Active | AGChain-owned |
| Runner Staging Directory | Per-step transient directory `staging/<run_id>/<call_id>/` containing only current-step visible material. | Runtime | current step file, admitted payloads, sanitized `candidate_state.json` | exact staged bytes for one model call | only admitted files present; deleted after call; basis of audit hashing | Active | AGChain-owned |
| Candidate Execution | Evaluated-model call path for d1/d2/j3 against staged bytes and structured messages. | Runtime | system message, admitted payload windows, candidate carry-forward, task window, output guard | model output per step | model only sees staged/admitted content; no hidden state; no ground truth | Active | Wrapped InspectAI capability |
| Judge Execution | Separate judge-model call that grades both IRAC outputs as a pair. | Runtime | rubric/judge prompt + candidate outputs being graded | one judge record appended to run artifacts | judge sees rubric + outputs only; no transcript or ground truth | Active | Wrapped InspectAI capability |
| Model Roles | Explicit separation between evaluated model and judge model. | Runtime | provider/model config by role | different execution roles for candidate vs judge | judge is isolated; evaluated model is the benchmark target | Active | Wrapped InspectAI capability |
| Payload Admission | Plan-driven control over which payload IDs are visible at each step via `inject_payloads`. | Runtime | `plan.json`, EU payload files | admitted payload set for each step | unadmitted payload references are runtime errors; admission is cumulative | Active | AGChain-owned |
| Structured Message Assembly | Construction of separate fenced user-message windows plus benchmark-level system message. | Runtime | staged files, system message, task templates, candidate state | message array for model execution | fixed ordering; staged-content-only assembly; separate user messages | Active | AGChain-owned |
| `ENV` Window | Message window carrying environment/step framing. | Runtime | benchmark-level and step-level context | part of candidate-visible message array | fenced; fixed position before payload windows | Active | AGChain-owned |
| `ANCHOR_PACK` Window | Message window containing the admitted anchor payload. | Runtime | `p1` staged content | anchor evidence visible to candidate | fenced; present when `p1` admitted | Active | AGChain-owned |
| `EVIDENCE_PACK` Window | Message window containing admitted authorities payload. | Runtime | `p2` staged content | open-book evidence visible to candidate | fenced; empty or absent until `p2` admitted | Active | AGChain-owned |
| `CARRY_FORWARD` Window | Message window carrying sanitized prior-step outputs. | Runtime | `candidate_state.json` | candidate-visible continuity between steps | fenced; model-derived only; no score/judge/ground truth | Active | AGChain-owned |
| `TASK` Window | Step-specific task/instruction window. | Runtime | step prompt template and resolved placeholders | current-step task instructions | fenced; step-specific | Active | AGChain-owned |
| `OUTPUT_GUARD` Window | Message window constraining output shape/format. | Runtime | output contract / schema requirements | output format constraints | never truncated | Active | AGChain-owned |
| Candidate State | Runner-managed carry-forward JSON of model-derived artifacts between steps. | Runtime | parsed and sanitized model outputs | `candidate_state.json` and message carry-forward | accumulation-only; JSON-serializable; per-EU only | Active | AGChain-owned |
| State Sanitization | Removal of forbidden fields from carry-forward state. | Runtime | raw parsed model output | sanitized state for later steps | strips ground truth, scores, judge data, and related forbidden fields | Active | AGChain-owned |
| Replay_Minimal | Hard-cut per-step session strategy using fresh calls plus re-injected staged content and carry-forward. | Runtime | system message, admitted payload windows, candidate state, task, output guard | bounded step execution context | baseline strategy; no accumulated full transcript | Active | AGChain-owned policy, InspectAI-backed execution |
| Replay_Full | Growing-history session strategy across the EU while preserving admission constraints. | Runtime | growing message history under runner control | transcript-based continuity | unadmitted evidence must never leak into history | Defined | AGChain-owned policy, InspectAI-backed execution |
| Type 0 State Provider | File-based serialized state baseline using `candidate_state.json`. | Runtime | sanitized step outputs | persisted inter-step state | runner-managed; serializable; benchmark-validity-safe | Active | AGChain-owned |
| Type I State Provider | Pinned context provider for invariant/persistent runner-controlled context. | Runtime | runner-managed pinned context | expanded continuity model | still runner-controlled and auditable | Defined | AGChain-owned |
| Type II State Provider | Session context manager / ephemeral store for runner-managed session state. | Runtime | runner-managed session store | bounded execution-local persistence | no cross-EU leakage; still auditable | Planned | Wrapped InspectAI capability |
| Type III State Provider | Temporal fact store / richer runner-managed persistence model. | Runtime | runner-managed temporal state | expanded fact continuity | still runner-controlled and auditable | Planned | AGChain-owned policy over substrate |
| Output Contract Validation | Validation of parsed model outputs against the declared step output contract/schema. | Runtime | parsed model output + step schema/contract | pass/fail gate before carry-forward and scoring | invalid output must not silently contaminate carry-forward | Required | AGChain-owned |
| Deterministic Step Scoring | Rule-based scoring, including d1 known-authority scoring. | Runtime | candidate output + runner-only truth | deterministic score record | no runtime DB query required for sealed snapshots | Active | AGChain-owned |
| Judge Pair Grading | One judge call that grades both d2 and j3 IRAC outputs using a rubric. | Runtime | d2 output, j3 output, judge rubric | judge score record | one judge call grades both IRACs | Active | AGChain-owned contract on wrapped InspectAI execution |
| Citation Integrity Check | Deterministic post-chain validation of citations against anchor inventory and RP subset. | Runtime | candidate outputs + `anchor_inventory_full` + `rp_subset` | post-chain deterministic integrity record | closed-book checks anchor only; open-book checks anchor union RP subset | Active | AGChain-owned |
| Audit Log | Canonical `audit_log.jsonl` proof stream for staged file hashes, message hashes, and boundary proofs. | Runtime | staged file hashes, message hashes, execution boundary data | canonical benchmark audit evidence | stricter than generic execution logs; benchmark-validity surface | Active | AGChain-owned |
| Run Log | Append-only `run.jsonl` record stream of step outputs, judge results, and deterministic post-chain records. | Runtime | step/judge/post-chain results | canonical per-run execution record | append-only; one record per boundary/result | Active | AGChain-owned |
| Run Manifest | `run_manifest.json` provenance snapshot for one run. | Runtime | benchmark id, eu id, model settings, input hashes, strategy info | run provenance artifact | reproducibility and run identity | Active | AGChain-owned |
| Summary | `summary.json` deterministic rollup of run results. | Runtime | run records | score aggregation and completion summary | deterministic rollup | Active | AGChain-owned |
| Trace Stream | `trace.jsonl` execution-event stream. | Runtime | step lifecycle events | structured timeline/debug trace | write-only; must not affect execution | Defined | Wrapped InspectAI capability with AGChain mapping |
| Sandbox Lifecycle | Sandbox/environment setup and teardown around execution. | Runtime | sandbox spec, staged/sample files | isolated execution environment | useful where tool/file execution is needed; not owner of benchmark semantics; Legal-10 baseline uses no sandbox; binding is per-run when enabled; network access default-off; cleanup mandatory | Planned | Delegated to InspectAI |
| Sample / Task Lifecycle | Execution-local task/sample substrate used to drive model calls. | Runtime | sample input, files, model config, scoring hooks | substrate for one execution path | should be reused rather than reimplemented where compatible | Planned | Delegated to InspectAI |
| Approval Policy | Tool-use approval policy surface. | Runtime | approval configuration and tool policies | approved or blocked tool execution | relevant only for tool-enabled profiles; governs tool calls only; must not replace or override payload admission; default is no-approval for no-tools baseline | Planned | Delegated to InspectAI |
| Tool-Assisted Execution | Runtime mode that allows standard tool usage under runner control. | Runtime | approved tools, sandbox/task substrate, runner policy | candidate can use tools as configured | AGChain still owns fairness, visibility, and audit semantics; standard tools require explicit allowlist | Planned | Wrapped InspectAI capability |
| MCP-Enabled Execution | Runtime mode that allows MCP-backed tools/connectors. | Runtime | MCP tool registry, approval, sandbox/task substrate | MCP-backed tool access during execution | AGChain still owns benchmark-visible semantics and canonical audit; MCP tools require explicit server config; remote MCP is default-off unless explicitly permitted by contract revision | Planned | Wrapped InspectAI capability |
| Sandbox Execution | Runtime mode where candidate execution occurs inside a sandboxed environment rather than plain model-only calls. | Runtime | sandbox environment, staged files/sample files, approval/tool config | sandbox-backed candidate execution | benchmark semantics remain runner-owned; Legal-10 baseline uses no sandbox; network access default-off; cleanup mandatory | Planned | Wrapped InspectAI capability |
| No-Runtime-Retrieval Rule | Sealed-evidence rule that runtime must not perform retrieval against the benchmark corpus for sealed runs. | Runtime | sealed bundle only | fixed model-visible evidence bytes | no hidden retrieval path | Active | AGChain-owned |
| Per-EU Isolation | Hard boundary that state, evidence, and execution context do not leak across EUs. | Runtime | EU-scoped run inputs | isolated run behavior per EU | no global learning; no cross-EU carry-forward | Active | AGChain-owned |
| Eval Runtime Config | Typed configuration object capturing resolved execution settings for a benchmark run: backend, session strategy, state provider, tool mode, approval mode, sandbox mode, limits, supporting log policy | Runtime | CLI flags, optional Profile, defaults | Resolved config recorded in `runtime_config.json`; used by runner to select behavior paths | `baseline()` must reproduce current 3-step MVP behavior exactly; invalid combinations rejected at resolution time | Defined | AGChain-owned |
| Supporting Execution Logs | Execution log artifacts produced by InspectAI (eval log, transcript, trace) that are distinct from canonical AGChain audit proof | Runtime (InspectAI backend) | InspectAI execution outputs | Optional log file references recorded in `runtime_config.json` via `supporting_log_paths` | Never required for baseline direct runs; canonical `audit_log.jsonl` remains admissibility proof; supporting logs are additive evidence only | Planned | InspectAI-produced, AGChain-referenced |
| Runtime Limits | Execution resource limits applied to benchmark runs | Runtime | Limit configuration from RuntimeConfig or Profile constraints | Execution bounded by token/message/time/cost/retry limits | Limits must be benchmark-valid; fail-on-error behavior explicit; retry behavior must not change benchmark semantics | Defined | AGChain-owned policy, InspectAI-backed enforcement |

## Locked Ownership Rules

1. AGChain owns payload admission.
2. AGChain owns structured message windows.
3. AGChain owns candidate-visible carry-forward semantics.
4. AGChain owns canonical audit/provenance artifacts.
5. InspectAI is the preferred substrate for task/sample/model/sandbox/tool/approval mechanics where those mechanics do not conflict with AGChain benchmark semantics.
6. InspectAI logs are supporting evidence; AGChain `audit_log.jsonl` remains canonical for benchmark proof.

## InspectAI Integration Boundary

### AGChain Owns

- Payload admission (`inject_payloads` / `payload_gate.py`)
- Structured message window assembly (`input_assembler.py`)
- Candidate state sanitization and carry-forward (`state.py`)
- Candidate/judge isolation rules (runner enforces what each role sees)
- Canonical audit proof (`audit_log.jsonl`, staged file hashes, message hashes)
- Bundle sealing, manifest, and signature verification
- Eval Runtime Config resolution and validation
- Runtime limit policy
- Profile identity and version tracking

### Wrapped From InspectAI

- Model execution via `Model.generate()` (`execution_backend.py` / `inspect_backend.py`)
- Model roles (evaluated vs judge) — InspectAI provides the mechanism, AGChain defines the policy
- Token accounting and execution timing from `ModelOutput`
- Future: tool execution pipeline, approval policy enforcement, sandbox lifecycle, eval logging

### Out of Scope (Current Phase)

- Remote MCP transport (default-off, requires explicit future contract revision)
- Networked sandbox execution (default-off)
- Full InspectAI `eval()` pipeline integration (only `Model.generate()` is used)
- Solver/task/sample framework (AGChain's runner owns the execution lifecycle)

## Zero-Case Statements

1. This contract does not define any new platform API endpoints.
2. This contract does not define any new database tables or migrations.
3. This contract does not define any frontend routes or pages.
4. This contract does not define any new edge functions.

## Explicit Risks Accepted In This Contract

1. The flat inventory may later be reorganized into categories after implementation pressure makes the categories obvious; that reorganization is intentionally deferred.
2. Several items are listed as defined or planned because the docs name them, but the current active runtime is still the 3-step MVP baseline.
3. Sandbox/tool/approval items depend partly on InspectAI substrate shape; those items are intentionally locked as wrapped/delegated rather than AGChain-reimplemented by default.

## Completion Criteria

This contract is complete only when all of the following are true:

1. The flat inventory above is sufficient to describe the active 3-step MVP runtime/environment surface and the explicitly named planned extensions.
2. Every item has a concrete status and ownership label.
3. The contract preserves the no-leak, staged-bytes, payload-admission, and audit/provenance rules from the essential docs.
4. Later implementation work can use this file without needing to invent a new taxonomy first.
