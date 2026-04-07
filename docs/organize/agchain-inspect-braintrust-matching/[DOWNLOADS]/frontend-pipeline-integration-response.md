# Frontend Pipeline Integration Response

## Preface

I could not access the requested Windows path `E:\writing-system\docs\critical-issues\frontend-implementation-issue`, and I could not locate the exact file `2026-04-04-rfp-frontend-pipeline-integration.md` or its Section 6 in the mounted workspace. This response is therefore a **best-effort reconstruction** of the requested seven deliverables, grounded in the materials that were accessible:

- the 2026-04-04 AGChain tools plan and its post-implementation evaluation/status material
- the 2026-04-04 AGChain datasets implementation plan
- the `frontend-foundation-audit` skill and its report generator/schema/template
- the `writing-skills` skill and supporting skill-authoring guidance
- Anthropic skill authoring best practices

I have **not** discarded the architecture. The recommendations below preserve the direction already locked in the accessible materials and focus on sharpening triggers, tightening contracts, and adding enforcement where the current pipeline fails.

---

## Deliverable 1: Executive Assessment

### Core conclusion

The failure is **not** that the pipeline chose the wrong architecture. The failure is that the pipeline lets teams move from "directionally correct" to implementation without enough repo-grounded frontend contract discovery, without enough locked artifact structure, and without enough blocking enforcement at completion.

### What the accessible evidence shows

The tools plan explicitly says the right move is to **preserve the core product direction and rewrite the under-locked contracts**, not to reinvent the architecture. That document salvages the benchmark-level tool bag, explicit resolved-manifest seam, server-first MCP model, archive-only lifecycle, exclusion of authored `skill` rows, and checked-in metadata for built-ins. It rewrites the scope wording, auth contract, deterministic `tool_ref` model, MCP child-tool semantics, resolved-manifest read surface, secret-handling contract, and execution task plan. In other words: the product direction was broadly right, but the contract-writing was too loose.

The post-implementation evaluation then demonstrates the pipeline failure mode in concrete terms. The implementation was judged `Non-Compliant` at roughly 78% compliance, with three critical deviations: a missing locked frontend test file, ten missing observability items, and a major architectural drift in which `AgchainBenchmarkWorkbenchPage.tsx` became a redirect stub while the actual tool-bag behavior landed in `AgchainBenchmarksPage.tsx` through an undeclared hook. That is exactly the kind of failure a stronger planning-and-enforcement pipeline should prevent.

The datasets plan shows the counterexample: a much tighter artifact with a Source Verification Ledger, locked scope boundary, locked frontend surface area, locked inventory counts, locked file inventory, locked acceptance contract, explicit completion criteria, explicit risks, and a sequenced implementation task list. That plan is far closer to the quality bar the pipeline should require by default.

### Root cause

The root cause is a four-part pipeline gap:

1. **No mandatory frontend-foundation discovery gate** before writing plans that touch shared frontend substrate.
2. **Plan-writing skills are not consistently forcing locked contracts** at the same level of specificity seen in the datasets plan.
3. **Implemented-plan evaluation exists but is not strong enough as a blocking release gate.**
4. **Skill authoring/editing itself is not being treated with TDD discipline**, so pipeline skills can remain under-specified and loophole-prone.

### Direction to preserve

Preserve these decisions:

- project-gated Tools surface rather than copying the global Models precedent
- benchmark-version-level ordered tool bag
- deterministic pinned `tool_ref` resolution
- server-first MCP registration/discovery
- explicit resolved-manifest read surface
- archive-only lifecycle
- exclusion of authored `skill` rows from the tools registry
- reuse of the canonical `/secrets` seam without persisting secret IDs or values

---

## Deliverable 2: Revised End-to-End Pipeline

The revised pipeline should be:

### Stage 0: Intake and classification

Before anyone writes an implementation plan, classify the request.

A request is **frontend-foundation-affecting** if it changes any of the following:

- shell wrappers or page frames
- route-to-surface mapping
- navigation rails or page-header conventions
- token/theme ownership
- shared components or reusable page scaffolds
- table-plus-inspector patterns
- detail-workspace patterns
- loading/empty/error/permission/async presentation conventions

If any of those are touched, the request **must** run through `frontend-foundation-audit` first.

### Stage 1: Foundation audit (when triggered)

Run the repo-first audit before plan writing.

Required outputs:

- `foundation-audit.json`
- `foundation-audit.md`

Those outputs are not optional notes. They are the required substrate for any later canonical contract work or any implementation plan that depends on shared frontend patterns.

### Stage 2: Locked implementation plan

Only after the audit exists should the plan-writing skill produce the implementation plan.

Every plan must include, at minimum:

- relationship to umbrella architecture
- source verification ledger
- explicit scope boundary
- locked decisions
- locked API/observability/frontend surfaces
- locked inventory counts
- locked file inventory
- locked acceptance contract
- completion criteria
- explicit accepted risks
- implementation tasks with tests and expected outputs

The datasets plan should become the default template, not the exception.

### Stage 3: Plan validation

Before implementation starts, validate the plan artifact.

This is where Anthropic's recommended pattern applies directly: **analyze → create plan file → validate plan → execute → verify**. The validation step should be machine-assisted wherever possible.

### Stage 4: Implementation

Implementation happens against the locked plan, not against a freeform narrative.

### Stage 5: Implemented-plan evaluation

After code exists, the evaluator compares the approved plan to the actual repo state.

Required outputs:

- verdict
- compliance rate
- critical deviations
- minor deviations
- undeclared additions
- remediation list
- domain-by-domain audit tables

### Stage 6: Completion gate

A separate completion gate decides whether the work may be called complete.

A passing evaluator is necessary but not sufficient. Completion also requires passing acceptance contract checks, locked inventory matching, required tests, and any required manual smoke items.

### Stage 7: Contract update or merge

If implementation drifted but drift is valid, the team must either:

- amend the approved plan to match the implementation, or
- change the implementation to match the approved plan.

Silent divergence is not allowed.

---

## Deliverable 3: Revisions to Existing Skills

### 3.1 `frontend-foundation-audit`

This skill is directionally strong and should become a **mandatory upstream gate**, not just an optional diagnostic tool.

#### What to preserve

Preserve:

- repo code as the source of truth
- prohibition on jumping straight to a canonical contract
- explicit inventories for shell, navigation, tokens, components, page patterns, state presentation, and accessibility
- conflict-bundle logic
- requirement to emit `foundation-audit.json` and `foundation-audit.md`

#### What to tighten

Add these rules:

1. **Mandatory trigger rule**
   - If a plan touches any shared frontend substrate, this skill must run before the plan is written.
   - "Looks like a feature page" is not an exception if the page reuses or redefines shared scaffolding.

2. **Blocking severity field for conflicts**
   - Every conflict bundle should include a severity: `blocking`, `high`, or `advisory`.
   - `blocking` means no implementation plan may proceed without explicitly referencing the bundle and stating how it will avoid worsening the conflict.

3. **Plan handoff section**
   - Emit a compact handoff block such as:
     - clean areas safe to rely on
     - conflict bundles the plan must respect
     - surfaces that are off-limits until resolved

4. **Audit-to-plan binding rule**
   - If a later plan depends on the audit, the plan must explicitly cite which clean areas it relies on and which conflict bundles it avoids or constrains.

5. **Anti-shortcut rule**
   - Add an explicit red flag: "Do not audit only the target feature page before understanding page frame, shell, rails, and shared patterns."

### 3.2 Plan-writing skill(s) in the implementing-plan series

I could not access the specific `-implementing-plan-series/` directory the request named, so this section is inferred from the datasets and tools planning artifacts that were accessible.

#### What to preserve

Preserve the current architecture and menu-scoped plan structure.

#### What to tighten

Make the datasets plan structure mandatory across the plan-writing series.

Required sections for every implementation plan:

1. Goal
2. Relationship to umbrella architecture
3. Source Verification Ledger
4. Scope Boundary
5. Locked Decisions
6. Locked Platform API Surface
7. Locked Observability Surface
8. Locked Frontend Surface Area
9. Locked Inventory Counts
10. Locked File Inventory
11. Locked Acceptance Contract
12. Completion Criteria
13. Explicit Risks Accepted In This Plan
14. Implementation Tasks
15. Final verification task

#### New hard rules

- Do not start implementation tasks until inventory counts and acceptance contract are locked.
- Do not rely on inherited precedent without explicitly naming where that precedent applies and where it does not.
- Do not leave architectural placement ambiguous. If a component is supposed to live in `AgchainBenchmarkWorkbenchPage.tsx`, the plan must say so, and the evaluator must treat alternative placement as drift unless the plan is amended.
- Do not say "reuse existing telemetry" without enumerating the exact spans, logs, counters, and histograms.

### 3.3 `evaluating-implemented-plan`

This skill appears to exist in the evidence base and already produced useful findings. Keep it, but make it more explicitly blocking.

#### Required outputs

Every run must produce these sections:

- reviewed inputs
- compliance verdict
- compliance rate
- critical deviations
- minor deviations
- undeclared additions
- manifest audit by domain
- remediation list

#### New blocking rules

Classify as **critical** by default when any of the following occur:

- locked file missing
- locked test missing
- locked route/trace/log/counter/histogram missing
- implementation lands in a different page/container than the plan locked
- undeclared addition changes ownership or runtime behavior
- required acceptance proof missing

#### New disposition rule

For every undeclared addition, the evaluator must label it as one of:

- `acceptable but requires plan amendment`
- `acceptable and already documented`
- `non-compliant architectural drift`

That eliminates the gray zone where working code silently mutates the plan.

### 3.4 `writing-skills`

This skill is strong and should be adopted as the governance model for pipeline-skill evolution.

#### What to preserve

Preserve:

- "writing skills is TDD applied to process documentation"
- failing-baseline-first discipline
- RED/GREEN/REFACTOR loop
- rationalization capture
- explicit loophole-closing language
- trigger-only description guidance

#### What to tighten for pipeline skills

For any new or modified pipeline skill:

- baseline pressure scenarios must be stored alongside the skill
- each loophole discovered in real usage must be added to a rationalization table
- each skill change must include evidence of re-test before deployment
- no batching of multiple untested skill edits into one rollout

---

## Deliverable 4: Missing Pieces and New Narrow Skills

The architecture does **not** need a large new skill explosion. It needs two narrow additions and a few deterministic validators.

### 4.1 New skill: `frontend-surface-triage`

#### Purpose

Decide whether a request touches shared frontend substrate and therefore requires `frontend-foundation-audit` before plan writing.

#### Trigger

Use when a request mentions any of:

- new page replacing placeholder wrapper
- router changes
- page frame changes
- table + inspector patterns
- detail workspace tabs
- shared tool/editor dialogs
- shell, rail, theme, token, page-header, empty/loading/error patterns

#### Output

- classification: `feature-local` or `foundation-affecting`
- required downstream artifacts
- whether audit is mandatory
- which shared surfaces are implicated

#### Why this is needed

It closes the most expensive loophole: "This is just one frontend feature, so I can skip shared-surface discovery."

### 4.2 New skill: `completion-gate`

#### Purpose

Block premature completion claims.

#### Inputs

- approved plan
- evaluator report
- test results
- changed file list
- any required manual smoke evidence

#### Output

Pass/fail checklist with explicit blockers.

#### Blocking checks

- locked inventory matches
- acceptance contract fully satisfied
- evaluator has no unresolved critical deviations
- required tests pass
- required observability proof exists
- any architectural relocation has either been reverted or documented by plan amendment

### 4.3 Deterministic validators inside existing plan skills

These do **not** need to be separate skills. They should be utility scripts used by the plan-writing and completion stages.

Recommended scripts:

1. `validate-plan-sections.mjs`
   - Ensures every required section exists.

2. `validate-locked-inventory.mjs`
   - Compares locked file inventory/counts to repo diff.

3. `validate-observability-contract.mjs`
   - Checks route traces, internal spans, structured logs, counters, and histograms against the locked contract.

4. `validate-acceptance-checklist.mjs`
   - Verifies that each acceptance criterion has corresponding proof.

These scripts operationalize the plan-validate-execute-verify pattern instead of leaving validation as a purely human memory task.

---

## Deliverable 5: Enforcement Mechanisms

### 5.1 Mandatory gates

1. **No plan before triage.**
2. **No foundation-affecting plan before foundation audit.**
3. **No implementation before plan validation.**
4. **No completion claim before implemented-plan evaluation.**
5. **No merge/approval before completion gate pass.**

### 5.2 Blocking conditions

The following are automatic blockers:

- missing locked file
- missing locked test
- missing locked telemetry item
- missing acceptance proof
- architectural placement drift
- secret-handling contract drift
- floating runtime identifier where a pinned identifier was required
- undeclared addition that changes runtime behavior or ownership

### 5.3 Plan amendment rule

If implementation improves the architecture but differs from the locked plan, the pipeline must not silently accept it.

Required action:

- amend the approved plan and re-run evaluation, or
- change the code to conform to the approved plan

### 5.4 Severity policy

Use this policy across evaluator and completion gate:

- **Critical:** blocks completion immediately
- **Major:** completion blocked unless explicitly waived and amended
- **Minor:** does not block completion alone, but must be recorded
- **Advisory:** informational

### 5.5 Skill-governance enforcement

Any change to a pipeline skill must include:

- failing baseline scenario
- updated skill text
- passing re-test
- newly captured loopholes added to the skill

This keeps the pipeline itself from drifting into hand-wavy guidance.

---

## Deliverable 6: Artifact Contracts

### 6.1 Foundation audit artifact

Required outputs:

- `foundation-audit.json`
- `foundation-audit.md`

Required contents:

- shell ownership map
- navigation structure
- token/theme inventory
- component contract inventory
- page pattern inventory
- state-presentation inventory
- accessibility notes
- conflict bundles
- clean areas
- recommended directions
- unresolved decisions

Required usage rule:

Later plans must reference the audit instead of rediscovering the same conflicts.

### 6.2 Implementation plan artifact

Required characteristics:

- self-contained
- menu-scoped when appropriate
- derived from umbrella architecture but explicit about what is and is not inherited
- deterministic enough to evaluate mechanically

Required fields beyond the current pattern:

- `foundation_dependencies`
  - which clean areas the plan relies on
  - which conflict bundles it must not worsen
- `artifact_validation_commands`
  - the validator commands that must pass before implementation begins
- `amendment_policy`
  - how architectural relocation or undeclared additions are handled

### 6.3 Evaluation artifact

Required structure:

- Approved plan version/date
- Repo diff scope reviewed
- Tests reviewed
- Compliance verdict
- Compliance rate
- Critical deviations
- Minor deviations
- Undeclared additions
- Remediation list
- Final recommendation

### 6.4 Completion artifact

Required structure:

- locked inventory check
- acceptance contract check
- test matrix results
- observability proof check
- architectural placement check
- disposition of all deviations
- final pass/fail

### 6.5 Skill artifact quality rules

Every skill should have:

- a trigger-only description starting with "Use when..."
- explicit red flags
- a quick reference section
- clear required outputs
- supporting files linked directly from `SKILL.md`
- no Windows-style paths
- no workflow summary in the description field

---

## Deliverable 7: Rollout Plan and Success Metrics

### Phase 1: Immediate

Apply these changes first:

1. Make frontend triage mandatory.
2. Make `frontend-foundation-audit` mandatory for foundation-affecting requests.
3. Standardize all implementation-plan skills on the datasets-style locked artifact.
4. Treat missing locked tests and missing observability items as blocking by default.

### Phase 2: Next

1. Add the validator scripts.
2. Add the `completion-gate` skill.
3. Update the evaluator to classify undeclared additions and architectural relocations explicitly.
4. Retrofit the current tools plan/evaluation flow to the stronger gate.

### Phase 3: Ongoing

1. Apply `writing-skills` discipline to all pipeline skills.
2. Store baseline pressure scenarios adjacent to each skill.
3. Refactor loopholes back into the skills whenever real failures occur.

### Success metrics

Track these metrics across the next 5–10 frontend plans:

- percentage of foundation-affecting plans that include a prior audit
- percentage of plans with validated locked inventories before implementation
- percentage of implementations with zero undeclared additions
- percentage of evaluated implementations with zero critical deviations
- percentage of completion attempts blocked before merge because the gate caught a real defect
- reduction in missing telemetry/test coverage defects discovered after "done"
- reduction in architectural placement drift between approved plan and landed code

### Expected result

If the revised pipeline is adopted, the next improvement should not come from writing longer plans. It should come from making the pipeline **harder to bypass** and **easier to verify**.

---

## Concrete Recommendation Summary

1. Keep the architecture.
2. Make frontend-foundation discovery mandatory when shared substrate is touched.
3. Make datasets-style locked plans the default across the implementing-plan series.
4. Add narrow triage and completion-gate skills instead of inventing a large new architecture.
5. Add validator scripts so plan validation is partially mechanical.
6. Treat evaluator findings as release-gating, not advisory.
7. Apply TDD-for-skills discipline to the pipeline skills themselves.

---

## What I Could Not Verify

I could not verify the following because the requested path and exact RFP file were not accessible in this environment:

- the exact text of `2026-04-04-rfp-frontend-pipeline-integration.md`
- the exact seven deliverables named in its Section 6
- the full contents of the user-local `-implementing-plan-series/` directory referenced in the request
- the ability to save into the original Windows directory

This file is therefore saved to the accessible workspace instead of the requested Windows path.
