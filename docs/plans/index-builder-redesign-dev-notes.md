# Index Builder redesign notes (developer-facing)

> **Status: LOCKED** — Design decisions finalized 2026-04-01. Use this doc as
> the authoritative input for the implementation plan. No open questions remain.

This is the working specification for the Index Builder redesign. The
screenshots alongside this doc are reference artifacts, not specs.

## 0) Backend mapping

The entity model maps 1:1 to existing backend tables. No new tables are needed.

| UI Concept | Backend Entity | Field / Endpoint | Exists |
|---|---|---|---|
| Index Job | `pipeline_source_sets` | `source_set_id`, `label`, `member_count`, `total_bytes`, `created_at`, `updated_at` | Yes |
| Job name | `pipeline_source_sets.label` | — | Yes |
| Job description | — | — | No — not needed v1 |
| Job status (draft / ready / invalid) | — | Frontend-derived from source set state + validation | Frontend only |
| Job status (running / failed / complete) | `pipeline_jobs.status` via latest job | `GET /{kind}/jobs/latest?source_set_id=` | Yes |
| Source files | `source_documents` + `pipeline_source_set_items` | `GET /{kind}/sources`, `POST/PATCH /{kind}/source-sets` | Yes |
| `has_unsaved_changes` | — | React state only | Frontend only |
| Run | `pipeline_jobs` | Full lifecycle: `job_id`, `status`, `stage`, timestamps, metadata | Yes |
| Run stages | `pipeline_jobs.stage` | 10 stages tracked via `set_stage` callback | Yes |
| Artifact | `pipeline_deliverables` | `deliverable_kind`, `filename`, `byte_size`, download endpoint | Yes |
| Config (chunking, embedding) | — | Chunking params hardcoded in backend; embedding resolved from `model_role_assignments` + `user_api_keys` | Partial — UI stubs only in v1 |

---

## 1) Main correction

The current screen is blending **three different things** into one UI:

1. a saved or unsaved **Index Job** definition
2. a **Run** of that job
3. the **progress details** of one run

That is the core design bug.

A draft is not a run.
A run is not the job definition.
A job definition can produce many runs.

The redesign should make those three layers explicit.

---

## 2) Target shape

The structural target is closer to an Apify-like pattern:

- select one durable thing
- edit/configure that thing
- save it
- run it
- inspect runs and outputs separately

Translated to our product:

- durable thing = **Index Job**
- execution = **Run**
- outputs = generated artifacts / logs / results

---

## 3) Proposed object model in the UI

### 3.1 Primary entity: Index Job

This is the editable object the user creates and manages.

Suggested fields shown in frontend state / API shape:

- `id`
- `name`
- `description` (optional)
- `status` = `draft | ready | invalid | running | failed | complete`
  - **Derivation rule:** Status is composite.
    - *Intrinsic states* (`draft`, `ready`, `invalid`) are frontend-derived from source set existence, file count, validation, and unsaved-changes tracking.
    - *Run-derived states* (`running`, `failed`, `complete`) come from the latest `pipeline_jobs` record for this source set.
    - A job transitions from intrinsic → run-derived when a run starts, and back to intrinsic (`ready`) when the user edits files/config after a completed or failed run.
- `source_type` = initially markdown only
- `file_count`
- `created_at`
- `updated_at`
- `last_run_at` (nullable)
- `last_run_status` (nullable)
- `config_summary` (lightweight)
- `has_unsaved_changes` (frontend only)

### 3.2 Child entity: Run

A run belongs to one Index Job.

Suggested fields:

- `id`
- `index_job_id`
- `status` = `queued | loading_sources | consolidating | parsing | normalizing | structuring | chunking | lexical_indexing | embedding | packaging | complete | failed | canceled`
- `created_at`
- `started_at`
- `finished_at`
- `current_step`
- `step_progress` (optional)
- `error_summary` (nullable)
- `artifacts` (nullable until done)

### 3.3 Artifact entity

Only needed once run completes.

- lexical sqlite file
- semantic zip file
- maybe manifest / metadata later

---

## 4) Information architecture

### 4.1 Do not use a right-side table called "Runs" if the rows are not purely runs

If the right table contains drafts / jobs / editable things, then label it:

- `Index Jobs`
- or `Jobs`
- or `Builds` (less preferred)

Best option: **Index Jobs**

### 4.2 Proposed two-pane structure

#### Right side: list of Index Jobs
Each row represents one Index Job, not a run.

Columns:

- Name
- Status
- Last run
- Updated

Possible row examples:

- Compliance handbook | Draft | — | Mar 30, 8:30 AM
- Legal corpus v2 | Complete | Mar 30, 7:22 AM | Mar 30, 7:25 AM
- Onboarding docs | Running | Mar 30, 8:01 AM | Mar 30, 8:01 AM
- API reference batch | Failed | Mar 30, 5:45 AM | Mar 30, 5:46 AM

Meaning:
- `Status` = job-level current state or latest meaningful state
- `Last run` = latest execution start time if one exists
- `Updated` = definition changed time

#### Left side: selected Index Job detail
The left panel shows one selected Index Job.

This panel can switch between authoring and monitoring states, but it is still centered on the selected job.

Header:
- job name
- status chip
- metadata line
- header actions

Body tabs:
- Files
- Config
- Runs
- Artifacts

This is the cleaner model.

### 4.3 Alternative model that should NOT be used

Do not do:

- left = draft editor
- right = unrelated run list across all jobs

That is the exact mismatch causing confusion in the current design.

---

## 5) Empty state / landing state

When no job is selected, the left panel should not be blank or over-explained.

Show a compact intro card:

### Title
`Index Builder`

### Description
`Upload markdown files, configure processing, and generate search-ready artifacts.`

### Supporting bullets
- Accepts Markdown (`.md`, `.markdown`)
- Produces lexical SQLite + semantic archive
- Runs can be monitored step-by-step

### Primary CTA
`New Index Job`

### Secondary CTA (optional)
`View documentation`

Do not make this intro text wall-heavy. This is a staging state, not a documentation page.

---

## 6) New job creation flow

### 6.1 Trigger
User clicks `New Index Job`

### 6.2 Result
Create a new selected job in `draft` state.

Suggested default name:
- `Untitled index job`

Focus behavior:
- name should become editable immediately

Default selected tab:
- `Files`

### 6.3 Draft state rules
A draft can exist before the first save, but then the UI must clearly indicate unsaved state.

Header status chip options:
- `Draft`
- `Unsaved changes`

Buttons in draft:
- `Save draft` (primary)
- `Discard` (secondary, optional)
- no `Start run` until save + valid config

---

## 7) Header contract for selected Index Job

### 7.1 Header content

Line 1:
- editable name field or static title with pencil affordance
- status chip

Line 2 metadata:
- `Created Mar 30, 8:30 AM`
- `Last edited Mar 30, 8:42 AM`
- `Last run Mar 30, 9:12 AM` (only if exists)

Important: do not show a single ambiguous timestamp.

### 7.2 Header actions by state

#### Draft / unsaved
- Primary: `Save draft`
- Secondary: `Discard changes` or `Delete draft`

#### Saved + valid + not running
- Primary: `Start run`
- Secondary: `Edit config` or `Duplicate`
- Tertiary / menu: `Delete`

#### Running
- Primary disabled or replaced with `Running...`
- Secondary: `View run`
- Optional dangerous action: `Cancel run`

#### Failed
- Primary: `Retry run`
- Secondary: `View error`

#### Complete
- Primary: `View artifacts`
- Secondary: `Run again`

---

## 8) Tab structure for selected job

## Files tab

Purpose: attach and manage source files for this job.

### 8.1 Main components

1. file drop zone
2. uploaded file list
3. lightweight file summary
4. validation notices if needed

### 8.2 Drop zone behavior

The drop zone should be significantly larger than in the current mock.

Recommended content:

Title:
`Drop markdown files here`

Supporting text:
`or click to browse`

Helper text:
`Accepted: .md, .markdown`

This is the main input surface in authoring mode. It should visually read as important.

### 8.3 File list row shape

Each file row:
- filename
- size
- status (optional)
- remove button

Example:
- handbook-part1.md | 24.0 KB | remove

### 8.4 Files tab footer summary

Example:
- `3 files uploaded`
- `Total size: 50.8 KB`

### 8.5 Files tab validations

Possible warnings:
- duplicate filename
- unsupported file type
- empty file
- extremely large file

---

## Config tab

Purpose: configure processing behavior.

Even if config is minimal in v1, give it its own place.

### 8.6 Suggested fields

Minimal version:
- source type (readonly for now: Markdown)
- chunking mode
- chunk size
- overlap
- embedding profile
- packaging options

If backend config is not ready yet, stub the section with:
- `Configuration options will appear here`

But the tab should still exist, because it preserves the model that a job has files + config.

### 8.7 Config validation state

If required config is missing, show:
- inline warnings
- disable `Start run`
- allow `Save draft`

---

## Runs tab

Purpose: show run history for the selected job only.

This is where the current right-side "Runs" idea should move if we keep jobs in the main list.

### 8.8 Runs tab table columns

- Run ID / Label
- Status
- Started
- Duration
- Triggered by (optional)

### 8.9 Row click behavior

Clicking a run opens run detail in-place below the table, in a side drawer, or in a nested panel.

Do not navigate away unless needed.

---

## Artifacts tab

Purpose: show outputs from the latest successful run or selected run.

### 8.10 Artifact rows

- Lexical index (`*.lexical.sqlite`)
- Semantic archive (`*.semantic.zip`)
- maybe manifest later

Each row can show:
- filename
- created timestamp
- size
- download action

---

## 9) Start / save / validation logic

This is the biggest behavior fix.

### 9.1 Rules

- user can always upload files before saving
- user can save a draft even if not runnable yet
- user cannot start a run until the job is saved and valid
- if there are unsaved changes, `Start run` should be replaced with either:
  - `Save changes`
  - or `Save and start`

### 9.2 Recommended button behavior

#### Case A: brand new draft
- `Save draft` enabled
- `Start run` hidden or disabled with tooltip: `Save this job before running`

#### Case B: saved but invalid
- `Start run` disabled
- inline reason displayed: `Add at least one markdown file to run this job`

#### Case C: saved and valid
- `Start run` enabled

#### Case D: unsaved edits on a previously valid job
Best option:
- primary button becomes `Save and start`
- secondary button `Save changes`

This keeps the workflow compact and clear.

---

## 10) Execution / monitoring state

Once a run starts, the selected job detail can shift into a monitoring emphasis state.

This is where the first screenshot was directionally correct: the progress list should become the focal point.

### 10.1 Monitoring layout inside selected job

Header remains the same job header.

Top section:
- status chip = `Running`
- `Run started Mar 30, 8:10 AM`
- current step summary

Main section:
- ordered pipeline steps
- current step highlighted strongly
- completed steps visually differentiated
- failed step strongly flagged if failure occurs

Suggested step labels:
- Loading sources
- Consolidating
- Parsing
- Normalizing
- Structuring
- Chunking
- Lexical indexing
- Embedding
- Packaging

### 10.2 Run detail content

For the selected active run show:
- current step
- elapsed time
- latest update timestamp
- optional logs disclosure
- optional raw events disclosure

### 10.3 Important visual rule

When a run is active, the run progress should outrank the file upload interface in visual emphasis.

Meaning:
- do not keep a giant empty upload area visible below active progress
- switch the content area to run monitoring for the active run

---

## 11) Logs and terminal-style content

We do not need to make the entire product look like a terminal.

Recommended approach:

- logs available in `Runs` tab or an expandable `Logs` panel
- not visible by default in authoring state
- visible and easy to open in running/failed state

Suggested structure inside run detail:

Tabs within run detail or sections:
- Progress
- Logs
- Errors
- Outputs

This is how to borrow the useful shape without making the UI feel like infra tooling everywhere.

---

## 12) Right-side list behavior (if we preserve the two-pane page)

Assuming right side remains the list and left side remains selected detail:

### 12.1 List label
Use `Index Jobs`

### 12.2 Sorting
Default sort:
- running first
- failed second
- drafts third
- then most recently updated

Alternative simpler sort:
- most recently updated descending

### 12.3 Row styling
Each row should make it obvious whether it is:
- selected
- running
- failed
- draft

### 12.4 Row click behavior
Clicking a row selects that job and populates left panel.

This relationship must be obvious. The selected row needs stronger styling than it currently has.

### 12.5 Row actions menu
Per-row overflow menu:
- Duplicate
- Rename
- Delete
- Run again (if applicable)

---

## 13) Exact label recommendations

### Page title
`Pipeline Services / Index Builder`

This is okay as-is if consistent with rest of app.

### Main list heading
`Index Jobs`

### Empty left state title
`Index Builder`

### Primary object label
`Index Job`

### Status chips
For jobs:
- `Draft`
- `Ready`
- `Running`
- `Failed`
- `Complete`
- `Invalid`

For runs, use lower-level stage details separately.

### Primary CTAs
- `New Index Job`
- `Save draft`
- `Save changes`
- `Save and start`
- `Start run`
- `Retry run`
- `View artifacts`

### Tabs
- `Files`
- `Config`
- `Runs`
- `Artifacts`

Avoid calling the top-level list `Runs` if it contains jobs.

---

## 14) Current-screen-to-target mapping

### Current issue: giant Start button at bottom of left panel
Replace with:
- header action area
- or compact sticky footer directly attached to form section

Do not leave the primary action alone in a huge dead zone.

### Current issue: ambiguous timestamp under name
Replace with explicit metadata row:
- Created
- Last edited
- Last run

### Current issue: file upload area is too small
Replace with a larger first-class drop zone in Files tab.

### Current issue: right table says Runs but includes draft-like objects
Replace with `Index Jobs` table and move run history into selected job.

### Current issue: progress list exists on same canvas as authoring leftovers
When running, switch content emphasis into monitoring mode.

---

## 15) State machine (frontend view)

### Job-level states

#### `empty`
No selection.
Show intro card.

#### `draft`
Selected job exists but may be unsaved or partially complete.
Show Files / Config authoring.

#### `ready`
Saved and valid.
Show `Start run`.

#### `running`
Show monitoring emphasis.
Show active run progress.

#### `failed`
Show failure summary + retry affordance.

#### `complete`
Show artifacts and latest run summary.

### Transition examples

- empty -> draft: user clicks New Index Job
- draft -> ready: save succeeds and validation passes
- ready -> running: Start run
- running -> complete: backend run success
- running -> failed: backend run failure
- failed -> running: Retry run
- ready -> draft: user edits files/config and introduces unsaved changes

---

## 16) Suggested API / frontend view model split

Engineering will need to avoid overloading one status field.

Recommended separation:

### Job status
Used for list rows and selected job header.
Values:
- draft
- ready
- running
- failed
- complete
- invalid

### Run status
Used for execution detail.
Values:
- queued
- loading_sources
- consolidating
- parsing
- normalizing
- structuring
- chunking
- lexical_indexing
- embedding
- packaging
- complete
- failed
- canceled

This will prevent the current semantic confusion where draft-like objects show up in run contexts.

### 16.2 Status derivation logic (pseudocode)

```
function deriveJobStatus(sourceSet, latestJob, hasUnsavedChanges):
  if sourceSet is null:
    return 'empty'                          // no selection
  if hasUnsavedChanges or sourceSet.source_set_id is null:
    return 'draft'                          // unsaved or never persisted
  if sourceSet.member_count == 0:
    return 'invalid'                        // saved but no files
  if latestJob is null:
    return 'ready'                          // saved, valid, never run
  if latestJob.status == 'queued' or latestJob.status == 'running':
    return 'running'
  if latestJob.status == 'failed':
    return 'failed'
  if latestJob.status == 'complete':
    return 'complete'
  return 'ready'                            // fallback
```

---

## 16b) State / CTA matrix

This is the single source of truth for what the UI shows in each state.

| State | Status Chip | Primary CTA | Secondary CTA | Disabled Actions | Metadata Shown |
|---|---|---|---|---|---|
| No selection | — | `New Index Job` | — | — | — |
| Unsaved draft | `Draft` | `Save draft` | `Discard` | `Start run` (tooltip: "Save first") | Created |
| Saved, no files | `Invalid` | — | `Delete` | `Start run` (tooltip: "Add files") | Created, Last edited |
| Saved + valid | `Ready` | `Start run` | `Duplicate` | — | Created, Last edited |
| Unsaved edits on valid job | `Unsaved changes` | `Save and start` | `Save changes` | — | Created, Last edited |
| Running | `Running` | disabled `Running…` | `Cancel run` | `Start run` | Created, Last edited, Last run |
| Failed | `Failed` | `Retry run` | `View error` | — | Created, Last edited, Last run |
| Complete | `Complete` | `View artifacts` | `Run again` | — | Created, Last edited, Last run |

**Rules:**
- `Start run` never appears alongside `Save draft`. Save first, then start.
- `Save and start` is a compound action: persist source set, then trigger job. Only shown when there are unsaved edits on a previously valid job.
- `Cancel run` is secondary and optional in v1 (backend does not support cancellation yet — button can be hidden until implemented).
- `Retry run` re-triggers on the same source set. If the user edited files since the failure, the button becomes `Save and start` instead.

---

## 17) Visual emphasis notes

This redesign is not mainly about colors.
It is mainly about what gets visual priority in each state.

### Authoring priority
1. job identity
2. file upload
3. config
4. save state
5. start action

### Running priority
1. job identity
2. run status
3. current step / progress
4. logs and details
5. historical runs

### Complete priority
1. job identity
2. success state
3. artifacts
4. rerun action
5. prior runs

---

## 18) What not to do

- do not treat draft as a run
- do not keep `Start` as the only obvious action in draft state
- do not use one timestamp to mean multiple things
- do not make the selected-row relationship subtle
- do not leave large dead space in the selected-detail pane
- do not force logs to be the default experience
- do not mix cross-job run history with selected-job authoring in the same semantic container

---

## 19) Minimum viable redesign (if we want smallest scope)

If engineering needs a practical v1 and cannot do everything:

### Keep
- two-pane layout
- page title
- general dark theme

### Change immediately
1. rename right table to `Index Jobs`
2. treat each right-side row as a job, not a run
3. move `Start` out of giant bottom zone into header or compact footer
4. add explicit `Save draft`
5. make `Start run` available only after save + valid state
6. show separate metadata labels: Created / Last edited / Last run
7. enlarge drop zone
8. add `Runs` tab inside selected job for run history

This set alone would make the product much more coherent.

---

## 20) Resolved design decisions

All questions from the original dev planning list have been answered.

### 20.1 Draft persistence
**Decision:** Persist on first explicit save, not on creation.

A new draft exists only in frontend state until the user clicks `Save draft`. This avoids orphan source sets in the database. The frontend tracks unsaved state via a local `has_unsaved_changes` flag. Files can be uploaded to `source_documents` independently before the draft is saved — they exist in the project's file pool and are selected into a source set at save time.

### 20.2 File upload before save
**Decision:** Yes, allowed.

Files upload to `source_documents` as a project-level action. Selecting files into a source set is a separate step. The user can upload files, select them, and only then save the draft. This matches the existing backend: uploads and source set creation are independent API calls.

### 20.3 Editing invalidates ready state
**Decision:** Yes.

Any file or config change on a `ready` or `complete` job sets `has_unsaved_changes = true` in frontend state. The displayed status becomes `Draft` (or `Unsaved changes` if previously valid). `Start run` is replaced with `Save and start` or gated behind `Save changes`. The backend is not affected — this is pure frontend state management.

### 20.4 Concurrent runs per job
**Decision:** No. One active run per source set.

The backend enforces this via a unique partial index on `(owner_id, pipeline_kind, source_set_id)` for queued/running jobs. The frontend does not need to handle concurrency — the `Start run` button is hidden/disabled while a run is active.

### 20.5 Artifact ownership
**Decision:** Artifacts belong to runs. The UI promotes latest-run artifacts to the job-level Artifacts tab.

`pipeline_deliverables` rows are keyed to `job_id`. The Artifacts tab on a selected job shows deliverables from the most recent completed run (fetched via `GET /jobs/latest`). If no completed run exists, the tab shows an empty state: "No artifacts yet — run this job to generate outputs."

### 20.6 Cancellation in v1
**Decision:** Out of scope.

Backend has no cancellation endpoint. The `Cancel run` button in the state/CTA matrix is hidden in v1. Jobs that stall are reaped by the heartbeat reaper after 15 minutes.

### 20.7 Inline logs in v1
**Decision:** Progress + status only. No inline logs.

The 9-stage progress tracker (already implemented in `PipelineJobStatusPanel`) is sufficient for v1. The Runs tab shows stage progression, elapsed time, and error summary on failure. Full log streaming can be added in v2.

### 20.8 Backend field coverage
**Decision:** Mapped in section 0. Summary:

- **Fully covered:** Index Job (source sets), Run (pipeline jobs), Artifact (deliverables), file upload, run lifecycle, stage tracking, artifact download.
- **Frontend-derived:** job status (draft/ready/invalid), `has_unsaved_changes`, validation state.
- **Stubbed in v1:** Config tab fields (chunking params are hardcoded in backend; embedding is auto-resolved from user settings). Config tab exists but shows read-only defaults.

---

## 21) Recommended build order

1. normalize frontend entity model: Job vs Run vs Artifact
2. rename list and labels
3. fix CTA logic and state gating
4. redesign selected-job detail header + tabs
5. add monitoring state for active run
6. add artifacts view
7. add logs/details progressively

That order should make implementation planning much easier.

