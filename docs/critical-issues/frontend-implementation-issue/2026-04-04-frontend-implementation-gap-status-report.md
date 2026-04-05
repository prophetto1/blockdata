# Status Report: Frontend Implementation Parity Gap

**Date:** 2026-04-04
**Author:** Jon
**Audience:** Full development team
**Purpose:** Align the team on a systemic frontend implementation problem, review evidence from three active features, and propose a corrective process

---

## Executive Summary

Our backend implementation pipeline produces locked, auditable, contract-grade plans. Our frontend implementation does not reach parity. Three features — Plan Tracker, AGChain Models, and Index Builder — demonstrate the same pattern: strong backend contracts paired with frontend surfaces that remain generic, state-gated, and structurally incomplete. The problem is not communication. The same frontend requirements were stated six or more times in a single session without the implementation materializing. The problem is a missing process gate that forces frontend structural specificity before backend wiring proceeds.

---

## The Problem

Frontend pages ship as generic container shells. They compile. They mount. They pass basic smoke tests. But they do not visually declare what product they are until live data populates them. Strip the data, and any other feature could plausibly live in the same containers.

This matters because:

- Backend engineers wire data into unstable visual surfaces, causing rework
- Product reviews reveal "empty" pages that require late-stage redesign
- Frontend iteration consumes 3-5x more cycles than the equivalent backend work
- The team loses confidence in the frontend delivery timeline

The root cause is sequencing. We build frontend in this order:

1. Layout containers
2. Hook wiring and state management
3. Behavior and tests
4. Visual composition and product identity (deferred, often indefinitely)

The correct order is:

1. Product-specific visual scaffold (derived from the approved plan)
2. Fixture-backed placeholder content
3. Behavior and state wiring
4. Backend integration into already-defined surfaces

---

## Evidence: Three Features, One Pattern

### Plan Tracker

**Backend contract status:** Fully locked. The approved implementation plan defines lifecycle states, artifact types, metadata schema, metadata editability rules, workflow transition matrix, and right-column inspector section order — all before any code was written.

**Frontend status:** After two full implementation batches, the page still reads as a generic three-column workbench. The MDX editor mounts only after artifact selection; otherwise the center pane shows "No artifact selected." The right inspector mounts only after plan+artifact selection; otherwise it shows "No metadata available." Lifecycle tabs, plan rows, metadata fields, workflow action buttons, note composer framing, and document header controls are all absent from the page until selection populates them.

**The gap:** The page hides its product identity behind selection state. A user landing on the page sees generic containers, not a plan tracker. The same containers could hold any other feature.

**What is actually in the code vs. what is visible:**
- The MDX editor *is* integrated — it mounts through `usePlanTracker.tsx` via `MdxEditorSurface`. But it only mounts when there is a selected artifact.
- The right inspector *does* have section structure in `PlanMetadataPane.tsx`: Summary, Classification, Timeline, Workflow Actions, Notes/Action Composer, Related Artifacts. But `usePlanTracker.tsx` only renders that pane when `selectedPlan && selectedArtifact`.
- The page hides the product shape behind selection state. The semantics exist. The visual declaration does not.

**Scale of rework:** The requirement for persistent pane scaffolding was stated at least six times across a nine-hour working session. The implementation continued to drift toward state-gated visibility.

### AGChain Models

**Backend contract status:** Fully locked. The tools plan defines a scope model, role matrix, pinned tool references, source-kind semantics, route contracts, observability, migration details, and runtime rules with high precision.

**Frontend status:** Officially delayed. The backend is complete and passing. The frontend surfaces are not at parity. The approved plan locked what backend truths must hold but did not lock where the frontend experience lives, how it decomposes, or what user-flow architecture is binding. Post-implementation evaluation discovered that the benchmark tool-bag editor and resolved preview landed in a different file than the plan specified — an undeclared architectural deviation that went undetected because the frontend contract was too loose.

**The gap:** The plan produced a strong backend but treated the frontend as an inventory of components to build, not a structural contract to fulfill. Implementation had enough freedom to "succeed" structurally while drifting in UI architecture. A related AGChain plan (datasets) was stronger on the frontend side — it explicitly named page models, wizard steps, tabs, sample drawer behavior, and polling posture — but even that remained fundamentally an implementation plan, not a frontend design contract. It said what to build without locking the visual structure.

### Index Builder

**Backend contract status:** Strong. The platform API, pipeline orchestration, and data model are well-defined.

**Frontend status:** Attempted approximately five separate times. Each attempt produced partial progress but did not reach a stable, product-specific surface. Yesterday's session finally began producing visible progress, but only after sustained manual direction.

**The gap:** The same pattern: the backend is stable, but the frontend repeatedly stalls because each attempt starts from generic containers and defers product-specific structure until late in the cycle, when rework costs are highest.

---

## In My Own Words: Why This Cannot Continue

These are direct statements I made across the working sessions that produced this report. I include them so the team hears the problem from the person sitting in front of the page, not filtered through a summary.

### On the backend-frontend disparity

> "While we are getting very, very strong backend implementation plans, which become implemented very well, the front end is a different story. The focus is very backend heavy. Front end leaves a lot of questions, and I've been facing a lot of inefficiencies and resource waste because the front end doesn't seem to be working as well."

> "I need to develop a separate skill that becomes a family set that utilizes the approved plan and brings in its own universe of front end requirements and front end techniques to create a proposed implementation for the front end that actually designs all of the pages out properly."

### On the current state of the page

> "What I see is essentially still just shell containers without any material substance. If I told you a completely different functionality was to be integrated and developed into this — everyone would find it plausible. There isn't anything that signals to the viewer of this page, aha, this is going to be something for metadata using MDX editor."

> "Nothing on the right column indicating anything about tags, metadata, approval process, comments — nothing. I understand that backend is needed for elements using platform API and calling the data and fetching it to display. But a button or divider title that is static with no backend implications — why isn't anything like this designed in?"

### On the token and contract foundation

> "It would be counterintuitive and it would be a disservice if we're going to be enforcing contracts when our tokens and contracts are not in order to begin with."

> "The contracts are all over the place. There's no singular thing that's controlling it."

> "Normally, the way I normally like to work is lock the contracts if you're designing a platform, and then you have shell contracts, color tokens, day mode, night mode, and then you have component contracts. But keeping those enforced is a different issue. Over time, drift definitely does occur, and every once in a while, you just kind of have to go back and restructure it again. I think this is one of those times."

### On the sequencing problem

> "We already have defined what the states are going to be. Why then aren't we able to design the expression of that first? I just don't see any reason or rationale because it doesn't impact at all how the backend is implemented since the contracts aren't changing."

> "I am not used to this much gating. A button or divider title that is static with no backend implications — why isn't anything like this designed in? Am I missing something important about how frontend is designed?"

> "I believe it should be frontend until we see visually a page that shows the already defined structural layout while leaving the essence — the data it encapsulates — in a placeheld state so that when the backend comes in, it can do so seamlessly."

### On LLM-assisted implementation

> "Perhaps LLM models have a temporal issue with this ordering, I don't know."

> "Even with all of the safeguards, and articulated language on doing frontend first, there is a clear block caused by something that seems to prevent progress from being made."

### On why this must become permanent

> "This is not me trying to get my way when it doesn't make sense to do it this way. No, I truly believe this is the right complexity to force into implementation early on. Not doing so causes problems — look at our session and this task even."

> "This must not just remain a morale lesson we soon forget, but become something etched into permanency — a skill perhaps created to force implementation of frontend mechanics."

> "The only way to resolve this continued delay, standstill situation is to enforce its implementation contractually."

> "Look at this discussion across the past 9 hours. Read the evolution and the stated requirement articulated over and over, and compare that with what we see on the page even still now. Are you not feeling anything off here?"

### On what I am not asking for

I am not a frontend designer by trade. I am not asking for pixel polish or premature visual refinement. I am asking for **structural specificity** — the product-specific sections, controls, labels, and frames that make the page declare itself as the intended tool. That layer costs nothing in backend terms and prevents the late-stage redesign churn that has now delayed three separate features.

---

## Root Cause Analysis

### What the problem is NOT

- **Not a communication problem.** The requirements were clearly stated, often multiple times in the same session.
- **Not a backend problem.** All three features have locked, auditable backend contracts.
- **Not a skill gap.** The frontend code that does exist is technically competent.
- **Not a tooling problem.** The codebase has existing tokens, components, layout primitives, and editor surfaces ready for reuse.

### What the problem IS

**A missing process gate between plan approval and frontend execution.**

Our implementation plan pipeline (investigating-and-writing-plan, evaluating-plan-before-implementation, executing-approved-plans, evaluating-implemented-plan) produces locked backend contracts with explicit API surfaces, observability rules, database migrations, and acceptance criteria. The frontend section of those same plans lists components to build and pages to modify, but does not lock the visible structural contract with the same rigor.

The result: backend implementers have a locked contract to fulfill. Frontend implementers have a list of things to build and freedom to decide how they visually compose. That freedom consistently produces generic shells that defer product identity.

This is a structural limitation of the plan format itself. The plan's required manifest covers Platform API, Observability, Database Migrations, Edge Functions, and Frontend Surface Area. The first four lock contracts with high precision. The fifth lists component inventories and page modifications — what to build — but not the visible structural contract — what the user sees.

**A sequencing bias in LLM-assisted implementation.**

LLM agents optimize for incremental correctness: make the page compile, gate content on state, show empty states, defer visual specificity until data arrives. This produces progress that is technically valid but product-wise hollow. The bias is toward behavior-first, appearance-later — exactly the wrong order for pages whose product identity must be visible before data populates them.

**A missing reuse-first mechanic.**

The codebase contains tokens (`tailwind.css`, `color-contract.ts`, `font-contract.ts`), shared components (DataTable, PageHeader, EmptyState candidates, Skeleton), layout primitives (AppLayout, Workbench, MdxEditorSurface), and shell infrastructure (TopCommandBar, LeftRailShadcn, RightRailShell). Frontend implementation does not systematically check these assets before writing new markup. A recent foundation audit found 7 Ark UI primitive wrappers using hardcoded hex values that bypass the token system entirely — evidence that even existing shared components are not consistently consuming the design foundation.

---

## What We Have Already Built Toward a Solution

### Frontend Foundation Audit Skill

Completed and tested. Produces a structured, evidence-backed report mapping shell ownership, token sources, component contracts, page patterns, navigation structure, state presentation, and accessibility across any repo. Groups conflicts into discussion-ready bundles with recommendations.

**First real run against our repo found:**
- 6 shell regions (2 ambiguous: secondary rails and content-area layouts)
- 9 token sources (critical drift: 7 UI primitives with hardcoded dark-only hex values)
- 6 conflict bundles (icon library fragmentation, token bypass, data grid duplication, secondary rail fragmentation, empty state fragmentation, AppLayout/AgchainShellLayout overlap)
- 9 clean areas (header, right rail, auth, toast, theme, CSS tokens, admin guards, typography, public shells)

### Frontend Foundation Contract Skill (In Progress)

Fixture designed. The skill will consume the audit report plus resolved conflict-bundle decisions and produce a canonical frontend foundation contract document: shell contract, token/theme spec, component contract index, page pattern reference, navigation contract, state presentation contract, accepted legacy exceptions, and cleanup backlog.

### Implementation Plan Skill Family

Nine skills already in production covering the full plan-investigate-evaluate-execute-review cycle. These handle backend contracts well. They need a frontend-specific companion.

---

## Proposed Solution: Frontend Structural Contract Lock

A new required process gate between plan approval and frontend execution. Not optional. Not advisory. A gate.

### What it enforces

**1. Structure derivation.** Before writing component code, the implementer extracts a visible structure map from the approved plan: pane purposes, section orders, always-visible scaffolds, and conditional content areas.

**2. Reuse-first search.** For every visual element, the implementer checks existing tokens, components, and layout primitives before writing new markup. The skill requires a component reuse map showing what was reused, what was created new, and why.

**3. Persistent scaffold rule.** Pane structure mounts on page load and stays mounted. Empty states live inside the scaffold, never replace it. Selection and data populate the structure; they do not cause it to exist.

**4. Fixture-backed placeholder mode.** The page renders with seeded or placeholder content inside the real product structure before any backend wiring. Not a design mockup — the actual mounted page.

**5. Visual verification via Playwright.** Captures at defined states: no-selection load, selected plan, selected artifact, disabled workflow, populated workflow. These become the regression baseline.

**6. Pre-backend gate.** The page must pass one question before backend wiring proceeds: "If I strip all live data, does this page still unmistakably read as the intended product?" If no, the frontend structural contract is not locked.

**7. Failure rubric.** Concrete rejection criteria:
- A pane's product identity appears only after selection
- Empty states replace entire pane scaffolds
- The center pane does not read as a document workspace on load
- The right pane does not read as an inspector on load
- Tokens or shared components were bypassed without documented justification
- Playwright captures do not show persistent structure at all defined states

### How it integrates with the existing skill family

```
investigating-and-writing-plan
    |
evaluating-plan-before-implementation
    |
[NEW] locking-frontend-structural-contract    <-- the missing gate
    |
executing-approved-plans
    |
evaluating-implemented-plan
```

The new gate consumes the approved plan and produces the frontend structural contract artifact. Execution then has two locked contracts: the backend/system contract from the plan, and the frontend structural contract from this gate.

### Why our environment uniquely supports this

Most teams defer frontend structure because the backend is still vague. That excuse does not apply here. Our implementation plan process already forces clarity around entities, states, transitions, scope boundaries, write/read contracts, and lifecycle rules — all before execution. That means the frontend is not guessing when it renders structure early. It is expressing an already-approved contract. The rigor of our plan-approval pipeline is precisely what gives us permission to force frontend structural specificity early. Without that rigor, early structure would be guesswork. With it, it is discipline.

---

## Impact Assessment

### If we do nothing

- Plan Tracker remains visually generic until manual intervention forces each pane to materialize
- AGChain Models frontend remains delayed with no clear path to parity
- Index Builder continues to require repeated frontend attempts
- Every future feature with a strong backend will face the same frontend lag
- Team velocity stays backend-bound by frontend rework

### If we implement the gate

- Frontend structural specificity is forced early, before backend wiring
- Backend engineers wire into pre-defined visual contracts, reducing integration rework
- Product reviews see real page identity, not generic shells
- LLM-assisted implementation has a concrete structural target instead of freedom to defer
- The three affected features (Plan Tracker, AGChain Models, Index Builder) each get a clear remediation path

---

## Immediate Next Steps

### For team discussion

1. **Review the Plan Tracker evidence.** Open `/app/superuser/plan-tracker` and compare what the page shows on load versus what the approved plan defines. Assess the gap.

2. **Review the foundation audit output.** Read `web/foundation-audit-report/foundation-audit.md`. Identify which conflict bundles need resolution and which clean areas confirm existing strengths.

3. **Decide on the proposed gate.** Is a mandatory frontend structural contract lock the right mechanism? Are there alternative approaches the team prefers?

4. **Prioritize the three affected features.** Which feature benefits most from applying the new process first? Recommendation: Plan Tracker, because its backend contract is fully locked and the frontend gap is most visible.

### For immediate execution (no team decision required)

5. **Resolve the hex bypass conflict bundle.** Replace hardcoded hex values in the 7 Ark UI primitive wrappers with existing token references. Low risk, high impact, no architectural decision needed.

6. **Complete the foundation contract skill.** Fixture is designed. Script, validation, and SKILL.md remain. This unblocks the canonical frontend foundation document.

---

## Appendix: Affected File Inventory

### Plan Tracker
- `web/src/pages/superuser/PlanTracker.tsx`
- `web/src/pages/superuser/usePlanTracker.tsx`
- `web/src/pages/superuser/planTrackerModel.ts`
- `web/src/pages/superuser/PlanStateNavigator.tsx`
- `web/src/pages/superuser/PlanMetadataPane.tsx`
- `web/src/pages/superuser/PlanDocumentPreview.tsx`

### AGChain Models (frontend surfaces)
- `web/src/pages/agchain/` (40 files under AgchainShellLayout)

### Index Builder
- `web/src/pages/IndexBuilderPage.tsx`
- `web/src/components/pipelines/IndexJobsList.tsx`
- `web/src/components/pipelines/IndexJobConfigTab.tsx`
- `web/src/components/pipelines/IndexJobFilesTab.tsx`
- `web/src/components/pipelines/IndexJobRunsTab.tsx`
- `web/src/components/pipelines/IndexBuilderHeader.tsx`

### Foundation (from audit)
- 7 UI primitives with token bypass: `accordion.tsx`, `checkbox.tsx`, `collapsible.tsx`, `combobox.tsx`, `dialog.tsx`, `file-upload.tsx`, `menu.tsx`
- 5 secondary rail components with no shared base
- 2 competing empty state components
- 2 overlapping authenticated shell layouts
