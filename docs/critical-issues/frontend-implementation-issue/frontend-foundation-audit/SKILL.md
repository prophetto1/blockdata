---
name: frontend-foundation-audit
description: Use when a repo's frontend foundation needs assessment before writing a canonical contract. Trigger when shell layout ownership, navigation rails, visual tokens, theme definitions, component contracts, page patterns, or state presentation are inconsistent, fragmented, or unclear. Use when repo code exists and you need a structured audit report that groups conflicts into discussion-ready bundles with recommendations. Prefer repo code as the source of truth over docs, captures, or design files.
---

# Frontend Foundation Audit

## Overview

Run a repo-first audit of the frontend foundation and produce a deterministic, discussion-ready report.

This skill does **not** write the canonical foundation contract. It determines what the repo actually does, where the shell and token contracts are fragmented, which patterns compete, and what should be discussed before standardization.

The audit finishes by running `scripts/build-foundation-audit-report.mjs` to emit a deterministic JSON and markdown report.

**Announce at start:** "I'm using the frontend-foundation-audit skill to map the repo's frontend foundation, group conflicts, and prepare a discussion-ready audit report."

## Required posture

- **Repo code is mandatory.** If there is no repo code, stop and say the audit cannot proceed.
- **Repo code is the source of truth.** Prefer code over docs when they conflict.
- **Captures support the audit, not replace it.** Use page captures, layout captures, or Playwright evidence to confirm runtime behavior, shell composition, and visible inconsistencies.
- **Do not jump straight to a canonical contract.** The primary output is the audit report.
- **Do not flatten disagreements prematurely.** When multiple plausible patterns exist, group them into a conflict bundle and recommend a direction, but leave the final choice for discussion.
- **Always produce the intermediate JSON** in the schema defined by `references/audit-input-schema.md`.

## Inputs

### Required
- repo code, local or connector-backed

### Use when available
- token/theme files
- page captures or layout captures
- Playwright or screenshot evidence
- Google Drive folders that act as repo mirrors

### Ignore by default
- internal docs or stale design notes, unless the user explicitly asks to include them

## Output directory convention

All audit artifacts go in a single directory: `<repoRoot>/foundation-audit-report/`.

The directory contains:
- `foundation-audit-input.json` — intermediate JSON conforming to `references/audit-input-schema.md`
- `foundation-audit.json` — enriched report JSON emitted by the script
- `foundation-audit.md` — markdown report emitted by the script

Write the intermediate JSON directly to the output directory. Do not scatter files across the repo.

## Scoping and triage

Before starting the full audit, count the surface area:

1. Count shell/layout files (search for Layout, Shell, Frame, AppShell in component names)
2. Count token/theme definition files
3. Count shared component files (directories named components, ui, primitives, shared)
4. Count page-level component files

Record these counts in the `scope.surfaceAreaEstimate` block.

**Sampling threshold:** If the surface area is large (roughly >50 shared components or >30 page files), switch to sampling mode:
- Audit the shell, tokens, and navigation in full (these are always tractable)
- Sample representative pages for each page pattern rather than exhaustively auditing every page
- Note what was sampled and what was skipped in `scope.samplingNotes`
- Set `scope.samplingMode` to `"sampled"`

The threshold is a guideline, not a hard rule. Use judgment based on the repo's complexity.

## What to audit by default

Audit all of these areas unless the user explicitly narrows the scope:

1. shell layout ownership
2. navigation and rail structure
3. token and theme definitions
4. component contract fragmentation
5. page pattern inconsistency
6. loading, empty, error, success, and permission-state presentation
7. light and dark mode consistency
8. accessibility basics at the shell and shared-component layer

## Search heuristics

See `references/search-heuristics.md` for the full checklist of convention-based strategies for locating foundation elements. Use it as a reference to confirm coverage after initial exploration, not as a sequential procedure to follow step-by-step.

## Workflow

### 1. Establish the foundation surface

Start by locating the files that own the shared frontend substrate using the search heuristics in `references/search-heuristics.md`.

Identify:
- shell layout owners
- page frame owners
- route layout wrappers
- navigation and rail owners
- shared token/theme definitions
- shared UI primitives and shared composites
- the highest-reuse page shells and workspaces

Record surface area counts for the scoping decision.

Do not begin with feature-specific one-offs.

### 2. Build the evidence map

For each audited area, gather evidence from code first, then confirm with captures if available.

For every finding, record:
- owner file or files
- runtime surface or route
- whether it appears canonical, duplicated, or conflicting
- whether the behavior is visible in captures

**Evidence linking:** Every inventory entry and conflict bundle must include at least one evidence string in its `evidence` array. An evidence string is a file path, a line range (e.g., `src/layouts/AppShell.tsx:14-38`), a capture reference (e.g., `captures/shell-light.png`), or a runtime observation (e.g., `grep -r 'PageHeader' shows 14 imports`).

**Thin findings:** For clean areas where the finding is simply "this component exists and nothing else competes," a single file path is sufficient evidence. Do not pad thin evidence with filler observations.

When a Google Drive folder acts as repo code, treat that as repo input and audit it the same way.

### 3. Inventory each foundation layer

Build explicit inventories for each layer. For each inventoried area, also determine whether it is a **clean area** (single clear owner, no competing implementations) or a **conflict candidate**.

#### Shell ownership inventory
- top-level shell regions
- header ownership
- left rail ownership
- secondary rail ownership, if any
- content-area framing
- modal, drawer, and sheet shell patterns
- shell state ownership and persistence rules

#### Navigation inventory
- primary navigation structure
- secondary navigation structure
- route-to-surface mapping
- breadcrumb and page-header patterns
- where create/detail/edit flows live

#### Token and theme inventory
- all theme and token definition locations
- semantic tokens versus raw values
- light-mode values
- dark-mode values
- status colors and feedback colors
- spacing, radius, typography, border, and shadow definitions when centrally controlled
- raw hex, ad hoc utility, or component-local values that bypass the token system

#### Component contract inventory
- primitives
- shared composites
- page-level scaffolds
- repeated one-off substitutes for the same purpose
- visible states and variants
- duplicate or near-duplicate components

#### Page pattern inventory
Gather recurring patterns such as:
- registry/list pages
- detail workspaces
- create wizards
- draft/edit pages
- settings pages
- table-plus-inspector pages
- tabbed workspaces
- empty-state-first pages

### 4. Detect conflict bundles

When two or more patterns compete for the same role, do **not** just list them separately. Group them into a conflict bundle.

#### Concrete signals that trigger conflict detection

- Two or more files exporting components for the same shell region
- Multiple token sources defining overlapping semantic names or color values
- Two or more components imported for the same UI role across different pages
- Page-level layouts that structurally duplicate each other with minor variations
- Navigation structures that disagree about where primary actions or context belong
- State presentation patterns that differ across pages for the same state type
- Multiple files defining the same spacing, radius, or typography scale

#### Conflict bundle structure

A conflict bundle must include:
- the specific role under dispute
- every competing implementation (name, location, what it solves)
- evidence supporting each entry
- why the repo currently lacks a single clear contract
- which one is the strongest candidate to become canonical
- what decision the team needs to make (discussion questions)
- **effort level** — one of `"quick-win"`, `"moderate"`, or `"architectural"`

#### Effort level definitions

| Level | Meaning | Examples |
|---|---|---|
| `quick-win` | Fixable in a single focused session (<10 files, no API or structural changes). Low risk, high signal. | Replacing hardcoded hex with token refs, consolidating two near-identical components, removing a dead dependency |
| `moderate` | Requires coordinated changes across multiple files or a migration plan, but the end state is clear. | Icon library migration, extracting a shared primitive from 3 competing implementations, adding a theme factory |
| `architectural` | Requires design decisions that change how the shell, routing, or state model works. Cannot be resolved by just writing code. | Unifying two shell layouts, redesigning the navigation model, restructuring route-level context providers |

Assign effort level based on what resolution actually requires, not on how many files are affected by the conflict's existence.

#### Typical conflict bundles
- two page frames that both act like the shell-standard wrapper
- multiple token sources defining overlapping colors
- two different table shells used for the same page type
- multiple detail workspace layouts for the same class of screen
- rail/navigation structures that disagree about where actions or context belong

### 5. Recommend, but do not over-resolve

For each conflict bundle, recommend a direction.

Base recommendations on the decision rules below. Do **not** pretend recommendation equals final resolution. The audit should set up a human discussion, not bypass it.

### 6. Record clean areas

For every audited area where a single clear contract exists with no competing implementations, record it as a clean area. Clean areas confirm what the team has already resolved and do not need discussion.

Include evidence in every clean area entry. A single file path is sufficient for straightforward clean areas.

### 7. Produce the audit report

1. Write the intermediate JSON to `<repoRoot>/foundation-audit-report/foundation-audit-input.json`, following the schema in `references/audit-input-schema.md`.
2. Run `scripts/build-foundation-audit-report.mjs --input-path <path-to-input-json> --output-dir <repoRoot>/foundation-audit-report/` to emit the report files.
3. Do not leave the audit as freeform notes. The script-generated artifact is the required output.

Use the output shape in `references/report-template.md` for the expected markdown structure.

## Decision rules

When choosing the strongest candidate pattern inside a conflict bundle, prefer:
1. the pattern that is most clearly foundation-owned
2. the pattern with the broadest legitimate reuse
3. the pattern with the fewest local overrides
4. the pattern that works coherently in both light and dark modes
5. the pattern that composes cleanly with the shell and navigation model
6. the pattern that is easiest to validate and enforce in later skills
7. when two candidates tie on rules 1-6, prefer the one with the clearest single-file ownership
8. if still tied, prefer the one already used in more routes

Document which rule broke the tie in the conflict bundle's `recommendedDirection`.

Do not prefer a pattern merely because it is newer, larger, or visually louder.

## Red flags

Stop and tighten the audit if you catch any of these:
- treating docs as source of truth over code
- calling something canonical because it looks polished once
- collapsing multiple competing implementations into one summary line
- ignoring shell-state ownership because the UI "seems fine"
- listing token files without tracing raw-value bypasses
- reviewing feature pages without first understanding the shell and rails
- recommending a direction without showing the competing evidence
- producing freeform notes instead of running the report generator script
- omitting evidence arrays from inventory entries or conflict bundles
- skipping the scoping step on a large repo and producing shallow coverage

## Required output

Every run must emit `foundation-audit-input.json`, `foundation-audit.json`, and `foundation-audit.md` in the output directory.

The intermediate JSON must conform to `references/audit-input-schema.md`.

The markdown report follows the section order in `references/report-template.md`.

## Exit criteria

The audit is complete when all of the following are true:
- every audited area has either a clean-area entry or at least one conflict bundle
- every conflict bundle has a recommended direction with evidence and an effort level
- every inventory entry has at least one evidence string
- the report generator script has been run and all three output files exist in the output directory
- if sampling mode was used, the sampling notes explain what was skipped and why

## Related follow-up

This skill prepares the repo for a later skill that writes the canonical frontend foundation contract. The contract-writing step should consume this audit instead of rediscovering the same conflicts from scratch.

## Example prompts

- "Audit this repo for frontend foundation conflicts and group the competing shell, token, and page patterns for discussion."
- "Use repo code plus layout captures to produce a frontend foundation audit report for this project."
- "Review this repo's shell ownership, nav structure, token definitions, and shared component patterns, then recommend a canonical direction without writing the contract yet."
- "I think this repo has inconsistent frontend contracts and token drift. Run a foundation audit and tell me what's competing."