# Assessment: Projects Hierarchy Plan (2026-02-09)

I interpret the goal as: make the post-login experience **project-first**, so users create/select a **Project**, then manage **Documents** (many) inside that project, and create **Runs** (document + schema) without cross-level confusion; **Schemas remain global**.

This document reviews `docs/web-frontend/0209-projects-hierarchy-plan.md` from an end-to-end, “fully built out” perspective. It flags mismatches, missing safety checks, and the minimal additions needed for a coherent UX + secure backend.

---

## Summary (Overall Verdict)

The plan’s core direction is correct:

- Introduce `projects`.
- Attach documents to a project via `documents_v2.project_id`.
- Make `/app` show Projects (not a flat “recent docs/runs” dashboard).
- Scope Document/Runs views to a selected project.
- Keep Schemas global and reusable.

However, as written it is **not yet sufficient end-to-end**, because it does not fully address the biggest source of “levels mixed” confusion: the current `Upload.tsx` wizard still bundles **Document upload + Schema selection + Run creation** into one linear flow. Even after scoping by project, that wizard will keep encouraging users to think “upload implies run,” which conflicts with your desired model (“upload many documents first; create runs when ready”).

---

## Current Reality Check (DB vs. Plan)

**Current DB (already true):**

- `public.projects` exists.
- `public.documents_v2.project_id` exists (FK to `projects.project_id`).
- Existing documents are already assigned to a default project (at least for the current owner).

This matters for execution:

- CC should **not re-apply** a “create projects table” migration without checking migration history and file naming/versioning drift.
- CC should treat the DB as “projects is already present” and focus on **frontend + edge-function alignment**.

---

## Key Gaps / Risks to Fix

### 1) Security gap: `ingest` must validate `project_id` ownership (server-side)

The plan says: “accept optional `project_id` and store it.”

That is incomplete. Because `ingest` uses the **service role**, RLS will not protect you. If you accept a `project_id` from the client, you must **explicitly verify**:

- `project_id` exists, and
- `projects.owner_id == auth.uid()` of the caller.

Otherwise a malicious user can upload a document into another user’s project by guessing a UUID.

**Advice:** Treat this validation as non-negotiable.

### 2) UX gap: Upload wizard still conflates levels (Document vs Run)

Today’s `Upload.tsx` implements:

1. Upload & extract blocks (Document)
2. Select/upload schema (Schema)
3. Create run (Run)

Even project-scoped, this makes “uploading a document” feel like it *requires* selecting a schema and starting a run.

**To match your intended hierarchy**, the product should support:

- Upload documents to a project (repeat many times), *without forcing a run*.
- Create a run later from a document row (pick schema, start run).

**Advice:** Split this into two clear entry points inside Project Detail:

- **“Upload document(s)”** → document ingest only (ends after step 1).
- **“New run”** → choose document (from this project) + schema (global) and create run.

You can still keep a single wizard if you must, but it needs an explicit “I only want to upload” completion path after Step 1 that returns to the project.

### 3) “Create one project at a time” is not defined in the plan

There are two interpretations:

- **A)** user can have **only one project total** (hard constraint)
- **B)** user can have many projects, but works in **one active project at a time** (UX constraint)

The plan assumes “multiple projects” (list page, click to open). If you meant (A), the plan needs a hard guard (DB constraint or app logic).

**Advice:** Decide explicitly. Most products want (B).

### 4) Plan’s SQL snippet for `set_updated_at` is unsafe/outdated

The plan redefines `public.set_updated_at()` without `SET search_path = ''`.

Your repo already uses a hardened version (security advisory mentioned in prior migrations). Reintroducing the older pattern is risky and inconsistent.

**Advice:** Reuse the existing `public.set_updated_at()` and only add a trigger for `projects.updated_at`.

### 5) Navigation + deep-link behavior needs explicit acceptance criteria

Once routes become project-scoped, you need to decide:

- Can a user deep-link to `/app/documents/:sourceUid` without project context?
- If yes, should the app infer the project from the document and redirect to the scoped route?
- If no, should the old routes be removed/redirected?

The plan implies removing/renaming routes, but doesn’t specify redirect behavior.

**Advice:** Add explicit redirect rules to avoid “404s” from old bookmarks.

---

## Recommended End-to-End Flow (Minimal Coherent MVP)

1. User logs in → `/app` shows **Projects list**
2. User creates project (or opens Default Project)
3. Project Detail shows:
   - Documents (in this project)
   - Runs (for docs in this project)
4. Upload document → returns to Project Detail, document appears
5. Create run → select document (from this project) + schema (global) → run appears and links to Run Detail
6. Document Detail / Block Viewer works and stays within project-scoped navigation
7. Schemas remain global, accessible from sidebar

This removes the “levels mixed” feeling immediately.

---

## Additional Recommendations (Worth Doing Early)

- **Make `project_id` required** for new documents once the UI/edge-function is updated (optional staged rollout).
- Add a simple “Project switcher” affordance (even just a back link) so users don’t feel trapped in deep routes.
- On Project list: show “Default Project” clearly as system-created.

---

## Execution Notes for CC (Staying on Course)

To keep implementation aligned and avoid scope creep, CC should:

- Treat “Projects is the dashboard” as the north star; do not keep the old flat dashboard.
- Ensure the server validates `project_id` ownership in `ingest`.
- Ensure upload does not force run creation (either separate flows or a hard “upload only” completion).
- Keep schemas global; runs always derive project context from the chosen document.

---

## Open Questions (Need a Decision)

1) Does “create one project at a time” mean **only one project total**, or **one active at a time**?

**Decision (locked):** many projects per user; one active at a time (UI/workflow constraint, not a DB singleton rule).

2) Should a Document be allowed to exist without a Project (`project_id IS NULL`) after migration, or should it be enforced as NOT NULL once the UI is project-scoped?
