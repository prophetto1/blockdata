# Implementation Plan Drafting Standard (Upgraded)

## Purpose

This document upgrades the earlier model-plan analysis into an execution-grade drafting standard for implementation plans.

It is not just a description of what the best plans tend to do.

It is a rule set for writing plans that are safe to execute.

The target outcome is simple:

an implementer should be able to execute the plan without inventing product behavior, backend seams, observability rules, persistence behavior, frontend behavior, or proof standards during implementation.

---

# 1. Core Principle

A strong implementation plan removes discretion from the seams that matter.

The plan must freeze, before implementation begins:

1. the tranche being shipped
2. the product behavior being claimed
3. the backend surface that owns that behavior
4. the observability surface that proves that behavior
5. the persistence surface that stores that behavior
6. the frontend surface that exposes that behavior
7. the acceptance contract that determines whether the work is actually done
8. the write set that bounds how much code is allowed to move

If any of those remain implicit, then the implementer is still designing the product during execution.

That is plan failure.

---

# 2. Non-Negotiable Planning Rules

## Rule 1: Backend ownership must exist before frontend progress counts

A route, page, workbench, shell section, card, tab, or placeholder does not count as implementation progress unless the owned backend seam for that behavior is explicitly declared in the same plan.

Do not allow:

1. shell pages presented as capability
2. placeholder rails presented as progress
3. frontend forms without backend contract ownership
4. UI-only "readiness" or "management" surfaces that do not own a real control-plane seam

### Required drafting behavior

For every user-visible behavior in scope, the plan must say one of these explicitly:

1. this behavior is backed by a new backend seam
2. this behavior is backed by a modified existing backend seam
3. this behavior reuses an existing backend seam unchanged
4. this behavior is intentionally out of scope and must remain visibly unavailable

---

## Rule 2: API scope must be minimal, complete, and honest

Appropriate API scope does **not** mean many endpoints.

It means the smallest complete backend surface that fully owns the in-scope behavior.

The plan must refuse adjacent routes that only exist to make the frontend feel more complete.

### Required drafting behavior

The plan must explicitly separate:

1. new endpoints
2. modified endpoints
3. reused endpoints
4. route families explicitly out of scope

### Forbidden drafting behavior

Do not allow:

1. generic route lists without field-level payloads
2. one-word response contracts such as `item`, `check`, `result`, or `status payload`
3. vague admin or utility endpoints when the real product seam is known
4. implied endpoint families that exist only because the frontend would like them to exist

---

## Rule 3: Observability is part of the product contract

If runtime behavior changes, the observability contract must be planned at the same time.

A feature is not fully planned until the plan explains how operators will observe it and how the team will prove it works.

### Required drafting behavior

For each new or materially changed backend seam, the plan must freeze:

1. trace spans
2. counters
3. histograms when timing matters
4. structured logs when audit or failure explanation matters
5. emit locations
6. purpose of each signal
7. redaction and attribute rules where sensitive material exists

### Critical distinction

Instrumentation presence is not proof.

The plan must distinguish:

1. config present
2. instrumentation present
3. export path working
4. proof path verified

A plan that treats config-only telemetry as operational proof is deficient.

---

## Rule 4: Migrations are contracts, not filenames

A migration section is not complete because it names a `.sql` file.

It is complete only when it explains the persistence contract clearly enough that schema, policy, and data impact are not being improvised during implementation.

### Required drafting behavior for new persistence seams

The plan must specify:

1. created or altered tables
2. columns and defaults
3. primary keys
4. foreign keys
5. unique constraints
6. enum or check constraints
7. named indexes when important
8. RLS posture
9. grants or access posture
10. existing-data impact
11. migration ordering or dependency rules

### Required drafting behavior for integration changes

The plan may be lighter than full schema depth, but it still must say:

1. what is altered
2. whether existing data is rewritten, backfilled, or preserved
3. whether access-control posture changes
4. whether compatibility seams remain intact

---

## Rule 5: Frontend contract must be frozen at product level, not just file level

A frontend section is weak if it only says "update the page" or lists files.

A real frontend contract freezes:

1. surface inventory
2. type shape
3. layout contract
4. interaction contract
5. unavailable states where backend support does not yet exist

### Required drafting behavior

The plan must state, when relevant:

1. count of new pages
2. count of modified pages
3. count of new components
4. count of new hooks
5. count of new libs or services
6. plan-level frontend types for important response shapes
7. layout shape such as table-first, inspector, two-column, workbench, drill page, or rail
8. what controls are visible
9. what is editable
10. refresh or polling behavior
11. what the user sees when support is not yet real

### Forbidden drafting behavior

Do not allow:

1. placeholder child pages treated as progress
2. frontend routes mounted before the backend contract exists
3. page chrome or breadcrumbs counted as product completion
4. layout ownership that contradicts the product seam

---

## Rule 6: Acceptance must describe completed behavior, not touched files

A plan is not implementation-ready if the acceptance section says only that routes were added, tests were written, or files were modified.

Acceptance must describe the real completed behavior.

### Required drafting behavior

Acceptance must answer:

1. what the user can now do end-to-end
2. what an operator can now verify
3. what no longer appears falsely implemented
4. what evidence proves the behavior is real

### Required proof style

Acceptance should prefer:

1. end-to-end behavior statements
2. runtime truth statements
3. proof-path statements
4. explicit non-goals that remain unavailable

---

## Rule 7: The plan must bound the write set

A plan must say how much code is allowed to move.

This is how the plan prevents implementation drift.

### Required drafting behavior

The plan must freeze:

1. inventory counts
2. exact new files where possible
3. exact modified files where possible
4. route modules touched
5. migration count
6. frontend surface counts
7. zero-case declarations where a surface must remain unchanged

If implementation later requires new files, new routes, or extra migrations outside the locked inventory, the plan must be revised first.

---

## Rule 8: Plan type must be explicit

Not every strong plan looks the same.

But every strong plan says what kind of plan it is.

### Valid plan types

1. feature-build plan
2. integration plan
3. contract-centralization plan
4. correction / decontamination plan
5. rollout / proof plan
6. placement / composition fix plan

The drafting depth must match the plan type.

A rollout plan should not quietly become a runtime redesign.

A correction plan should not quietly become an unrelated feature build.

A placement fix should not invent backend work unless the layout defect actually requires it.

---

# 3. Implementation Plan Skeleton (Required)

Every execution-authoritative implementation plan should include these sections, unless a section is explicitly zero.

## Required top-level skeleton

1. `Goal`
2. `Architecture`
3. `Tech Stack`
4. `Plan Type`
5. `Status`
6. `Manifest`
7. `Platform API`
8. `Observability`
9. `Database Migrations`
10. `Edge Functions`
11. `Frontend Surface Area`
12. `Pre-Implementation Contract`
13. `Locked Product Decisions`
14. `Locked Acceptance Contract`
15. `Locked Platform API Surface`
16. `Locked Observability Surface`
17. `Locked Migration / Data Contract`
18. `Locked Frontend Contract`
19. `Locked Inventory Counts`
20. `Locked File Inventory`
21. `Execution Tasks`
22. `Verification Commands`
23. `Completion Criteria`
24. `Risks And Stop Conditions`

If a section is intentionally empty, the plan must say so directly.

Example:

* `Database Migrations: None.`
* `Edge Functions: None.`
* `Frontend Surface Area: Zero user-facing changes in this tranche.`

---

# 4. Plan-Type Rules

## A. Feature-Build Plan

Use when the tranche creates a new owned product surface.

### Must include

1. full endpoint contracts
2. observability per seam
3. migration contract
4. frontend inventory and interaction contract
5. bounded acceptance showing real user-visible completion

### Typical red flags

1. endpoints named but not contracted
2. UI described before backend ownership
3. data model implied but not drafted
4. observability delayed to "later"

---

## B. Integration Plan

Use when the work connects already-existing surfaces into one complete flow.

### Must include

1. reused vs modified vs new seam separation
2. compatibility seam handling
3. data-impact language for existing flows
4. end-to-end acceptance criteria
5. explicit refusal to duplicate already-owned control planes

### Typical red flags

1. second API surface added for convenience
2. browser taking over backend-owned bridging work
3. existing compatibility seam silently replaced
4. migration impact hand-waved because the tables already exist

---

## C. Contract-Centralization Plan

Use when the work standardizes naming, config, shared helpers, redaction, bootstrap, or policy across already-existing seams.

### Must include

1. zero-case declarations for routes and migrations when applicable
2. contract modules or shared seam ownership
3. explicit freeze on accidental product-scope expansion
4. compatibility behavior
5. proof that downstream work will not need to redesign the standardized seam

### Typical red flags

1. centralization plan quietly adding product behavior
2. vendor-specific coupling leaking into application code
3. "helper" abstractions with unclear ownership
4. no stop condition when zero-case assumptions break

---

## D. Correction / Decontamination Plan

Use when recent work is misleading, architecturally wrong, or contaminated by false completion signals.

### Must include

1. exact failure pattern definition
2. exact contaminated surfaces
3. exact invalidated or superseded plans
4. exact corrective seams
5. explicit standard for what now counts as proof
6. explicit ban on extending contaminated assumptions

### Typical red flags

1. correction plan that merely adds more code on top of the broken shape
2. placeholder surfaces left exposed during correction
3. tests counted as proof when they do not verify the intended runtime truth
4. vague language such as "clean this up" or "improve the design"

---

## E. Rollout / Proof Plan

Use when runtime code is already landed and the tranche is deployment, enablement, or live verification.

### Must include

1. explicit statement that endpoint shapes do or do not change
2. exact live proof path
3. deploy or runtime environment contract
4. exact commands or UI verification path
5. exact evidence expected
6. stop condition if rollout unexpectedly requires new code

### Typical red flags

1. proof plan quietly reopens runtime design
2. new telemetry names invented during rollout
3. "verified" claims with no stated proof surface
4. configuration presence treated as equivalent to exported proof

---

# 5. Drafting Standard For Platform API Sections

## Required manifest format

Every endpoint family should first appear in a summary table with:

1. verb
2. path
3. action
4. status (`new`, `modified`, `existing`, `verification only`, or similar)

Then each new or materially modified endpoint must get a full contract.

## Required endpoint contract format

For each new or modified endpoint, draft:

1. auth seam
2. request body
3. query params
4. path params
5. full field-level response shape
6. touched tables and services
7. behavior rules
8. important validation rules
9. ownership rules
10. whether it is new, modified, or reused

## Example standard

```md
`GET /feature/{id}`

- Auth: `require_user_auth`
- Request:
  - path param `id`
  - query param `include_history` optional boolean
- Response `200`:
  - `feature_id: string`
  - `status: 'draft' | 'running' | 'failed' | 'complete'`
  - `updated_at: string`
  - `history: Array<{ run_id: string; result: 'ok' | 'fail'; created_at: string }>`
- Touches:
  - `public.features`
  - `public.feature_runs`
- Behavior:
  - returns `404` when the row is absent or unauthorized
  - sorts `history` by `created_at DESC`
  - redacts internal failure detail for non-superusers
```

## API drafting bans

Do not write:

1. `Response: check object`
2. `Returns status info`
3. `Used by UI`
4. `Handles admin actions`
5. `Standard CRUD contract`

Those are not contracts.

---

# 6. Drafting Standard For Observability Sections

## Required observability table fields

Each signal should list:

1. type
2. name
3. where it emits
4. purpose

## Required observability rules

The plan must state:

1. whether names are new or reused
2. whether attributes are allowlisted
3. what must never be emitted
4. whether proof requires exporter verification or only local emission verification
5. whether the plan is allowed to add names at all

## Required distinction: plumbing vs proof

The plan must separate:

1. runtime instrumentation
2. exporter configuration
3. sink reachability
4. live signal proof
5. UI proof or query proof when relevant

## Observability drafting bans

Do not write:

1. `add tracing`
2. `instrument key actions`
3. `log errors`
4. `support telemetry`

Those phrases are too vague to control implementation.

---

# 7. Drafting Standard For Migration Sections

## Full schema-contract depth required when:

1. a new table is introduced
2. a new durable runtime seam is introduced
3. ownership rules or access posture materially change

## Must include

1. exact schema objects
2. key columns and defaults
3. ownership or foreign key relationships
4. uniqueness and ordering rules
5. RLS posture and grants
6. data backfill or rewrite effect
7. dependency order

## Integration-depth migration section allowed when:

1. modifying an existing seam without redefining the domain model
2. preserving the current ownership model
3. making additive changes where full schema depth would be redundant

Even then, the plan must still state data impact and access-control effect.

---

# 8. Drafting Standard For Frontend Sections

## Required subsections

### Surface inventory

State counts and files for:

1. new pages
2. modified pages
3. new components
4. modified components
5. new hooks
6. modified hooks
7. new libs/services
8. modified libs/services

### Type contract

Freeze plan-level frontend types when the backend payload is central to the feature.

### Layout contract

State:

1. page shape
2. workbench shape
3. rail or inspector behavior
4. control placement
5. state indicators
6. unavailable states

### Interaction contract

State:

1. default selection behavior
2. row-click behavior
3. edit-save-refresh behavior
4. polling cadence or manual refresh
5. permission-gated controls
6. failure and empty states

## Frontend drafting bans

Do not write:

1. `build a nice UI`
2. `wire to API`
3. `render the returned data`
4. `show the information in the page`

That leaves product behavior unresolved.

---

# 9. Locked Sections Standard

The lock block is what turns a strong draft into execution authority.

## Required locked sections

### Locked Product Decisions

Freeze product-shape questions.

Examples:

1. where the surface lives
2. whether it is global or benchmark-local
3. whether it is a new route or integrated into an existing workspace
4. whether a compatibility redirect exists
5. whether adjacent surfaces remain unavailable

### Locked Acceptance Contract

Freeze what counts as done.

### Locked Platform API Surface

Freeze route families, endpoint counts, and no-extra-route rules.

### Locked Observability Surface

Freeze new vs reused names and no-extra-name rules.

### Locked Migration / Data Contract

Freeze whether schema is changing, how, and with what compatibility posture.

### Locked Frontend Contract

Freeze visible behavior, layout ownership, and unavailable-state handling.

### Locked Inventory Counts

Freeze the number of new and modified assets.

### Locked File Inventory

Freeze the concrete write set.

---

# 10. Evidence Hierarchy For Plans

When a plan claims something is real, the drafting standard should respect this evidence hierarchy:

1. code ownership declared and scoped
2. runtime seam declared
3. observability seam declared
4. migration impact declared
5. verification path declared
6. runtime evidence observed
7. end-to-end behavior proven

Lower levels do not substitute for higher ones.

Examples:

* a passing unit test does not prove live exporter health
* a UI route does not prove backend capability
* a status endpoint does not prove a control plane exists
* configuration presence does not prove operational truth

This hierarchy should be baked into plan language.

---

# 11. Anti-Patterns To Reject During Drafting

Reject a plan when it does any of the following:

1. treats frontend exposure as implementation progress before backend ownership exists
2. inflates route count to make a surface feel complete
3. leaves response contracts vague
4. treats telemetry config as proof
5. describes migrations only by filename
6. leaves compatibility seams implicit
7. uses placeholder pages as evidence of product progress
8. blurs rollout work and implementation work
9. fails to say what is out of scope
10. leaves the write set unbounded
11. allows implementation to add routes, files, or telemetry names opportunistically
12. says a page is "real" when it is only a shell around partial backend work
13. treats snapshot inspection as equivalent to operational control-plane ownership
14. claims completion on the basis of local tests that do not verify the intended runtime truth

---

# 12. Execution Readiness Gate

Before a plan is treated as implementation authority, it should pass this gate.

## Execution-ready questions

1. Is the plan type explicit?
2. Is the tranche honest and bounded?
3. Does every in-scope user-visible behavior have an owned backend seam?
4. Are new and modified endpoints contracted at field level?
5. Is observability locked for every changed backend seam?
6. Are migrations explicit enough for the persistence change?
7. Is frontend behavior frozen at layout and interaction level?
8. Is acceptance written as completed behavior rather than file changes?
9. Is the write set bounded?
10. Could an implementer execute without inventing product behavior during implementation?

If the answer to any of those is no, the plan is not execution-ready.

---

# 13. Recommended Drafting Workflow

## Step 1: Identify the plan type

Do not draft sections until the plan type is known.

## Step 2: Freeze the product thesis

Write `Goal`, `Architecture`, `Tech Stack`, and a blunt statement of what is intentionally not being built.

## Step 3: Draft the manifest early

Summarize API, observability, migrations, edge functions, and frontend surface area before detailed lock sections.

## Step 4: Draft backend contracts before frontend description

Do not let the UI drive invented backend scope.

## Step 5: Draft observability alongside backend seams

Not afterward.

## Step 6: Draft migration impact alongside runtime ownership

Not as a tail section.

## Step 7: Freeze frontend contract only after backend and data contracts are clear

## Step 8: Write the lock sections

This is where ambiguity should die.

## Step 9: Write execution tasks and verification commands

An implementer should not have to invent the work breakdown.

## Step 10: Write explicit stop conditions

If new seams are discovered, revise the plan instead of improvising.

---

# 14. Upgraded Comparison Rubric

Use this rubric when evaluating a draft plan.

## 1. Plan Type Fit

Does the plan clearly fit one valid plan type?

## 2. Tranche Honesty

Does it state what is really being shipped and what is not?

## 3. Backend Ownership

Does every in-scope behavior have an owned backend seam?

## 4. API Contract Depth

Are request and response contracts field-level and executable?

## 5. Observability Contract Depth

Are traces, metrics, logs, emitters, purposes, and redaction rules appropriately frozen?

## 6. Migration Contract Depth

Is persistence ownership and data impact explicit?

## 7. Frontend Contract Depth

Are inventory, data shape, layout, interaction, and unavailable states frozen?

## 8. Lock Discipline

Are the product decisions, API surface, observability surface, migration posture, inventory counts, and file inventory all frozen?

## 9. Proof Standard

Does the plan distinguish implementation, instrumentation, configuration, and real proof?

## 10. Execution Readiness

Could a capable implementer execute this without redesigning the product while coding?

---

# 15. Final Standard

The upgraded standard is this:

A plan is strong when it is honest about the tranche, explicit about backend ownership, explicit about observability proof, explicit about migration impact, explicit about frontend behavior, bounded in write set, and strict enough that implementation becomes compliance with the plan rather than live product design.

The best implementation plan is not the plan with the most words.

It is the plan that leaves the fewest important decisions undecided.
