# Plan Tracker — Frontend Structural Design Pass

You are executing a frontend structural contract lock pass for a feature that already has an approved implementation plan.

Your job is NOT to change backend contracts, expand scope, or reinterpret product requirements.
Your job IS to extract the frontend design contract from the approved implementation plan and materialize it into concrete, implementation-ready frontend outputs.

---

## Inputs

- **Approved implementation plan:** `E:\writing-system\docs\plans\dev-only\plan-tracker\2026-04-04-plan-tracker-workspace-refoundation-implementation-plan.md`
- **Repo root:** `E:\writing-system`
- **Target route:** `/app/superuser/plan-tracker`
- **Target file:** `web/src/pages/superuser/PlanTracker.tsx`

**Read these supporting files before starting:**

- `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-frontend-component-guide.md` — explains the current composition, reusable primitives, and where the implementation drifted
- `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-refoundation-takeover-notes.md` — trust matrix and salvage/rewrite decision
- `docs/plans/dev-only/plan-tracker/2026-04-04-plan-tracker-implementation-status-report.md` — current implementation status

**Inspect before proposing changes:**

- `web/src/pages/superuser/PlanTracker.tsx` — current route
- `web/src/pages/superuser/usePlanTracker.tsx` — current orchestration hook
- `web/src/pages/superuser/planTrackerModel.ts` — metadata model
- `web/src/pages/superuser/PlanStateNavigator.tsx` — left navigator
- `web/src/pages/superuser/PlanMetadataPane.tsx` — right inspector
- `web/src/pages/superuser/PlanDocumentPreview.tsx` — document preview
- `web/src/pages/superuser/MdxEditorSurface.tsx` — editor surface (reuse as-is)
- `web/src/pages/superuser/TestIntegrations.tsx` — the three-column workspace reference
- `web/src/pages/superuser/useWorkspaceEditor.tsx` — the workspace editor contract reference
- `web/src/components/workbench/Workbench.tsx` — the workbench shell (reuse as-is)

**Check these design system sources:**

- `web/src/tailwind.css` — CSS custom property tokens (the canonical source)
- `web/src/lib/color-contract.ts` — TypeScript color tokens
- `web/src/lib/font-contract.ts` — TypeScript font/typography tokens
- `web/src/lib/icon-contract.ts` — icon tokens
- `web/src/lib/toolbar-contract.ts` — toolbar patterns
- `web/src/components/ui/` — shared UI primitives
- `web/src/components/shell/` — shell components (TopCommandBar, LeftRailShadcn, ShellPageHeader)
- `web/src/components/common/` — shared common components (ErrorAlert, AppBreadcrumbs)

---

## What this page is

A plan tracker workspace with three columns:

- **Left:** Metadata-driven lifecycle navigator with state tabs (To Do, In Progress, Under Review, Approved, Implemented, Verified, Closed), plan-unit rows, and nested artifact rows
- **Center:** MDX document workspace that opens real Markdown files from disk via the File System Access API
- **Right:** Structured metadata and workflow inspector with locked section order: Summary, Classification, Timeline, Workflow Actions, Notes/Action Composer, Related Artifacts

The page is browser-local. It reads and writes files through the File System Access API. No platform API, database, or edge function involvement.

---

## Core Rules

**1. The approved plan is a contract. Do not change it.**

Do not modify locked lifecycle states, artifact types, metadata schema, metadata editability rules, workflow transition matrix, right-column section order, or scope boundaries. If something appears unclear, make the frontend express the approved contract more clearly. Do not invent new behavior.

**2. Reuse first.**

Before creating any new UI structure, explicitly check existing tokens, shared components, layout primitives, editor surfaces, and interaction patterns already in the codebase. Default to reuse. Do not freestyle raw HTML/CSS unless you have documented why existing primitives are insufficient.

**3. Persistent pane scaffolds are mandatory.**

All three panes must be visually present and product-specific on page load, regardless of selection state or data availability.

- The left pane always shows lifecycle tabs and navigator structure.
- The center pane always shows a document workspace frame with header, filename/status area, and editor mode controls.
- The right pane always shows the inspector section headers: Summary, Classification, Timeline, Workflow Actions, Notes/Action Composer, Related Artifacts.

Conditional content is allowed. Conditional pane identity is not. Empty states live inside the scaffold. They never replace it.

**4. Placeholder-mode first.**

The first deliverable must be a visually specific placeholder-mode page:

- Real section headers, dividers, cards, and frames
- Disabled workflow action buttons (Start Work, Submit for Review, etc.)
- Placeholder metadata field rows (title, planId, artifactType, status, version, productL1/L2/L3, createdAt, updatedAt)
- Placeholder tag chips and owner/reviewer fields
- Editor frame with mode toggle placeholders (Edit / Preview / Source / Diff)
- Navigator with seeded or skeleton tab counts and plan rows

The page must read unmistakably as a plan tracker before any real data is loaded.

**5. Visual verification is required.**

Define Playwright-based visual checks for:

- Page load with no directory selected
- Page load with directory selected but no plan selected
- Plan selected, artifact visible in center, metadata in right
- Dirty document state (unsaved indicator visible)
- Workflow action disabled vs. enabled states

---

## What You Must Produce

Output a short "Design Output / Deliverables Plan" broken into phases, then immediately begin Phase 1.

### Phase 1 — Contract extraction and reuse audit

Analyze the approved implementation plan and produce:

**1. Frontend Contract Summary**
- Page purpose and layout
- Each pane's role
- Always-visible structures vs. conditional content
- The locked section order, metadata fields, workflow actions, and lifecycle states (extract these directly from the plan — they are already defined)

**2. Reuse Audit**
- Existing tokens to consume (from tailwind.css, color-contract.ts, font-contract.ts)
- Existing shared components to use (from components/ui/, components/shell/, components/common/)
- Existing layout/workbench/editor primitives to use (Workbench, MdxEditorSurface, useWorkspaceEditor patterns)
- What must not be reinvented
- Genuinely new components needed (if any, with justification)

**3. Structural UI Contract (pane by pane)**
For each of the three panes:
- What must always be visible on page load
- What is placeholder until selection/data
- What becomes live after backend/filesystem wiring
- What must never disappear or become a generic empty container

**4. State-to-Visibility Matrix**
A table mapping each state (no directory, directory loaded, plan selected, artifact selected, document dirty, workflow action available) to what is visible, enabled, disabled, or placeholder in each pane.

**5. Phase 2 Plan**
Specific files to create or modify, exact sections to materialize, expected placeholder-mode output.

### Phase 2 — Persistent scaffold / placeholder-mode composition

Build the actual page with persistent scaffolds and placeholder content. The page renders in the browser showing the product identity.

### Phase 3 — Component-level refinement and interaction framing

Wire selection behavior, tab switching, artifact expansion, and editor mounting into the persistent scaffold.

### Phase 4 — Visual verification and structural corrections

Playwright captures at each defined state. Structural assertion pass/fail.

### Phase 5 — Semantic/data wiring (only if explicitly requested)

Wire filesystem reads, metadata parsing, and workflow actions into the already-visible scaffold. This phase stays within the approved plan scope.

---

## Fail Conditions

Your output is wrong if:

- It proposes changing backend contracts, lifecycle states, metadata schema, or workflow transitions
- It skips the reuse audit
- It starts coding components before extracting the design contract
- It replaces pane scaffolds with generic empty states
- It produces a page that could plausibly be for any unrelated feature
- It delays visible product structure until filesystem data is loaded
- It introduces hardcoded hex values, freestyle CSS, or custom markup where existing tokens and components exist
- It treats the right-column inspector as optional or defers it to a later phase
- It treats the document workspace frame as invisible until an artifact is selected

---

## Start now

1. Read the approved implementation plan in full.
2. Read the supporting files.
3. Inspect the current implementation files.
4. Check the design system sources.
5. Output the phased Design Output / Deliverables Plan.
6. Immediately execute Phase 1 and produce the required sections.
7. Do not stop after planning.
