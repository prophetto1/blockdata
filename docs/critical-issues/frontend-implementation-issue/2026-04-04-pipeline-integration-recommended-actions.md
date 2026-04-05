# Recommended Actions: Integrating Frontend Structural Discipline Into the Implementation Plan Pipeline

**Date:** 2026-04-04
**Context:** Companion to `2026-04-04-frontend-implementation-gap-status-report.md`
**Purpose:** Define exactly which new skills to create, where they insert into the existing pipeline, what each one produces, and how they interact with the existing skills and design references

---

## Current Pipeline (Before)

```
investigating-and-writing-plan          [creates the plan contract]
        |
evaluating-plan-before-implementation   [gates structural + quality]
        |
executing-approved-plans                [builds against the contract]
        |
evaluating-implemented-plan             [audits compliance]
        |
addressing-evaluation-findings          [fixes verified findings]
```

**Counterweights (run independently):**
- blind-implementation-review
- comprehensive-systematic-debugging
- verification-before-completion

**Problem:** This pipeline locks backend contracts tightly. Frontend surfaces pass through the same gates but with lower structural specificity. The plan lists components and file paths but does not lock the visible structural contract — what the user sees on load, what persists without data, what each pane declares itself as.

---

## Proposed Pipeline (After)

```
investigating-and-writing-plan          [creates the plan contract]
        |
evaluating-plan-before-implementation   [gates structural + quality]
        |
[NEW] deriving-frontend-structural-contract   [extracts visible structure from approved plan]
        |
[NEW] materializing-frontend-scaffold         [builds persistent page skeleton with placeholders]
        |
[NEW] verifying-frontend-scaffold             [Playwright captures + structural assertions]
        |
executing-approved-plans                [builds behavior + backend wiring against locked structure]
        |
evaluating-implemented-plan             [audits compliance — now includes frontend structural contract]
        |
addressing-evaluation-findings          [fixes verified findings]
```

**Three new skills insert between plan approval and execution.** They form a frontend-specific sub-pipeline that runs after the plan is approved but before backend wiring begins. Each produces a concrete artifact that the next skill consumes.

---

## New Skill 1: deriving-frontend-structural-contract

### Position in pipeline

After `evaluating-plan-before-implementation` approves the plan. Before any frontend code is written.

### Purpose

Extract the visible structural contract from the already-approved implementation plan. This is not a design exercise. The plan already defines states, metadata fields, workflow actions, section orders, and component inventories. This skill forces those definitions to become an explicit visual structure map.

### Trigger

When an approved implementation plan has a frontend surface area section with one or more new or modified pages.

### Required inputs

- The approved implementation plan
- The canonical frontend foundation contract (from `writing-frontend-foundation-contract`), when available
- The repo's existing shell, token, and component assets

### Primary artifact

`frontend-structural-contract.md` containing:

**For each page or major surface in the plan:**

1. **Pane layout map** — what panes exist, their purpose, their position
2. **Persistent scaffold spec** — what is always visible on page load, regardless of data or selection state
3. **Section order** — the exact section sequence in each pane (e.g., right inspector: Summary, Classification, Timeline, Workflow Actions, Notes, Related Artifacts)
4. **Field inventory** — every visible field, label, chip, badge, and control, marked as:
   - always visible (persistent scaffold)
   - visible when populated (conditional content)
   - visible when enabled (state-dependent)
5. **Component reuse map** — for every visual element:
   - existing token used (or "new token needed" with justification)
   - existing component used (or "new component needed" with justification)
   - existing layout primitive used (or "new layout needed" with justification)
6. **Empty/disabled state spec** — what each pane shows when no data, no selection, or no permission. Empty states live *inside* the persistent scaffold, never replace it.
7. **State-to-visibility matrix** — a table mapping each user state (no selection, plan selected, artifact selected, dirty, permission denied) to what is visible, enabled, disabled, or placeholder in each pane.

### Key rules

- **Do not invent.** The structural contract derives from the approved plan's already-locked states, metadata, actions, and section orders. If the plan did not define it, the structural contract cannot add it.
- **Do not defer.** Every pane must have a persistent scaffold spec. "We'll figure out the right pane when data is available" is a rejection.
- **Reuse first.** The component reuse map must check existing tokens, components, and primitives before proposing anything new. Reference the foundation audit and foundation contract when available.
- **The persistent scaffold rule.** Pane structure mounts on page load and stays mounted. Selection and data populate the structure; they do not cause it to exist.

### What this skill does NOT do

- Does not write component code
- Does not produce Figma or design mockups
- Does not touch backend contracts
- Does not redesign the approved plan

### Relationship to existing design skills

This skill is informed by but does not invoke the design-1 through design-4 pipeline. Those skills operate on live pages (measurement, reproduction, audit, extraction). This skill operates on the approved plan before code exists. The design skills become relevant later — design-3 can audit the built page against the structural contract this skill produces.

---

## New Skill 2: materializing-frontend-scaffold

### Position in pipeline

After `deriving-frontend-structural-contract` produces the structural contract. Before `executing-approved-plans`.

### Purpose

Build the actual mounted page with persistent pane scaffolds, placeholder content, and disabled controls — the real page, rendering in the browser, with the product identity visible before any backend wiring.

### Trigger

When a frontend structural contract exists for a page and the page's code needs to be created or modified.

### Required inputs

- The frontend structural contract (from skill 1)
- The approved implementation plan
- The canonical frontend foundation contract (when available)
- The repo's existing shell, token, and component assets

### Primary artifact

The actual page code, rendering in the browser, showing:

- All panes mounted with their persistent scaffold
- Section headers, field labels, control frames visible
- Placeholder values, disabled buttons, empty-state content inside the scaffold
- The page unmistakably reads as the intended product

Plus a short `scaffold-manifest.md` documenting:

- What was built
- What components were reused vs. created
- What tokens were consumed
- What placeholder content was seeded
- What the page looks like at each state (described, not captured — captures come in skill 3)

### Key rules

- **Scaffold first, behavior second.** Mount the visible structure. Do not wire state management, data fetching, or backend integration in this step.
- **The persistent scaffold rule.** (Same as skill 1.) No pane may disappear or become a generic empty container based on state. The scaffold is the invariant frame.
- **Reuse-first enforcement.** Every component choice must trace to the component reuse map from the structural contract. Freestyle HTML/CSS without justification is a rejection.
- **No backend calls.** Placeholder/fixture data only. The page must render without any API, database, or edge function dependency.
- **Token compliance.** All spacing, color, typography, radius, shadow, and z-index values must use existing tokens. Hardcoded values are a rejection unless the structural contract explicitly approved a new token.

### What this skill does NOT do

- Does not wire backend integration
- Does not implement state management or data fetching
- Does not implement workflow actions or transitions
- Does not write tests beyond basic render assertions

### Relationship to existing design skills

The foundation audit and foundation contract provide the token/component/shell substrate. Design-3 (spec-contract-based audit) can later audit this scaffold against the foundation contract. Design-1 (Playwright measurement) can capture the scaffold for baseline measurements.

---

## New Skill 3: verifying-frontend-scaffold

### Position in pipeline

After `materializing-frontend-scaffold`. Before `executing-approved-plans`.

### Purpose

Verify the scaffold against the structural contract using Playwright captures and structural assertions. Produce the visual baseline that all subsequent work must preserve.

### Trigger

After the scaffold is mounted and rendering in the browser.

### Required inputs

- The frontend structural contract (from skill 1)
- The mounted scaffold page (from skill 2)
- A running dev server

### Primary artifact

`scaffold-verification-report.md` containing:

1. **Playwright captures** at each defined state:
   - Page load (no selection, no data)
   - Selected primary item (e.g., selected plan)
   - Selected secondary item (e.g., selected artifact)
   - Disabled/restricted state (e.g., no permission)
2. **Structural assertions** — pass/fail for each:
   - Every pane renders on page load
   - Every section header in each pane is visible on page load
   - Empty states appear inside scaffolds, not in place of them
   - Field labels and control frames are present
   - Token compliance (no hardcoded hex, no freestyle sizing)
3. **Pre-backend gate decision:** "Does this page unmistakably read as the intended product with no live data?" — Yes/No with evidence

### Key rules

- **If the gate fails, execution does not proceed.** The scaffold must pass before backend wiring begins.
- **Captures become the regression baseline.** Later implementation must preserve the scaffold's persistent structure.
- **Structural assertions are testable.** They should be expressible as Playwright selectors or visual comparisons, not subjective judgments.

### Relationship to existing design skills

This skill uses the same Playwright capture infrastructure as design-1 (layouts-spec-with-playwright). It can reuse the measurement scripts. The difference: design-1 measures a live production or dev page after implementation. This skill captures the scaffold before backend wiring, establishing the baseline that design-1 can later measure.

---

## Modifications to Existing Skills

### investigating-and-writing-plan

**Current state:** The Frontend Surface Area section requires counts and file paths but does not require visible structural specificity.

**Recommended change:** Add a new required subsection to the Frontend Surface Area section:

> **Frontend Structural Intent**
>
> For each new or significantly modified page, declare:
> - Pane layout (what columns/regions exist)
> - Persistent scaffold expectation (what is always visible on load)
> - Section order in each pane
> - Key controls and field groups
>
> This section does not need to be exhaustive — the full structural contract is derived in a separate skill after plan approval. But the plan must declare enough structural intent that the structural contract derivation is a mechanical extraction, not a creative exercise.

**Impact:** Minimal. Adds 5-10 lines per page to the plan. Does not change the plan's scope, backend contracts, or approval criteria.

### evaluating-plan-before-implementation

**Current state:** Checks frontend for component decomposition, API integration, and user experience coherence. Does not check for structural intent.

**Recommended change:** Add one evaluation criterion to the frontend quality assessment:

> Does the plan declare enough frontend structural intent (pane layout, persistent scaffolds, section orders) that the structural contract derivation step can proceed mechanically? If the frontend section is purely an inventory of components and file paths with no visible structure declared, flag this as a quality finding.

**Impact:** Minimal. One additional check in the existing evaluation rubric.

### executing-approved-plans

**Current state:** Tracks manifest compliance for API endpoints, observability, migrations, and frontend counts.

**Recommended change:** Add the frontend structural contract as an additional tracked artifact:

> If a frontend structural contract exists for this plan, the Contract Tracking Ledger must include:
> - Scaffold verification: passed / not yet verified
> - Persistent scaffold preservation: no regressions from baseline captures
> - Component reuse compliance: matches the structural contract's reuse map
>
> Any execution step that removes a persistent scaffold element or replaces a pane with a full-pane empty state is a **plan-update-required** drift event.

**Impact:** Moderate. Adds a new tracking dimension. Does not change execution flow.

### evaluating-implemented-plan

**Current state:** Audits compliance against the approved plan contract. Checks frontend counts, file paths, and acceptance criteria.

**Recommended change:** When a frontend structural contract exists, add a dedicated audit section:

> **Frontend Structural Contract Compliance**
>
> For each page with a structural contract:
> - Does the persistent scaffold still render on page load?
> - Do all section headers, field labels, and control frames remain visible?
> - Do empty states live inside scaffolds, not in place of them?
> - Does the Playwright baseline still pass?
> - Were any components from the reuse map replaced with freestyle alternatives?
>
> A persistent scaffold element that was removed or replaced with a generic empty container during backend wiring is a **Critical Deviation**.

**Impact:** Moderate. Adds structural compliance to the existing audit rubric.

---

## How the Design Skills Serve as References

The existing design skills (design-1 through design-4) and the foundation skills (frontend-foundation-audit, writing-frontend-foundation-contract) are not directly integrated into the new pipeline gate. They serve as references and infrastructure:

| Existing Skill | Role in the New Pipeline |
|---|---|
| **frontend-foundation-audit** | Produces the repo-wide foundation audit that informs the canonical contract. Run periodically, not per-plan. |
| **writing-frontend-foundation-contract** | Produces the canonical token/component/shell/pattern contract that the structural contract derivation skill references for reuse-first decisions. Run once, updated when audit reveals new drift. |
| **design-1 (layouts-spec-with-playwright)** | Provides Playwright capture infrastructure reused by `verifying-frontend-scaffold`. Also used post-implementation for measurement passes. |
| **design-2 (designing-from-layouts)** | Reference for how to convert measurements into reproduction contracts. Informs the structural contract format. |
| **design-3 (spec-contract-based-design-audit)** | Can audit built pages against the foundation contract after implementation. Complementary to, not replaced by, the new scaffold verification. |
| **design-4 (extract-page-spec-contracts)** | Can extract design packages from completed pages for cross-platform reuse. Runs after implementation, not during. |

---

## Implementation Priority

### Phase 1: Build the three new skills

1. **deriving-frontend-structural-contract** — highest priority. This is the skill that forces structural specificity. Without it, the other two have nothing to build from.
2. **materializing-frontend-scaffold** — second priority. This is the skill that forces the code to exist as a persistent scaffold before backend wiring.
3. **verifying-frontend-scaffold** — third priority. This is the gate that proves the scaffold passes.

### Phase 2: Modify existing skills

4. Add Frontend Structural Intent subsection to `investigating-and-writing-plan`
5. Add structural intent check to `evaluating-plan-before-implementation`
6. Add structural contract tracking to `executing-approved-plans`
7. Add structural compliance audit to `evaluating-implemented-plan`

### Phase 3: Apply to affected features

8. Apply the new pipeline to Plan Tracker (most locked backend, most visible gap)
9. Apply to Index Builder (recent progress, needs structural lock)
10. Apply to AGChain Models (largest surface, longest delay)

---

## Success Criteria

The pipeline integration is successful when:

1. Every approved plan with frontend surface area produces a frontend structural contract before execution begins
2. Every page with a structural contract renders its persistent scaffold in the browser before backend wiring
3. Playwright captures at the scaffold stage show a page that unmistakably reads as the intended product
4. Backend wiring fills the scaffold without removing or replacing persistent structure
5. Post-implementation evaluation includes structural contract compliance as a first-class audit dimension
6. The three currently affected features (Plan Tracker, AGChain Models, Index Builder) each reach frontend parity through this process

---

## Appendix: What Each New Skill Prevents

| Failure Mode | Which New Skill Prevents It |
|---|---|
| Page is a generic shell until data arrives | `deriving-frontend-structural-contract` (locks the visible structure) + `materializing-frontend-scaffold` (builds the persistent scaffold) |
| Pane disappears or becomes "No data" on load | `materializing-frontend-scaffold` (persistent scaffold rule) + `verifying-frontend-scaffold` (assertion failures) |
| Freestyle HTML/CSS bypasses existing tokens | `deriving-frontend-structural-contract` (component reuse map) + `materializing-frontend-scaffold` (reuse-first enforcement) |
| Frontend drifts during backend wiring | `executing-approved-plans` modification (scaffold preservation tracking) |
| Post-implementation page loses scaffold | `evaluating-implemented-plan` modification (structural compliance audit) |
| Plan approves with no structural intent | `investigating-and-writing-plan` modification (structural intent subsection) + `evaluating-plan-before-implementation` modification (structural intent check) |
| Same requirement stated 6 times without materializing | The entire sub-pipeline. The requirement becomes a contractual gate, not a preference. |
