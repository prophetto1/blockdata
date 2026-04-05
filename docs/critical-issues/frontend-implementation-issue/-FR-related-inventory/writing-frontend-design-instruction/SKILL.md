---
name: writing-frontend-design-instruction
description: >
  Use when an approved implementation plan has frontend surface area — new or modified pages,
  components, or routes — and no one has yet defined what the page looks like on load, what
  persists without data, which existing tokens and components to consume, or what external
  design references to follow. Trigger after the plan passes evaluation, before execution begins.
---

# Writing Frontend Design Instructions

## Overview

This skill sits between plan approval and plan execution. It reads an approved implementation plan and produces **working frontend code** — real `.tsx` and `.css` files that render a page whose product identity is visible before backend data arrives.

The approved plan defines *what* the frontend must contain: API endpoints, states, metadata fields, workflow actions, component inventories, and file paths. This skill turns that into *how* to materialize it: researching external design references, mapping existing tokens and components for reuse, designing the page structure, building persistent scaffolds with placeholder content, and leaving clearly marked integration points for backend wiring.

Without this step, the implementer reads the plan's Frontend Surface Area section — component names, file paths, and counts — and decides how the page visually composes. That freedom consistently produces generic containers that defer product identity until live data arrives.

**Announce at start:** "I'm using the writing-frontend-design-instruction skill to design and build the frontend from the approved plan."

**REQUIRED READ:** Read this file in full before starting. Then read the approved implementation plan in full. Do not start from memory, from the plan's Frontend Surface Area section alone, or from imagination.

---

## When to Use

- An approved implementation plan has frontend surface area (new or modified pages, components, or hooks)
- Execution is about to begin and no one has defined what the page looks like on load, what persists without data, or what to reuse
- A previous frontend attempt produced generic shells, and the work needs a concrete structural design to prevent recurrence
- The user requests a frontend design instruction, frontend structural pass, or frontend design build

## When NOT to Use

- The plan has zero frontend surface area — nothing to design
- The plan has not been approved — use `evaluating-plan-before-implementation` first
- You need to write the plan itself — use `investigating-and-writing-plan`
- You need to audit a built page against specs — use `design-3-spec-contract-based-design-audit`
- You need a repo-wide foundation audit — use `frontend-foundation-audit`
- You need to debug a broken implementation — use `comprehensive-systematic-debugging`

---

## The Baton: Alignment with the Approved Plan

The approved implementation plan and this skill execute a relay handoff. The plan locks the backend and frontend inventory. This skill receives that inventory and transforms it into structural design and working code.

### Five seam points

Every baton handoff must trace these five contact points between the plan and this skill:

| Seam | The plan produces | This skill transforms it into |
|---|---|---|
| **1. Frontend inventory** | Component names, file paths, counts, page-to-endpoint relationships | The boundary this skill cannot exceed — same names, same paths, same counts (unless the discrepancy protocol triggers) |
| **2. API endpoint shapes** | Verb, path, auth, request/response contracts for every endpoint the frontend calls | Integration points — "this endpoint returns `{ label, provider, health }`, therefore this table has these columns with these typed props" |
| **3. Acceptance criteria** | User-visible steps and expected states | Visual acceptance baseline — every criterion the user must see becomes a persistent scaffold element |
| **4. Locked decisions** | Mounted UI target, admin surface location, scope boundaries, excluded features | Structural constraints — compose within the declared shell, not a new layout |
| **5. State vocabulary** | Entity states, lifecycle states, workflow actions, transitions, metadata fields | State-to-visibility contract — every state maps to what is visible, enabled, disabled, or placeholder in every pane |

The skill cannot invent components the plan did not declare. The skill cannot drop components the plan did declare. The plan's inventory is the boundary.

---

## Discrepancy Protocol

The structural analysis may reveal the plan's frontend inventory is incomplete or incorrect.

**Case 1:** The plan declared N files but structural analysis requires N+M. A pane needs a component the plan did not name.

**Case 2:** The plan declared one component that should be two, or two that should be one.

**Case 3:** The plan's component-to-page mapping does not hold upon structural analysis.

**Mandatory stop condition:** If the structural analysis reveals that the plan's Frontend Surface Area is incomplete, incorrect, or misaligned — stop. Document the discrepancy: state what the plan declares versus what the analysis requires. Route the discrepancy back for plan amendment before proceeding. The plan is the contract. If the contract is wrong, the contract gets amended first.

---

## Canonical Frontend Specifications

The repo should maintain a designated location for canonical frontend specifications: token contracts, component contracts, shell contracts, page pattern references, and design system documentation.

**When this location exists:** The skill points directly to it for effortless lookup. The worker opens these files first, not searches the repo.

**When this location does not yet exist:** The skill falls back to direct repo investigation — searching for token files, component directories, layout primitives, and existing page patterns. Document what was found and where, so the next run benefits.

**Expected location (configure per repo):**

| Resource | Default path |
|---|---|
| CSS custom property tokens | `web/src/tailwind.css` |
| TypeScript color tokens | `web/src/lib/color-contract.ts` |
| TypeScript font tokens | `web/src/lib/font-contract.ts` |
| TypeScript icon tokens | `web/src/lib/icon-contract.ts` |
| Toolbar patterns | `web/src/lib/toolbar-contract.ts` |
| Shared UI primitives | `web/src/components/ui/` |
| Shell components | `web/src/components/shell/` |
| Common/utility components | `web/src/components/common/` |
| Foundation contract | *(when produced by `writing-frontend-foundation-contract`)* |
| Foundation audit | `web/foundation-audit-report/` |

Update this table when the canonical location is established. The skill reads it and provides the exact paths to the worker.

---

## Workflow

Six steps. Every step is required. Do not skip or reorder.

### Step 1: Absorb the Approved Plan

Read the full approved implementation plan — not just the Frontend Surface Area, but every section.

Extract and document:

- **Backend contracts that constrain the frontend.** Every API endpoint the frontend calls, with its response shape. Every metadata schema. Every entity state and transition.
- **Frontend inventory.** Every new and modified page, component, hook, service, and file path. These are the names and counts you must honor.
- **Acceptance criteria.** Every criterion involving a user-visible surface. These become the structural baseline.
- **Locked decisions.** Scope boundaries, mounted UI targets, explicitly excluded features.
- **State vocabulary.** Every lifecycle state, workflow action, and transition. Every metadata field.

Trace the five seam points from The Baton section. For each seam, write one sentence stating: "The plan declares [X]. This means the frontend must [Y]."

### Step 2: Inventory Existing Design System

Check the canonical frontend specifications location first. If not available, search the repo directly.

Catalog by role:

- **Token sources.** CSS custom properties, TypeScript contracts, Tailwind config. Identify the canonical source. Note any known drift from the foundation audit.
- **Shared components.** Buttons, tables, dialogs, menus, tabs, badges, chips, skeletons, spinners, empty states, error alerts. Map each to the UI role it fills.
- **Layout primitives.** Shell layouts, page frames, workbench shells, split panes, rail patterns, content wrappers.
- **Editor/document surfaces.** If the page includes a document area, identify existing editor surfaces to reuse.
- **Existing page patterns.** Find pages in the repo that match the type being built. Use the strongest existing example as the structural reference.

The reuse-first rule: every visual element maps to an existing token or component before any new element is proposed. New elements require documented justification.

### Step 3: Research External Design References

**This step is mandatory.** Do not design from imagination.

Before composing the page structure, search for external design references:

- Use web search, MCP tools, or curated reference collections to find similar page designs
- Search component library galleries (Ark UI, shadcn, Radix, Material) for relevant patterns
- Search community resources (Dribbble, design systems, open-source dashboards) for pages with similar structure
- Look for designs that match the page type: if building a registry-list, find existing registry-list designs; if building a multi-column workspace, find workspace designs

When a relevant reference is found:

- Document the reference (URL, library, screenshot, or description)
- Note what structural elements to adopt
- Note what to adapt (different field names, different states, different tokens)
- Apply existing repo tokens and components to the reference design — do not import the reference's visual language wholesale

If no close reference exists, document that the search was conducted and what was checked. Proceed with the repo's existing patterns as the structural basis.

### Step 4: Design the Page Structure

With the plan absorbed (Step 1), the design system cataloged (Step 2), and external references gathered (Step 3), design the page.

**Classify the page type:**

| Pattern | Persistent scaffold |
|---|---|
| Registry-list | Table frame with column headers, filter toolbar, page header with primary action |
| Detail-workspace | Page header with back-link, tabs bar, content area per tab |
| Multi-column workspace | All columns visible with section headers and frames |
| Create wizard | Step indicator, current step form, navigation buttons |
| Settings page | Stacked form sections with labels and descriptions |
| Admin table + inspector | Table with side panel for selected row detail |
| Dashboard | Data panels, summary cards, chart frames |
| Custom | Describe the pattern explicitly |

A page may combine patterns. Every page must have a declared type and a defined persistent scaffold.

**Produce these design artifacts:**

1. **Pane layout** — what regions exist, their purpose, their position
2. **Persistent scaffold spec** — what is always visible on page load, regardless of data or selection. Conditional content is allowed. Conditional pane identity is not. Empty states live inside the scaffold, never replacing it.
3. **Section order** — the exact sequence in each pane, extracted from the plan's locked contracts
4. **Field inventory** — every visible field, label, chip, badge, and control, marked as always-visible, placeholder-until-populated, or enabled-when-active
5. **Component reuse map** — for every UI element, the existing component or token it uses, or a justified new one
6. **API integration map** — for every endpoint the frontend calls, what it feeds in the UI (which table columns, which inspector fields, which form values) with typed prop shapes matching the plan's response contracts
7. **State-to-visibility matrix** — a table mapping each user state to what is visible, enabled, disabled, or placeholder in each region

### Step 5: Build the Page

Produce real `.tsx` and `.css` files. The page renders in the browser.

Build in three layers, each with zero backend dependency:

| Layer | What to build | Backend dependency |
|---|---|---|
| **1. Pure structure** | Page layout, pane composition, section headers, field labels, disabled controls, token consumption, persistent scaffolds | None |
| **2. Static interaction** | Tab switching, selection behavior, expand/collapse, form validation from the plan's metadata schema, dirty tracking, keyboard navigation | None |
| **3. Fixture-backed simulation** | Tables with fixture rows, inspectors with fixture metadata, forms with fixture defaults, all visual states rendered with mock data | None |

**After Layer 3, the page must pass the plausibility test:** if someone unfamiliar with the project lands on this page, they understand what product it is immediately — without clicking anything, without loading data.

**Integration points for backend wiring (Layer 4):** Leave clearly typed integration points in the code:

- Typed prop interfaces matching the plan's API response shapes
- Empty hook bodies or service stubs with the correct function signatures
- Commented `// TODO: wire to GET /endpoint` annotations at each integration point

Layer 4 (actual API calls, hook integration, real error handling, data transformation) waits for the backend or proceeds immediately if the backend is already complete. The structural design, persistent scaffolds, token compliance, and component reuse are locked regardless of backend status.

### Step 6: Verify

Run visual verification against each defined state:

- Page load with no data source connected
- Primary item selected (e.g., plan selected, resource selected)
- Secondary item selected (e.g., artifact selected, tab switched)
- Dirty/unsaved state visible
- Disabled workflow state (actions present but not yet available)
- Error state (simulated)

For each state, confirm:

- Every pane renders its persistent scaffold
- Every section header in each pane is visible
- Empty states appear inside scaffolds, not in place of them
- No hardcoded hex values, freestyle CSS, or custom markup where tokens and shared components exist

**Pre-backend gate:** Does this page unmistakably read as the intended product with no live data? If no, return to Step 5.

---

## Parallel Execution Boundary

The approved plan's backend contracts are locked tightly enough that frontend and backend can proceed simultaneously.

**Frontend scope (this skill):** Layers 1-3. Pure structure, static interaction, and fixture-backed simulation. Produces a page that looks and feels right with placeholder data.

**Backend scope (executing-approved-plans):** API endpoints, database migrations, observability, edge functions. Produces the runtime services.

**Reconvergence:** Layer 4 wiring. The backend developer (or the same worker in a later pass) takes a page that already renders correctly and wires real data into the marked integration points. No layout decisions, token choices, or scaffold structure changes occur during wiring.

**When backend finishes first:** The instruction document still applies in full. Layers 1-3 still prevent the generic-shell failure mode. Phase 5 data wiring can proceed immediately after Phase 4 verification.

---

## Red Flags — STOP and Check Yourself

- "The plan doesn't specify the layout, so I'll decide later" → The plan specifies states, metadata, actions, and acceptance criteria. Derive the layout from those. If the plan genuinely lacks enough, stop and ask.
- "I'll just list the components and file paths" → That is what the plan already does. This skill must go further: persistent scaffolds, placeholder content, reuse obligations, state-to-visibility matrix, working code.
- "I can figure out the design without looking at references" → No. Step 3 is mandatory. Search for external references before composing.
- "The implementer can figure out which tokens to use" → No. Name the specific token sources and component directories. Map every UI element to an existing asset.
- "Empty states can replace the pane for now" → Empty states live inside persistent scaffolds. Conditional content is allowed. Conditional pane identity is not.
- "The structural analysis shows the plan's inventory is wrong, but I'll work around it" → Stop. Document the discrepancy. Route it back for plan amendment.
- "I'll skip the reuse audit because the codebase is small" → The reuse audit is mandatory. Hardcoded values in a small repo cause the same drift.
- "Phase 1 is just planning" → Phase 1 produces the structural contract. It is a real deliverable.
- "I'll start coding before tracing the seam points" → Trace all five seam points first. The seams determine what the frontend must express.

## Common Mistakes

- Copying the plan's Frontend Surface Area verbatim instead of deriving structural specificity from the full plan
- Designing from imagination instead of researching external references first
- Omitting the reuse audit, letting the implementer freestyle tokens and components
- Producing an instruction that could apply to any page type instead of naming this page's specific fields, states, actions, and sections
- Deferring the inspector, metadata pane, or secondary region to a later phase when it belongs in the persistent scaffold
- Defining verification states generically ("test that it renders") instead of page-specifically ("test that the inspector shows all 6 section headers on load with no selection")
- Treating the design step as complete when it produces a document but no working code
- Silently adjusting the plan's inventory instead of routing discrepancies back for amendment

## What This Skill Prevents

- Frontend pages that ship as generic container shells without product identity
- Implementers who defer visible structure until backend data arrives
- Freestyle HTML/CSS that bypasses existing tokens and shared components
- Pane scaffolds that disappear when no data is selected
- Designs pulled from imagination instead of researched references
- The same frontend requirement stated repeatedly without materializing
- Late-stage redesign when product reviews reveal empty pages
- Frontend iteration consuming 3-5x more cycles than equivalent backend work
- Backend engineers wiring data into unstable visual surfaces
- The plausibility test failure: a page so generic that any unrelated feature could live in the same containers

## Skill Family

| Skill | Timing | Purpose |
|---|---|---|
| `investigating-and-writing-plan` | Before build | Lock the plan contract (backend + frontend inventory) |
| `evaluating-plan-before-implementation` | Before build | Gate structural completeness and quality |
| **`writing-frontend-design-instruction`** | **After approval, before execution** | **Design and build the frontend from the approved plan** |
| `executing-approved-plans` | During build | Execute backend + wire frontend integration points |
| `evaluating-implemented-plan` | After build | Audit compliance to plan and structural contract |
| `addressing-evaluation-findings` | After evaluation | Fix verified findings |
| `blind-implementation-review` | Independent | Plan-agnostic code quality assessment |
| `verification-before-completion` | Before commit | Evidence before any success claim |
