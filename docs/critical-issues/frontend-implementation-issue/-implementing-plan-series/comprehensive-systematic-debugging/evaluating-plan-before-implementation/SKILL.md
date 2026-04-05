---
name: evaluating-plan-before-implementation
description: >
  Use when an implementation plan has been drafted and needs to be assessed before execution begins —
  both for structural completeness (does it satisfy the required plan contract?) and for holistic quality
  (is this actually a good plan?). This is the pre-implementation gate that prevents executing a plan
  that is either structurally incomplete or architecturally unsound. Trigger when the user says things
  like: "review this plan", "is this plan ready", "evaluate my implementation plan", "does this plan
  look right", "should we go ahead with this plan", "is this plan solid", "check this plan before we
  start", or any situation where a drafted plan needs approval before handing it to an implementer.
  Also trigger when a plan has been rejected and revised and needs re-evaluation, or when you suspect
  a plan may be structurally complete but architecturally questionable.
---

# Evaluating a Plan Before Implementation

## Overview

A plan that follows the format can still be a bad plan. A plan with good ideas can still be
structurally incomplete. Both must be assessed before handing work to an implementer.

This skill is the pre-implementation gate. It sits between plan creation and plan execution in the
lifecycle, and it asks two questions in sequence:

1. **Is this plan structurally complete?** Does it contain every required section with the
   specificity the contract demands? This is mechanical — pass or fail.

2. **Is this plan actually good?** Is the architecture sound? Is the API design sensible? Is the
   data model going to hold up? Are there risks nobody acknowledged? This is engineering judgment.

A plan must clear both checks before it's approved for implementation. A structurally incomplete
plan can't be evaluated holistically — it's just missing pieces. A structurally complete plan that
proposes a bad architecture is worse than an incomplete one, because it will be executed faithfully
and produce a well-organized mess.

**Announce at start:** "I'm using the evaluating-plan-before-implementation skill to assess this
plan for both structural completeness and holistic quality before execution."

**REQUIRED READ:** Read this file in full before evaluating any plan.

## When to Use

- A plan has been drafted (by you, another agent, or a human) and needs approval before execution
- A plan was rejected, revised, and needs re-evaluation
- You suspect a plan is structurally complete but architecturally questionable
- You want to catch problems before they become implementation problems
- The user asks whether a plan is ready to hand off to an implementer

## When NOT to Use

- You need to write a plan from scratch — use `investigating-and-writing-plan`
- You need to verify an inherited or stale plan — use `taking-over-investigation-and-plan`
- Implementation is already complete and you need to audit it — use `evaluating-implemented-plan`
- You want a plan-agnostic code review — use `blind-implementation-review`

---

## Phase 1: Structural Audit

This phase is mechanical. Every section either exists with adequate specificity or it doesn't.
The standard is the Required Plan Contract defined in `investigating-and-writing-plan`. A plan
that cannot produce these sections is not ready for implementation.

### 1.1 — Read the plan in full

Read the entire plan before auditing individual sections. You need the full picture to assess
whether sections reference each other consistently.

### 1.2 — Audit the header

The plan must declare:

| Field | Present? | Adequate? |
|-------|:--------:|:---------:|
| Feature name | | |
| Goal (one clear sentence) | | |
| Architecture (key decisions stated) | | |
| Tech stack (concrete, not vague) | | |

**Fail conditions:** Goal is vague or missing. Architecture section is a restatement of the goal
rather than a declaration of structural decisions. Tech stack says "standard stack" instead of
naming specific technologies.

### 1.3 — Audit the manifest

Each manifest section must be present and specific. "Present" means the heading exists.
"Specific" means it contains concrete, implementable declarations — not hand-wavy descriptions.

#### Platform API

| Check | Pass criteria |
|-------|--------------|
| Section exists | Heading present, not empty |
| Endpoints declared | Every new/modified endpoint listed with verb and path |
| New endpoint contracts | Each has: auth requirement, request shape, response shape, touched tables/RPCs |
| Modified endpoint contracts | Each states: what changes and why |
| Zero-case justified | If "No platform API changes," the justification must survive scrutiny — does the feature truly need no new or modified endpoints? |

**Common structural failures:**
- Endpoint listed in the table but no contract below it
- Auth requirement missing or stated as "TBD"
- Request/response shapes described in prose instead of declared concretely
- "Updates the upload endpoint" without saying what changes or why

#### Observability

| Check | Pass criteria |
|-------|--------------|
| Section exists | Heading present, not empty |
| Items declared | Every trace span, metric, and structured log listed |
| Each item has: type, name, emit location, purpose | All four fields present for each item |
| Attribute rules declared | Allowed and forbidden attributes stated |
| Zero-case justified | If "No observability," the justification must explain why the feature's runtime path is already adequately instrumented |

**Common structural failures:**
- "Add tracing" without naming specific spans
- Metrics declared without specifying counter vs histogram
- No attribute rules (allowed/forbidden) stated
- Zero-case accepted without checking whether the feature's runtime path is actually traced

#### Database Migrations

| Check | Pass criteria |
|-------|--------------|
| Section exists | Heading present, not empty |
| Migrations declared | Each with filename, schema effect, and data impact |
| Data impact stated | For each migration: does it affect existing data? How? |
| Zero-case justified | If "No migrations," the feature must truly require no schema changes |

**Common structural failures:**
- Migration listed without a filename
- "Adds a table for X" without specifying columns, types, or constraints
- Data impact not addressed
- Schema changes implied by other sections (e.g., new API endpoint writes to a table) but no migration declared

#### Edge Functions

| Check | Pass criteria |
|-------|--------------|
| Section exists | Heading present, not empty |
| Declaration or explicit zero-case | Either functions are declared with name/action/auth, or "No edge functions" is stated |

#### Frontend Surface Area

| Check | Pass criteria |
|-------|--------------|
| Section exists | Heading present, not empty |
| Counts declared | Exact counts for new/modified pages, components, hooks, services |
| File paths declared | Every new/modified file has an exact path |
| Mount points stated | Where each new component/page appears in the app |
| Zero-case justified | If "No frontend changes," the feature must truly have no UI impact |

**Common structural failures:**
- "Add a new component" without naming the file or stating where it mounts
- Counts missing — no way to verify completeness during implementation
- Modified files listed without saying what changes in each one
- Vague descriptions like "update the dashboard" instead of naming specific files and changes

### 1.4 — Audit higher-rigor sections (when applicable)

If the feature spans multiple layers, migrates an existing flow, preserves a compatibility seam,
or crosses user/admin boundaries, these sections are not optional:

| Section | Required when |
|---------|--------------|
| Pre-implementation contract | Always for multi-system work |
| Locked product decisions | Feature has architectural choices that could drift |
| Locked acceptance contract | Feature has user-visible end-to-end flow |
| Locked platform API surface | Multiple endpoints or user/admin boundaries |
| Locked observability surface | Observability is material to the feature |
| Locked inventory counts | Count drift would indicate scope drift |
| Locked file inventory | File-level drift would signal missing work |
| Frozen seam contract | Feature preserves or migrates a compatibility-sensitive path |
| Explicit risks | Feature has known tradeoffs or accepted limitations |
| Completion criteria | Always |

For each applicable section, check:
- Is it present?
- Is it specific enough to be verifiable after implementation?
- Does it reference concrete artifacts (files, endpoints, conditions), not vague outcomes?

### 1.5 — Audit tasks (if present)

If the plan includes implementation tasks:

| Check | Pass criteria |
|-------|--------------|
| Tasks reference exact file paths | No vague "update the service" |
| Steps are bite-sized (2-5 min each) | Not multi-hour monoliths |
| Test commands are specified | With expected output |
| Commit messages are specified | With conventional format |
| Tasks cover the full manifest | Nothing declared in the manifest is missing from the tasks |

### 1.6 — Cross-reference consistency

This catches the most dangerous structural failures — sections that contradict each other:

- Does every endpoint in the manifest have corresponding tasks?
- Does every migration create tables/columns that the endpoints reference?
- Does every frontend file path reference an API endpoint that exists in the manifest?
- Do inventory counts match the actual items listed?
- Do completion criteria reference things that are actually declared in the manifest?

**A plan where the API section says one thing and the frontend section assumes another is
structurally unsound even if both sections individually look fine.**

### 1.7 — Produce the structural verdict

| Verdict | Meaning |
|---------|---------|
| **Structurally Complete** | All required sections present, all with adequate specificity, cross-references consistent |
| **Structurally Complete With Gaps** | All sections present, but some have minor specificity issues that won't block implementation (e.g., a helper function not named yet) |
| **Structurally Incomplete** | Required sections missing or too vague to implement against. List every deficiency. |

**A plan that is Structurally Incomplete cannot proceed to Phase 2.** The structural gaps must
be addressed first — there's no point evaluating the quality of an architecture you can't fully see.

---

## Phase 2: Quality Assessment

This phase is engineering judgment. The plan is structurally complete — now the question is
whether it's actually good. A plan can satisfy every structural requirement and still propose
the wrong architecture, the wrong API design, or the wrong data model.

The evaluator must think like a senior engineer reviewing an architecture proposal, not an
auditor checking boxes.

### 2.1 — Architecture assessment

Read the plan's architecture declaration and the full manifest together. Ask:

- **Is this the right approach?** Given what the feature needs to accomplish, is the proposed
  architecture the simplest solution that works? Or is it overengineered? Or underengineered?
- **Are there simpler alternatives?** Could this be done with fewer endpoints, fewer migrations,
  fewer components? Is the plan building infrastructure that the feature doesn't actually need?
- **Does it fit the existing system?** Is the proposed architecture consistent with how the rest
  of the app works? Or does it introduce a "second way" of doing something that already has an
  established pattern?
- **Will it hold up?** Not at infinite scale — at the scale this project will actually reach in
  the next 6-12 months. Are there obvious bottlenecks or design decisions that will require
  rework soon?
- **Is the scope right?** Is the plan trying to do too much in one pass? Or too little, leaving
  critical pieces for "later" without a plan for later?

### 2.2 — API design assessment

For each declared endpoint:

- **Is the resource model right?** Are the endpoints organized around the right entities? Or are
  they awkwardly shaped — an endpoint that does too many things, or endpoints that split a
  natural operation into unnecessary pieces?
- **Are verbs correct?** GET for reads, POST for creates, PATCH/PUT for updates, DELETE for
  deletes. An endpoint that modifies data on GET is a design error.
- **Is the naming consistent?** Do paths follow the same conventions as existing endpoints?
  Plural nouns, consistent nesting, predictable structure?
- **Are request/response shapes clean?** Are they asking for the minimum necessary input? Are
  they returning useful, consistent responses? Or are there fields that seem unnecessary,
  redundant, or confusingly named?
- **Is auth appropriate?** Not just "is auth present" (that's Phase 1) but "is the auth
  boundary in the right place"? Could this endpoint's auth be more granular? Is it overly
  permissive?

### 2.3 — Data model assessment

For each declared migration:

- **Is the schema design sound?** Are tables normalized appropriately? Are column types right
  for their data? Are constraints present where they should be (NOT NULL, UNIQUE, FK, CHECK)?
- **Will it perform?** Are indexes declared for columns that will be queried or joined under
  load? Are there obvious query patterns that will be slow against this schema?
- **Is the migration safe?** If this runs against a populated production database, will it
  succeed? Could it lock tables for too long? Could it fail partway and leave the schema in
  a broken state?
- **Is the data model extensible?** Not over-engineered for hypothetical futures, but reasonably
  accommodating of likely changes? Or is it so tightly coupled to the current feature that
  any evolution will require another migration?

### 2.4 — Observability assessment

- **Is it useful?** If something goes wrong with this feature in production, would the declared
  traces, metrics, and logs actually help diagnose the problem? Or are they measuring the wrong
  things?
- **Is it complete?** Are there obvious failure modes that won't be visible? Timeouts, partial
  failures, auth rejections, data inconsistencies?
- **Is it proportionate?** Too little observability means debugging blind. Too much means noise.
  Does the declared surface match the feature's operational risk?

### 2.5 — Frontend assessment

- **Is the component decomposition sensible?** Are things split at natural boundaries? Or are
  components too large (doing too much) or too fragmented (unnecessary indirection)?
- **Is the API integration sound?** Does the frontend expect exactly what the backend promises
  to return? Are loading, error, and empty states accounted for?
- **Is the user experience coherent?** Does the flow make sense from a user's perspective? Or
  is it technically correct but awkward to use?

### 2.6 — Risk assessment

- **What could go wrong that the plan doesn't acknowledge?** Every plan has risks. A plan that
  lists none is not risk-free — it's risk-blind.
- **Are the accepted risks actually acceptable?** If the plan lists explicit risks, are they
  reasonable tradeoffs or wishful thinking?
- **Is there a rollback path?** If the implementation goes wrong, can the changes be reverted
  cleanly? Or would a failed deploy leave the system in a state that requires manual recovery?
- **Are there dependency risks?** Does the plan depend on external services, third-party packages,
  or infrastructure that could change, break, or be unavailable?

### 2.7 — Completeness assessment

- **Does the plan account for everything the feature needs?** Not just the happy path — error
  handling, edge cases, cleanup, logging, monitoring.
- **Are there implicit assumptions?** Things the plan takes for granted that may not be true?
  "The table already exists," "the user will always have a project," "this endpoint will be fast."
- **Is the acceptance contract actually testable?** Can you walk through the declared completion
  criteria and verify each one concretely? Or are some criteria vague enough to be declared
  complete without really proving anything?

---

## Phase 3: Produce the Evaluation

### Required Output Sections

#### Plan Reviewed

State the plan path and a one-sentence summary of what it proposes.

#### Structural Verdict

One of: **Structurally Complete** / **Structurally Complete With Gaps** / **Structurally Incomplete**

If incomplete, list every deficiency:

```markdown
### Structural Deficiencies

1. **Observability section missing attribute rules** — allowed/forbidden attributes not declared
2. **Frontend inventory counts missing** — new components listed but count not stated
3. **Cross-reference inconsistency** — `POST /storage/uploads` references `storage_reservations`
   table, but no migration creates this table
```

#### Quality Findings

Organized by severity, same pattern as blind-implementation-review:

**Critical** — Plan should not be executed until these are resolved:
- Architectural choices that will cause significant rework
- Data model designs that are incorrect or unsafe for production
- Missing sections that hide important scope
- Security boundaries in the wrong place
- Cross-section contradictions that would cause implementation failures

**Significant** — Plan should be improved, creates real risk if executed as-is:
- API design that works but is awkward or inconsistent
- Missing error handling or edge case coverage
- Observability that exists but measures the wrong things
- Scope that's larger or smaller than it should be
- Risks that exist but aren't acknowledged

**Minor** — Worth improving but not blocking:
- Naming inconsistencies
- Tasks that could be more granular
- Documentation gaps
- Minor style or convention divergences

**Observations** — Not problems, but worth the plan author knowing:
- Alternative approaches the evaluator considered
- Future concerns that aren't blocking but should be on the radar
- Patterns in the plan that suggest the author may have been uncertain about a decision

#### Alternative Approaches (when applicable)

If the evaluator identified a meaningfully different approach that could be better, describe it
briefly. This isn't about second-guessing every choice — it's about catching cases where the plan
went down a clearly suboptimal path.

Only include this section if the alternative is substantially different and defensibly better, not
just a stylistic preference.

#### Approval Recommendation

| Recommendation | When |
|----------------|------|
| **Approve** | Structurally complete, no critical or significant quality findings |
| **Approve With Notes** | Structurally complete, no critical findings, significant findings are noted but acceptable given constraints |
| **Revise — Structural** | Structurally incomplete — must add missing sections before re-evaluation |
| **Revise — Quality** | Structurally complete but critical quality findings — must address architecture, design, or risk issues |
| **Revise — Both** | Structural gaps AND quality concerns |
| **Rethink** | Fundamental approach is wrong — plan needs to be reconsidered from the architecture level, not patched |

End with a 2-3 sentence summary of the evaluator's overall impression.

---

## Execution Notes

- **Phase 1 gates Phase 2.** Don't evaluate the quality of an architecture you can't fully see.
  If the plan is structurally incomplete, say so and stop. The author fixes the structure, then
  you evaluate quality on the complete plan.
- **Be concrete.** "The API design could be better" is useless. "The `POST /uploads` endpoint
  accepts both `source_type` and `storage_kind` which appear to serve the same purpose — this
  should be one field" is actionable.
- **Don't rewrite the plan in the evaluation.** The evaluator's job is to identify what's wrong
  and why. The plan author's job is to fix it. If you find yourself drafting replacement sections,
  stop — you've crossed from evaluator to author.
- **Evaluate the plan that exists, not the plan you would have written.** Different engineers
  make different choices. A legitimate alternative approach is not a finding unless it's
  *substantially* better.
- **The plan's internal consistency matters as much as any single section.** A plan where the
  API, migrations, and frontend all tell the same story is more trustworthy than one where
  each section seems to have been written independently.
- **Acknowledge what the plan does well.** If the architecture is sound, say so. If the data
  model is well-designed, say so. The evaluator's job is accurate assessment, not just
  fault-finding.

## What This Catches

- Plans that follow the format perfectly but propose the wrong architecture
- Plans with structural gaps that would cause implementation confusion
- Plans where sections contradict each other
- Plans with unacknowledged risks that will surface during implementation
- Plans that overbuild or underbuild for the actual need
- API designs that are technically functional but poorly organized
- Data models that will need rework at moderate scale
- Observability that checks a box without actually being useful
- Acceptance criteria that are too vague to verify

## What This Does NOT Do

- This is not a plan rewrite. Evaluation produces findings; the author produces revisions.
- This is not implementation verification. For that, use `evaluating-implemented-plan`.
- This is not debugging. If the feature is already built and broken, use
  `comprehensive-systematic-debugging`.

## Skill Family

| Skill | Timing | Purpose |
|-------|--------|---------|
| `investigating-and-writing-plan` | Before build | Create and lock the plan contract |
| `taking-over-investigation-and-plan` | Handoff/recovery | Verify and re-lock an inherited plan |
| **`evaluating-plan-before-implementation`** | **Before execution** | **Assess whether the plan is complete and good** |
| `executing-plans` | During build | Follow the approved plan |
| `evaluating-implemented-plan` | After build | Audit implementation against the approved plan |
| `blind-implementation-review` | After build | Plan-agnostic independent assessment |
| `comprehensive-systematic-debugging` | After failure | Find root cause including plan-reality divergence |
