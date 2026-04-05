# Request for Proposal: Frontend Implementation Pipeline Integration

**Date:** 2026-04-04
**Issued by:** Jon, Project Lead
**Audience:** LLM engineering agent. All referenced skill definitions are included in the package directory.
**Response format:** A deliverables package as specified in Section 6

---

## 1. Background

This organization builds software through a structured implementation plan pipeline. That pipeline — a series of specialized skill tools — governs how work moves from investigation through planning, evaluation, execution, post-implementation audit, and remediation. The pipeline produces locked, auditable contracts for backend systems: API endpoints, observability surfaces, database migrations, and runtime rules. Those contracts are enforced at every gate.

Frontend implementation passes through the same pipeline but receives weaker structural enforcement. The plan lists components and file paths. It does not lock the visible structural contract — what the user sees on page load, what persists without data, what each pane declares itself as, or which existing tokens and components must be consumed.

The result: three active features (Plan Tracker, AGChain Models, Index Builder) have strong backends paired with frontend surfaces that remain generic, state-gated, and structurally incomplete. Frontend iteration consumes 3-5x more cycles than equivalent backend work. The same frontend requirements have been stated six or more times in a single working session without the implementation materializing.

Two companion documents describe this problem in detail:

- **Status Report:** `2026-04-04-frontend-implementation-gap-status-report.md` — evidence from three features, root cause analysis, direct stakeholder statements, and initial solution direction
- **Pipeline Integration Recommended Actions:** `2026-04-04-pipeline-integration-recommended-actions.md` — the current pipeline, proposed new skills, modifications to existing skills, and integration architecture

Both documents are included with this RFP. Read them in full before responding.

---

## 2. Reference Materials

The following skill definitions are included with this RFP. They represent the current implementation plan pipeline and the current design/frontend skill inventory. Read each one to understand the existing workflow, its strengths, and its gaps.

### Implementation Plan Pipeline Skills

Located in `-implementing-plan-series/`:

| Skill | Purpose |
|---|---|
| `investigating-and-writing-plan` | Creates the implementation plan contract. Locks API, observability, database, edge function, and frontend surface area before any code. |
| `evaluating-plan-before-implementation` | Gates plan approval. Checks structural completeness and holistic engineering quality. |
| `executing-approved-plans` | Executes the approved plan as a contract. Tracks manifest compliance throughout. |
| `evaluating-implemented-plan` | Post-implementation compliance audit. Proves delivered code matches the approved contract. |
| `addressing-evaluation-findings` | Processes evaluation findings. Three dispositions: fixed, disagreed-with-evidence, or deferred-with-approval. |
| `blind-implementation-review` | Independent plan-agnostic code assessment. Counterweight to plan-driven evaluation. |
| `comprehensive-systematic-debugging` | Failure analysis engine. Root-cause investigation when defects are found. |
| `taking-over-investigation-and-plan` | Handles inherited, stale, or partially completed plans. Verify-then-salvage-or-rewrite. |
| `verification-before-completion` | Pre-commit gate. Evidence before any success claim. |
| `repo-investigator` | External repository analysis and comparison. |

### Design and Frontend Skills

Located in `-FR-related-inventory/`:

| Skill | Purpose | Status |
|---|---|---|
| `design-1-layouts-spec-with-playwright` | Deterministic Playwright-based viewport measurement of live pages | Complete |
| `design-2-designing-from-layouts` | Converts frozen measurements into page reproduction contracts | Complete |
| `design-3-spec-contract-based-design-audit` | Audits one built page against canonized specs | Complete |
| `design-4-extract-page-spec-contracts` | Extracts one page into a platform design package | Complete |
| `frontend-foundation-audit` | Repo-wide audit of shell, tokens, components, page patterns, state presentation | Complete, tested, first run produced results |
| `writing-frontend-foundation-contract` | Produces canonical frontend foundation contract from resolved audit | Fixture only — sample input JSON included, skill not yet built. The respondent should treat this as a dependency that does not yet exist and design around its absence. |

### Approved Plan Samples

Located in `sample-plans-produced-through-workflow-and-approved/`:

Four real implementation plans that passed through the current pipeline — investigation, multiple revision cycles, evaluation, and approval. Examine these to understand the level of structural specificity the pipeline already enforces for backend contracts. These plans are not loose design briefs or feature descriptions. They are locked contracts with explicit API surfaces, observability rules, database migrations, acceptance criteria, and task-level TDD structure. The frontend sections of these same plans are where the specificity drops. That contrast is the problem this RFP exists to solve.

---

## 3. Problem Statement

### What must be solved

The implementation plan pipeline must produce frontend implementations at the same level of structural specificity and contract compliance it already achieves for backend implementations.

Specifically:

1. **Frontend pages must declare their product identity on load.** A user landing on the page must immediately see the intended product — not generic containers that could hold any feature. Selection and data populate the structure; they do not cause it to exist.

2. **The pipeline must enforce persistent frontend scaffolding before backend wiring.** Pane structures, section headers, field labels, control frames, and product-specific affordances must be visible before any API call, data fetch, or state-dependent behavior is wired.

3. **Existing tokens, components, and design primitives must be consumed systematically.** The codebase already contains CSS custom properties, TypeScript token contracts, shared components, and layout primitives. Frontend implementation must check these assets first, not freestyle HTML/CSS.

4. **Frontend structural compliance must be auditable at the same gates where backend compliance is already audited.** Plan evaluation, execution tracking, and post-implementation audit must include frontend structural fidelity as a first-class dimension.

5. **Backend and frontend implementation must be able to proceed simultaneously.** Our implementation plans lock backend contracts tightly enough that frontend structural work can proceed in parallel — or at minimum, frontend can construct static structure fully while placeholding backend API communication requirements. The solution must exploit this parallelism.

### What must NOT be solved in this RFP

- Pixel-perfect visual design or brand-level aesthetic refinement
- Backend contract changes or API redesign
- New backend services or infrastructure
- Changes to the plan-writing or plan-evaluation contract for backend concerns
- A replacement for the existing pipeline — the solution must integrate into it

---

## 4. Constraints

### Hard constraints

1. **No shortcuts.** We understand the entire workflow. Any shortcut baked into a plan — a deferred scaffold, a "we'll add structure later" note, a placeholder skill that does not enforce its own output — will be identified immediately.

2. **Integrate, do not replace.** The existing implementation plan pipeline works well for backend. The solution adds frontend-specific gates and skills. It does not redesign the pipeline.

3. **Derive, do not invent.** Frontend structural contracts must derive from already-approved implementation plans. The plans already define states, metadata, actions, and section orders. The structural contract extracts those into visual form. It does not add scope.

4. **Reuse first.** Every visual element must trace to an existing token, component, or layout primitive before proposing anything new. The foundation audit identified 9 clean areas (header, right rail, auth, toast, theme, CSS tokens, admin guards, typography, public shells) and 9 token sources. These are the substrate.

5. **Enforceable, not advisory.** The solution must produce gates that reject non-compliant work, not recommendations that can be ignored.

### Soft constraints

6. The new skills should follow the same structural conventions as the existing pipeline skills (SKILL.md format, clear trigger conditions, defined artifacts, red flags, exit criteria).

7. The solution should be repo-agnostic where possible, so the skills can be applied to other projects.

8. Playwright-based visual verification is preferred for scaffold validation, consistent with the existing design-1 skill infrastructure.

---

## 5. Requirements for the Response

The respondent must read all three documents (status report, recommended actions, this RFP) and all included skill definitions before responding.

The response must demonstrate:

1. **Understanding of the existing pipeline.** Identify the implementation plan workflow process and the interrelationship between each skill tool in the series. Show how work flows from investigation through remediation, and where each gate enforces what contract.

2. **Understanding of the gap.** Identify the specific points in the pipeline where frontend structural specificity is lost, and explain why the current skill definitions permit this loss.

3. **Proposed new skills.** For each proposed skill:
   - Name
   - Exact insertion point in the pipeline (between which existing skills)
   - Trigger conditions
   - Required inputs
   - Primary artifact produced
   - Key rules and enforcement mechanisms
   - What it prevents (which failure modes from the status report)
   - Relationship to existing design/frontend reference skills
   - Enough detail that a reader can clearly understand what the skill does and what effects it produces — the skill does not need to be perfectly written, but its purpose, mechanics, and expected impact must be unambiguous

   Each new skill specification should follow SKILL.md format: frontmatter (name, description), trigger, required inputs, primary artifact, key rules, red flags, exit criteria.

   The recommended actions document proposes three new skills. You may propose a different number, different skill boundaries, or a different insertion model. Justify your architecture.

4. **Proposed modifications to existing skills.** For each modification:
   - Which skill
   - What changes
   - Why the change is necessary
   - Impact on existing workflow

5. **Supporting artifacts.** Identify any additional prompts, reference files, templates, intermediate schemas, scripts, or tools that harden the process beyond the skills themselves. These may be:
   - Extracted from existing design/frontend skills
   - Designed new for this solution
   - Adapted from patterns in the existing pipeline

6. **Parallel execution strategy.** Explain how the proposed solution enables frontend and backend implementation to proceed simultaneously once the plan is approved. Address:
   - What frontend work can begin immediately after plan approval
   - What frontend work must wait for backend artifacts
   - How placeholder/static structure bridges the gap
   - How the two tracks reconverge

7. **Token and contract compliance strategy.** Address how the solution handles:
   - Existing CSS custom property tokens
   - Existing TypeScript token contracts (color, font, icon, toolbar)
   - Existing shared components
   - Known drift (the 7 Ark UI primitives with hardcoded hex, the 5 fragmentary secondary rails, the 2 competing empty states)
   - The canonical frontend foundation contract (once produced)

---

## 6. Required Deliverables

The response must include these deliverables:

### Deliverable 1: Pipeline Map

A complete map of the implementation plan pipeline showing:
- Every existing skill and its role
- Every proposed new skill and its insertion point
- Every proposed modification to existing skills
- The flow of artifacts between skills
- Where frontend and backend tracks diverge and reconverge

### Deliverable 2: New Skill Specifications

For each proposed new skill, a specification containing all items listed in Requirement 3.

### Deliverable 3: Existing Skill Modifications

For each proposed modification, a specification containing all items listed in Requirement 4.

### Deliverable 4: Supporting Artifacts Inventory

A list of all additional prompts, reference files, templates, schemas, scripts, or tools proposed, with purpose and relationship to the skills.

### Deliverable 5: Parallel Execution Playbook

A concrete playbook showing how frontend and backend implementation proceed in parallel for a feature whose plan has been approved, including handoff points and reconvergence gates.

### Deliverable 6: Token and Contract Compliance Protocol

A protocol for how frontend implementation consumes existing tokens, components, and design primitives, and how compliance is verified at each gate.

---

## 7. Evaluation Criteria

Responses will be evaluated on:

1. **Completeness.** All six deliverables present and substantive.
2. **Pipeline integration quality.** The solution fits seamlessly into the existing workflow without disrupting backend effectiveness.
3. **Enforcement strength.** The solution produces gates that reject non-compliant work, not suggestions that can be ignored.
4. **Reuse-first discipline.** The solution systematically consumes existing tokens, components, and primitives rather than proposing new ones.
5. **Parallel execution clarity.** The solution enables simultaneous frontend and backend work with clear handoff points.
6. **No shortcuts.** The solution does not defer, simplify, or hand-wave any of the requirements. Every gap identified in the status report has a corresponding enforcement mechanism.