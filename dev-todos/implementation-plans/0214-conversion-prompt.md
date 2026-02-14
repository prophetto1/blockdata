# Implementation Plan Conversion Prompt

## Context

You are converting source documents into implementation plans. All source files are in `E:\writing-system\dev-todos\action-plans\`. All output goes to `E:\writing-system\dev-todos\implementation-plans\`.

## Before You Start

1. Read `implementation plan drafting guideline.md` — this is the format spec. Follow it exactly.
2. Read `0214-source-file-tracker.md` — this tracks which files are done, in progress, or not started. Pick a file with status `not started` or `in progress`.
3. Read the combined source document at `E:\writing-system\dev-todos\0214-combined-source-documents.md` if you need cross-file context. Each file is separated by a `# E:/writing-system/dev-todos/action-plans/<filename>` divider.

## How to Process One Source File

### Step 1: Read and assess

Read the source file completely. Determine:

- How many implementation plans does this file produce? (Could be 0, 1, or more.)
- Does this file need content from another source file to form a complete plan? If yes, identify which file(s) and check if they're already processed.
- Does this file contain content that is not actionable (governance text, historical notes, status legends)? If yes, these are orphans — note them but do not force them into actions.

### Step 2: Check repo state

For each actionable item in the source file, check whether the output already exists in the repo:

- Database tables/migrations: check `supabase/migrations/` and query the live database if MCP tools are available.
- Edge functions: check `supabase/functions/` directory and deployed function list.
- Frontend components: check `web/src/` for the relevant files.
- If the output exists, the action still appears in the plan but the description notes that the output is already present and what its current state is.

### Step 3: Draft the plan(s)

Follow the guideline exactly. For each plan:

- Pick a filename: `YYYY-MMDD-HHMM-verb-nouns-scope.md`
- Write Header (filename, problem, solution, scope).
- Write Included Implementation Rules if the plan depends on resolved decisions or policies from the source. Embed them — do not reference external documents.
- Write Actions as a 3-column table. Full sentences, not fragments. Every action ends with a tangible output.
- Write Completion Logic with explicit lock conditions.

### Step 4: Update the tracker

In `0214-source-file-tracker.md`:

- Set the source file's status to `done` (or `in progress` if partially complete).
- List the resulting plan filenames in the "Resulting Plans" column.
- List any orphaned content in the "Orphans / Notes" column.
- If the plan required multiple source files, add a row to Cross-File Dependencies.

## What Not to Do

- Do not invent actions the source document does not contain.
- Do not create sign-off or governance plans — embed resolved decisions as rules.
- Do not create process documents as action outputs.
- Do not filter out actions because they are "already done" — include them with their current state noted.
- Do not use fragment-style action descriptions.
- Do not reference external documents for rules — embed them.

## Suggested Processing Order

Start with files that are self-contained (likely to produce clean plans without cross-file dependencies). Then do files that need cross-referencing.

Likely self-contained:
- `0213-agents-mcp-configuration-foundation.md`
- `0213-agents-mcp-foundation-dev-smoke-runbook.md`
- `0212-schema-library-and-assistant-future-task.md`
- `0211-worker-token-optimization-patterns.md`
- `0210-project-detail-layout-and-wiring.md`

Likely needs cross-referencing:
- `0212-priority7-schema-contracts-master-spec.md` (large spec, may overlap with other files)
- `0209-unified-remaining-work.md` (consolidation doc, items may appear in other files)
- `0213-consolidated-remaining-actions.md` (explicitly consolidates from other files)
- `0213-config-appropriateness-utility-review.md` (review findings reference other specs)
- `0213-config-source-authority-reconciliation.md` (reconciliation across docs)
- `config-decision-log.md` (decisions that feed into other plans as rules)

Likely not convertible to plans:
- `0213-reflections.md` (may be observations only — read first to confirm)
