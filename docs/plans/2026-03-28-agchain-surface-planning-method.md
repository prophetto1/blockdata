# AGChain Surface Planning Method

**Goal:** Define a repeatable method for turning Braintrust-inspired product surfaces into low-level AGChain implementation design plans without collapsing AGChain semantics into Braintrust or Inspect.

**Architecture:** Use Braintrust as the default frontend/product reference when the object and workflow align, use Inspect as the default execution/runtime substrate when the capability already exists there, and keep AGChain as the semantic authority where benchmark/runtime behavior materially differs. When a planned change has frontend ramifications but the backend/control-plane seam is already locked or intentionally unchanged, frontend shape and visual verification must be designed first rather than treated as the last implementation pass.

**Tech Stack:** React + TypeScript frontend surfaces under `web/src`, FastAPI + Supabase control plane under `services/platform-api`, benchmark/runtime owners under `_agchain`, Inspect docs/runtime patterns as substrate references, Braintrust docs/screens as product-facing reference.

## Governing Rule

For each functionality, decide in this order:

1. Does Inspect already provide the underlying capability?
2. Does Braintrust expose a mature product-facing surface for essentially the same object/workflow?
3. If yes to both, borrow the Braintrust frontend pattern and back it with an Inspect-shaped implementation.
4. If Braintrust's UI is visually useful but semantically weaker than AGChain needs, borrow layout and interaction density only.
5. If AGChain semantics are materially different, AGChain owns the feature contract and Braintrust is reference-only.

## What Gets Planned

Do not write one giant cross-surface implementation plan.

Write one plan per surface family:

- `Settings shell`
- `Overview`
- `Datasets`
- `Prompts`
- `Scorers`
- `Parameters`
- `Tools`

## Three-Step Planning Flow

### 1. Surface Qualification

Before writing an implementation plan, classify the surface:

- `Exact borrow`
  - Braintrust object/workflow matches the AGChain target closely enough to copy the page structure almost directly.
- `Visual borrow only`
  - Braintrust layout and interaction model are useful, but AGChain semantics differ.
- `AGChain-owned`
  - Braintrust is not a good semantic reference; use only as loose design inspiration.

Each qualification pass must answer:

- What is the Braintrust page or pattern reference?
- What Inspect capability or object backs it?
- What AGChain-owned semantic differences must remain?
- What existing AGChain routes/pages/tables already exist?
- What visible correctness can be confirmed in the browser?

### 2. Surface Design Spec

After qualification, write a low-level design spec for that one surface.

Required sections:

- Feature name
- Goal
- Braintrust reference and borrow level
- Inspect substrate dependency
- AGChain-owned deviations
- Information architecture
- Page layout contract
- Component inventory
- State matrix
  - loading
  - empty
  - populated
  - error
  - selected-row or detail state
- Data contract
  - objects shown
  - filters
  - drilldown rules
  - actions
- Backend/control-plane dependencies
- Verification contract
  - exact screenshots/states to confirm visually

### 3. Execution-Ready Implementation Plan

Only after the design spec is accepted should you write the execution-ready plan.

That plan must follow the full repo plan contract:

- platform API manifest
- observability surface
- migrations
- frontend file inventory and counts
- locked decisions
- locked acceptance contract
- risks
- completion criteria
- bite-sized tasks

If the plan changes or adds frontend pages, shell states, or visible interaction surfaces, the execution-ready plan must also make the frontend shape explicit enough for visual approval before deeper implementation proceeds.

Required additions for frontend-bearing plans:

- locked frontend design contract
  - shell ownership
  - page/frame hierarchy
  - visible scope labeling
  - empty/loading/populated/error states
  - static copy or placeholder contract where backend seams are unchanged
- frontend-first verification gate
  - a task near the start of the plan that renders the intended shell/page shape
  - a manual or browser-driven visual verification step that the user can approve
  - explicit statement of whether backend changes are locked, deferred, or unnecessary

Do not write frontend-bearing plans where backend detail is precise but frontend shape is left to implementation judgment. If backend is unchanged, say so plainly and design the frontend first.

## Current Recommended Order

Use two sequences:

### Design-order sequence

This is optimized for visual confirmation and shell coherence:

1. `Settings shell`
2. `Overview`
3. `Datasets`
4. `Prompts`
5. `Scorers`
6. `Parameters`
7. `Tools`

### Execution-order sequence

This is optimized for object spine and backend leverage when backend/control-plane work is genuinely the moving constraint:

1. `Datasets`
2. `Overview`
3. `Prompts`
4. `Scorers`
5. `Parameters`
6. `Tools`
7. `Settings shell` refinements

### Frontend-first override

Use this override whenever the backend/control-plane seam is already locked, already implemented, or intentionally unchanged:

1. Lock shell/page design and visible states first.
2. Get visual confirmation on the intended frontend shape.
3. Only then wire the frontend to the already-locked backend seam or confirm that no backend change is needed.

For this project, frontend-bearing plans should default to this override unless the plan proves that backend uncertainty is the real blocker.

## Borrowability Guidance For Current Surfaces

### Exact or near-exact borrow candidates

- `Overview`
- `Datasets`
- `Prompts`
- `Settings shell`

### Visual borrow only

- `Scorers`
- `Parameters`
- `Tools`

These three should not be copied semantically without adjustment because AGChain benchmark/runtime semantics are richer than Braintrust's exposed model in those areas.

## Anti-Patterns

Do not:

- write combined plans that mix dataset registry, sandbox runtime, and multiple page families
- let Braintrust define runtime semantics
- let Inspect define product UX
- choose AGChain-owned implementations before proving that direct use or composition around Inspect is insufficient
- write plans that skip visible verification states
- treat frontend shape as something to improvise after backend details are already locked

## Working Rule For This Project

Use this sentence as the planning test:

`Braintrust for product-facing UX, Inspect for substrate, AGChain for semantics.`

If a draft plan violates that sentence, it is probably choosing the wrong seam.
