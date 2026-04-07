# Frontend Pipeline Integration Response v2

## Why this revision exists

After reviewing approved implementation-plan exemplars, the main correction is not a small wording tweak. The earlier response treated the problem too much like a pipeline strategy memo. Your approved implementation plans are a different artifact class: they are executable, discussion-shaped delivery contracts with locked seams, locked inventories, explicit verification commands, and explicit completion gates.

That means the frontend-pipeline integration response should start by defining how frontend-impacting work becomes an approved-plan-grade contract artifact, not by starting with broad architecture commentary.

This revision preserves the original architecture direction. It changes the framing, the contract depth, and the enforcement model so the frontend pipeline can produce the same kind of artifact quality shown in the approved plans.

---

## Deliverable 1: Approved-plan-aligned diagnosis

### Revised core diagnosis

The central failure is not merely “frontend work needs more audit.” The central failure is that frontend-affecting work is entering execution without being transformed into the same artifact class as your approved implementation plans.

In the approved plans, the plan itself is the control surface. It locks:

- product decisions
- API surface
- observability surface
- frontend surface area
- inventory counts
- exact file inventory
- acceptance criteria
- completion criteria
- explicit risks
- test/verification commands
- implementation order

The frontend pipeline currently does not enforce that level of contract maturity before implementation begins. As a result, teams can carry correct architecture into execution but still drift at the page-frame, route, component, state-presentation, or inventory level.

### Revised root cause statement

The root cause is a missing contract-conversion layer for frontend work:

1. Shared-frontend-impacting work is not consistently forced through a repo-first foundation audit.
2. Plan-writing skills do not reliably emit approved-plan-grade locked contracts for frontend work.
3. Execution skills can proceed without all required locked frontend sections being present.
4. Completion claims are not blocked strongly enough on locked-contract verification.
5. Discussion outcomes and discovered defects are not consistently preserved as first-class plan input the way your approved plans preserve them.

### What must be preserved

Do not discard the architecture already chosen in the recommended-actions materials. Preserve the existing direction and change the precision of the contract machinery around it.

---

## Deliverable 2: Canonical artifact model for frontend-affecting work

Every frontend-affecting plan should be treated as an **Approved Implementation Plan** artifact, not as a general recommendation memo.

### Required front matter

Every such plan must open with:

- Goal
- Architecture
- Tech Stack
- Status
- Author
- Date

Optional but strongly preferred when relevant:

- Implementation Checkpoint
- vN defect this plan corrects / revision lineage

### Required contract sections

For any plan that changes mounted frontend behavior, shared frontend substrate, or frontend/backend seams consumed by the app, the following sections become mandatory:

1. Manifest
2. Pre-Implementation Contract
3. Locked Product Decisions
4. Locked Acceptance Contract
5. Locked Platform API Surface
6. Locked Observability Surface
7. Locked Frontend Surface Area
8. Locked Inventory Counts
9. Locked File Inventory
10. Frozen or Locked Seam Contracts for any sensitive seam
11. Explicit Risks Accepted In This Plan
12. Completion Criteria
13. Implementation Tasks
14. Verification Sweep / Execution Handoff

### New mandatory frontend-specific subsections

The approved examples show strong locking on backend and storage seams. Frontend plans need the same force, with frontend-specific additions.

#### Locked Frontend Surface Area must include

- mounted route(s)
- page ownership
- whether the change is page-local, shell-level, or shared-foundation-level
- new components
- modified components
- new hooks/services
- modified hooks/services
- loading/empty/error state ownership
- permission state ownership
- data refresh ownership
- test module inventory

#### Frozen UI seam contracts must exist when relevant

Examples:

- page-to-shell boundary contract
- table-plus-inspector pattern contract
- route-to-page ownership contract
- detail-workspace contract
- modal/editor ownership contract
- async state presentation contract
- compatibility redirect contract

If the work touches a seam but the plan does not freeze it, the plan is not implementation-ready.

### New mandatory source-verification section

Frontend plans should add a **Source Verification Ledger** just like the strongest approved plans already do implicitly or explicitly.

For each major claim or constraint, the plan must record the source type:

- repo code inspection
- approved stakeholder decision
- prior plan revision/discussion outcome
- runtime evidence / evaluation report
- compatibility constraint from an existing mounted surface

This prevents plan-writing from silently mixing assumptions with verified facts.

---

## Deliverable 3: Skill revisions, sharpened to approved-plan standards

## 3.1 `frontend-foundation-audit`

This should become a mandatory upstream artifact generator for shared-frontend-impacting work.

### Keep

- repo-as-source-of-truth discipline
- shell / nav / tokens / shared component / state-presentation inventories
- conflict bundle detection
- required machine-readable plus human-readable outputs

### Tighten

Add the following locked behavior:

1. **Trigger classification output**
   - the audit must classify the request as one of:
     - `shared_foundation_impacting`
     - `page_local_but_shared_pattern_sensitive`
     - `page_local_low_foundation_risk`
     - `non_frontend`

2. **Blocking outcome field**
   - each conflict bundle must be marked `blocking`, `high`, or `advisory`
   - any `blocking` bundle stops plan generation until explicitly addressed

3. **Plan handoff block**
   - required outputs:
     - safe patterns to reuse
     - patterns that must not be copied forward
     - route/page ownership notes
     - shell constraints
     - unresolved substrate conflicts

4. **Plan-binding identifiers**
   - each clean area and conflict bundle must get a stable ID so the later plan can cite it directly

5. **Front-loaded anti-shortcut rule**
   - prohibit auditing only the target page without first understanding surrounding shell and shared infrastructure when mounted UI is affected

## 3.2 Implementing-plan-series skills

These skills should be redefined so their default output is an approved-plan-grade contract artifact.

### Required behavior changes

1. They must refuse to produce an implementation-ready plan for frontend-impacting work unless either:
   - a qualifying foundation audit exists, or
   - the skill explicitly records why the work is page-local and does not touch shared substrate

2. They must emit all mandatory locked sections listed in Deliverable 2.

3. They must produce **Locked Frontend Surface Area** and **Locked File Inventory** with the same strictness shown in the approved plans.

4. They must encode discussion history into the artifact when relevant using a section such as:
   - `v1 defect this plan corrects`
   - `v2 defect this plan corrects`
   - `revision baseline`

5. They must write implementation tasks in approved-plan style:
   - file list
   - failing test first when applicable
   - implementation steps
   - verification command
   - expected output
   - commit message

6. They must include a final verification sweep and explicit completion criteria.

## 3.3 `executing-plans`

This skill should not just “execute the plan.” It should enforce the contract shape during execution.

### Add enforcement

- refuse to begin if required locked sections are missing
- require the approved plan file as the execution source of truth
- fail execution if actual file creation/modification drifts beyond locked inventory without an explicit plan revision
- require failing-test-first sequence when the plan calls for it
- require exact route/page ownership matching for frontend tasks
- require verification outputs before any task is marked complete

## 3.4 `implemented-plan-evaluator`

This skill should be formalized as the repo-state comparator after implementation.

### Required outputs

- verdict
- compliance percentage
- critical deviations
- minor deviations
- undeclared additions
- missing deliverables
- locked-inventory mismatches
- locked-observability mismatches
- locked-frontend-surface mismatches
- remediation actions

### New frontend-specific comparison rules

- compare mounted route ownership against plan
- compare page/component/hook/service inventory against plan
- compare test-module inventory against plan
- flag redirect stubs that replace planned live pages unless explicitly declared
- flag logic moved into undeclared pages or hooks

## 3.5 `verification-before-completion`

This should become the final closure gate, not an optional polish step.

### Must verify

- locked acceptance contract
- completion criteria
- inventory counts
- file inventory
- required tests and expected outcomes
- required manual verification items, if any
- no undeclared drift left unresolved

No work touching frontend should be called complete until this skill passes.

---

## Deliverable 4: Enforcement mechanisms that close the loopholes

The architecture is sound. The missing piece is hard enforcement.

### Enforcement 1: Plan readiness gate

No frontend-impacting work may be marked implementation-ready unless:

- foundation-audit requirement is satisfied
- locked frontend surface area exists
- locked inventory counts exist
- locked file inventory exists
- locked acceptance contract exists
- completion criteria exist
- task list includes verification commands

### Enforcement 2: Artifact-shape linting

Add a plan-lint step that rejects a plan if required sections are missing.

Minimum lint failures:

- no locked frontend surface area for mounted UI change
- no exact file inventory
- no explicit tests
- no completion criteria
- no risks section
- no route ownership statement when routes are touched
- no frozen seam contract when a shared seam is modified

### Enforcement 3: Audit-to-plan binding

When a foundation audit is required, the plan must cite:

- which clean areas it relies on
- which conflict bundles it avoids
- which blocking bundles it resolves or works around

A plan that does not bind itself to the audit is not valid.

### Enforcement 4: Drift classification at evaluation time

The evaluator must classify deviations as:

- architecture drift
- mounted-surface drift
- inventory drift
- observability drift
- test drift
- route-ownership drift
- acceptable implementation detail drift

Only the last category may be non-blocking by default.

### Enforcement 5: Completion claim prohibition

Completion cannot be claimed when any of the following hold:

- critical evaluator deviation remains unresolved
- verification sweep incomplete
- inventory mismatch unresolved
- missing test module from locked file inventory
- mounted UI lives in a different page/hook/component than the approved plan

---

## Deliverable 5: Gaps the earlier response underweighted

The approved-plan exemplars show several gaps that the earlier response did not elevate enough.

### Gap 1: Discussion lineage must be part of the artifact

The secrets plan is especially important here. It does not merely present a final solution; it records what earlier plan versions got wrong and what this revision corrects. Frontend pipeline plans need the same discipline whenever the plan is the product of discussion, defect discovery, or stakeholder correction.

### Gap 2: Frozen seam contracts matter as much as surface inventory

The best plans do not stop at endpoint lists or file lists. They freeze delicate seams such as crypto transitions, runtime secret resolution, compatibility redirects, upload identity, and provider-catalog resolution. Frontend plans need explicit frozen contracts for route ownership, page composition seams, and shared UI patterns.

### Gap 3: Test-first tasking is part of the control system

The approved plans repeatedly structure work as failing tests first, then implementation, then verification. That is not incidental style. It is part of how the artifact prevents vague implementation drift. Frontend pipeline skills should require that format by default where testable seams exist.

### Gap 4: Inventory counts are not administrative fluff

The approved plans treat counts as a control surface. If a plan says “new components: 3” and “modified pages: 2,” that is later checkable. Frontend integration plans must use counts aggressively because frontend drift often shows up first as silent expansion of components, hooks, pages, and route logic.

### Gap 5: Execution handoff language is part of enforcement

At least one approved plan explicitly instructs the implementer which skill must be used for execution, and another explicitly requires verification-before-completion before calling the work done. That means the frontend pipeline response should specify not just what skills exist, but where each one becomes mandatory in the lifecycle.

---

## Deliverable 6: Revised pipeline, aligned to approved-plan practice

### Stage 1: Request classification

Classify the work as one of:

- frontend shared-foundation impacting
- frontend page-local but shared-pattern sensitive
- frontend page-local low-risk
- backend-only
- evaluation/remediation only

### Stage 2: Evidence and audit

If shared frontend substrate is touched, run `frontend-foundation-audit` first.

Required artifacts:

- `foundation-audit.json`
- `foundation-audit.md`

### Stage 3: Approved-plan authoring

Use the implementing-plan skill chain to generate an approved-plan-grade artifact with:

- locked contracts
- locked inventory
- locked file inventory
- explicit frozen seams
- tasks
- verification sweep
- discussion lineage where applicable

### Stage 4: Plan lint / readiness validation

Before execution begins, validate that the plan contains all mandatory sections and binds correctly to any required audit.

### Stage 5: Execution

Execute only from the approved plan artifact via `executing-plans`.

### Stage 6: Implemented-plan evaluation

Compare actual repo state to the approved plan using `implemented-plan-evaluator`.

### Stage 7: Verification-before-completion

Run the final closure gate against the locked acceptance contract, completion criteria, tests, and inventories.

### Stage 8: Closure or revision

If implementation drift is valid, revise the plan and re-run evaluation/verification. If drift is invalid, change the implementation. No silent divergence.

---

## Deliverable 7: Concrete approval rubric for future frontend pipeline outputs

A frontend pipeline proposal or skill revision should be approved only if it meets all of the following.

### A. Artifact quality

- produces approved-plan-grade contract artifacts, not only recommendations
- includes locked frontend surface area
- includes locked inventory counts and exact file inventory
- includes completion criteria and verification sweep

### B. Evidence discipline

- distinguishes repo-grounded facts from assumptions
- preserves discussion-derived corrections when they materially shape the plan
- binds plan content to audit artifacts when required

### C. Execution discipline

- uses failing-test-first task structure where appropriate
- assigns mandatory skills at the correct stages
- blocks execution when prerequisite artifacts are missing

### D. Drift resistance

- evaluator can detect moved logic, redirect stubs, missing files, undeclared additions, and frontend ownership drift
- completion cannot be claimed while critical deviations remain

### E. Frontend specificity

- route ownership is explicit
- shared substrate changes trigger foundation audit
- frozen UI seam contracts exist for sensitive page/shell/pattern boundaries
- async/loading/error/permission state ownership is declared

---

## Practical implication for the opening of the original response

You were right that the starting areas should look different.

The opening should not begin by mainly saying “the architecture is sound but enforcement is weak.” That statement is true, but it is too generic for the artifact culture shown in the approved plans.

The opening should instead begin with something closer to this:

> The missing piece is not a new architecture. The missing piece is that frontend-impacting work is not being converted into the same approved-plan artifact class already used elsewhere in the system: executable plans with locked product/API/observability/frontend contracts, frozen seams, exact file inventories, test-first task sequencing, and verification-before-completion gates.

That is the frame these exemplars justify.

---

## Recommended next adjustment to the full response

The full frontend-pipeline integration response should be rewritten so the seven deliverables are expressed as:

1. approved-plan artifact standard for frontend-affecting work
2. trigger matrix for when frontend-foundation-audit is mandatory
3. skill-by-skill contract revisions
4. hard enforcement and blocking rules
5. newly identified gaps from exemplar comparison
6. approved-plan-aligned lifecycle sequence
7. approval rubric / closure gate

That would bring the response much closer to the specificity and artifact discipline demonstrated by the approved implementation plans you shared.
