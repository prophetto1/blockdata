# Index Builder — Design Brief

**For:** Visual/UX designer
**Context:** Dark-theme enterprise application. Desktop only (1024px+ viewport). The designer has full creative authority over layout, component choices, and interaction patterns. This brief describes the domain, the entity model, the problems, and the constraints — not the solution.

---

## What the Product Does

Users upload markdown files, configure processing settings, and run a backend pipeline that produces two downloadable artifacts:
- A **lexical search database** (SQLite file)
- A **semantic search archive** (ZIP file)

The pipeline runs on the server and reports its progress step-by-step until completion or failure.

---

## Entity Model

There are three objects the user works with. The designer must understand their relationship:

### Index Job

A named workspace. The user creates a job, uploads markdown files into it, and runs conversions from it. A job persists — the user can come back to it, upload more files, and run again.

- Has a name (user-editable)
- Contains uploaded files
- Has a status derived from what has happened with it (see Status below)
- Can produce many runs over its lifetime

### Run

One execution of the pipeline using a specific subset of the job's files and a specific configuration. A job can have many runs — the user might run with all 10 files, then run again excluding 2 that had problems, then run again after uploading a corrected version.

Each run produces its own artifacts on success.

### Artifacts

Two downloadable files produced by a successful run:
- `*.lexical.sqlite` — lexical search database
- `*.semantic.zip` — semantic search archive

---

## Job Status

Status is derived, not set manually. The designer needs to represent these states visually:

| Status | Meaning |
|--------|---------|
| Draft | Job exists but has never been saved / has unsaved changes |
| Ready | Saved, has files, can be run |
| Invalid | Saved but has zero files |
| Running | A pipeline run is currently in progress |
| Failed | The most recent run failed |
| Complete | The most recent run succeeded, artifacts available |

Status should be visible both in the jobs list and within the job detail.

---

## The Two Surfaces

### Surface 1: Index Jobs (registry/list)

This is the **top-level surface** — the page the user lands on. It is a list/registry of all jobs in the current project. It is NOT a sidebar or a narrow column. It is the primary page.

From here the user can:
- See all their jobs with name, status, last run time, last updated time
- Create a new job
- Click into a job to work on it

**Design problem to solve:** How does the user navigate from the list into a job and back? This could be a page transition, a drill-down, an expandable row, or something else. The designer decides.

### Surface 2: Inside a Job (detail)

When the user enters a job, they see **one continuous surface** — not tabs. Everything the user needs to set up and execute a conversion is on this surface:

**1. File upload area**
Drop zone for uploading markdown files into this job. Accepts `.md` and `.markdown` files.

**2. Uploaded files table**
All files the user has uploaded into this job. Each file has:
- Filename
- File size
- A checkbox (checked = included in the next run, unchecked = excluded)

The checkbox is how the user controls which files are used in a conversion. Not all uploaded files need to be used every time. This is what enables running the same job multiple times with different file combinations.

**3. Configuration**
Processing settings displayed alongside the file selection — not on a separate tab or page. These are part of the same decision as file selection ("convert *these files* with *these settings*").

v1 settings (read-only defaults, will become editable later):
- Source type: Markdown
- Chunking: Auto (512 tokens)
- Embedding: Auto-resolved from user settings

**4. Run action**
A button to start the conversion with the currently checked files and current config. Disabled when no files are checked or the job hasn't been saved.

**5. Progress / log area**
When a run starts, this area shows the pipeline's progress. Rather than a curated set of stage cards, show every step as it happens — log-style, chronological, honest. The backend reports what it's doing in real time:

```
Loading sources...          done
Consolidating...            done
Parsing 3 files...          done
Normalizing...              running
```

The designer decides the visual treatment, but the content is a live stream of backend events, not a fixed set of 9 boxes.

**6. Download buttons**
Two download buttons — one for the lexical SQLite, one for the semantic archive. These are **always visible** on the page but **disabled/inactive** until a run completes successfully. When the pipeline finishes, they activate. No separate "Artifacts" page or tab needed.

When a run completes successfully, the job's status in the Index Jobs list also updates to Complete/Success.

---

## What the Designer Needs to Solve

These are the actual design problems. The brief intentionally does not prescribe solutions.

### 1. The relationship between the jobs list and a job's detail

How does the user move between the list and a specific job? The current implementation uses a two-pane side-by-side layout that feels disjointed — the two panes don't feel connected. The list feels like a sidebar rather than the primary surface it should be.

### 2. Visual hierarchy within a job

File selection, configuration, the run action, progress, and downloads all live on one surface. How do these sections relate to each other visually? What gets emphasis when the user is setting up a run vs. when a run is in progress vs. when a run is complete?

### 3. Run history

A job can have many runs with different file selections. How does the user see past runs and their results? Can they download artifacts from a previous run? How does this history relate to the current setup area?

### 4. State communication

The job's status (Draft, Ready, Running, Failed, Complete) needs to be clear both in the list and in the detail. When a run completes or fails, that state change should feel immediate and obvious.

### 5. The "unsaved changes" problem

When the user edits a job's name or changes file selections, the job has unsaved changes. How is this communicated? The current approach uses a status chip that says "Unsaved changes" — the designer may find a better way.

---

## Constraints

- **Dark theme only.** The application uses a dark color scheme throughout.
- **Desktop only.** Minimum viewport width ~1024px. No mobile consideration needed.
- **Existing UI primitives available:** Buttons, badges/chips, scroll areas, skeleton loaders, side panels/sheets. The designer can reference these but is not bound to them.
- **The backend is complete.** All API endpoints exist. The design cannot require new backend capabilities.
- **Config is read-only in v1.** The config section shows defaults. Making it editable is a future iteration.
- **No run cancellation.** There is no backend endpoint to cancel a running pipeline. The user waits for completion or failure.

---

## Reference Products

These products have patterns worth studying (not copying):

- **Apify Console** — Job/actor pattern with runs as a child concept. Good list-to-detail navigation.
- **Braintrust Datasets** — Table registry with row selection. Clean empty states. We have screenshots of this.
- **Vercel Deployments** — Build log / progress streaming pattern. Status transitions.
- **PatternFly Primary-Detail pattern** — Red Hat's documented pattern for list-to-detail navigation in enterprise UIs. Worth browsing their pattern library for interaction ideas.
- **GitHub Actions** — Log-style step output during a workflow run.

---

## What Not to Prescribe

The previous version of this brief specified exact layout percentages, skeleton bar sizes, chip shapes, and pixel values. That was wrong — it left nothing for the designer to design. This version intentionally omits:

- Layout structure (two-pane vs. page transition vs. expandable vs. other)
- Exact component choices
- Spacing and sizing values
- Color values (beyond "dark theme" and the general status color meanings)
- Typography specifics
- Animation/transition details

The designer owns these decisions.
