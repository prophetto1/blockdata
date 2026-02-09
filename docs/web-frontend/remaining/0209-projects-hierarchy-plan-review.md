# Plan Review: Add Projects Hierarchy

**Reviewer:** Claude Opus 4.6 (session 2)
**Plan under review:** `0209-projects-hierarchy-plan.md`
**Cross-referenced:** `0209-projects-hierarchy-assessment.md` (Codex review)
**Scope:** End-to-end assessment — database, edge functions, frontend, UX coherence

---

## Verdict: Structurally sound, with 8 gaps to close

The plan correctly identifies the core problem (flat user-to-document hierarchy, no project grouping) and proposes the right solution shape. Migration 008 is already applied and looks clean. Below are the combined gaps from both reviews, ranked by severity.

---

## Gap 1 — RESOLVED: `ingest/index.ts` now writes `project_id`

~~The edge function parsed `project_id` from form data but never included it in either INSERT statement.~~

**Status:** Fixed. Both the markdown path (line 156) and non-markdown path (line 230) now include `project_id` in the insert.

---

## Gap 2 — CRITICAL: `ingest` must validate `project_id` ownership server-side

*Source: Codex assessment #1*

The `ingest` edge function runs with **service-role credentials**, which bypass RLS entirely. It currently accepts `project_id` from the client and writes it directly to `documents_v2` without verifying the caller owns that project.

A malicious user can upload a document into another user's project by guessing a UUID.

**Required fix:** Before either INSERT path, add an explicit ownership check:

```ts
if (project_id) {
  const { data: proj, error: projErr } = await supabaseAdmin
    .from("projects")
    .select("project_id")
    .eq("project_id", project_id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (projErr || !proj) {
    return json(403, { error: "Project not found or not owned by you" });
  }
}
```

This is non-negotiable. Without it, the feature has an authorization bypass.

---

## Gap 3 — HIGH: Upload wizard conflates three levels

*Source: Both reviews*

The current `Upload.tsx` is a 3-step Stepper:
1. Upload document
2. Choose/upload schema
3. Create run

Steps 2-3 (schema selection + run creation) are **run-level concerns**, not document-upload concerns. Even after scoping by `projectId`, the wizard makes "uploading a document" feel like it *requires* selecting a schema and starting a run. This directly conflicts with the user's stated model: "upload many documents first; create runs when ready."

**Recommendation:** Split into two entry points inside ProjectDetail:
- **"Upload document(s)"** — document ingest only (step 1), returns to ProjectDetail on completion
- **"New run"** — choose document (from this project) + schema (global pool) -> create run

The Upload.tsx wizard should shrink to upload-only when accessed via `/app/projects/:projectId/upload`.

---

## Gap 4 — HIGH: Retry path in `ingest` loses `project_id`

*Source: Session 2 review*

The retry path in `ingest/index.ts` (lines 88-91) handles failed conversions by deleting the stale `documents_v2` row and falling through to re-insert from scratch. The re-insert now includes `project_id` (since Gap 1 is fixed), but it reads `project_id` from the **current request's form data**, not from the deleted row.

If a user retries an upload without sending `project_id` (or sends a different one), the document silently changes or loses its project association.

**Action:** Before deleting the stale row, read its `project_id` and use it as a fallback:

```ts
const previousProjectId = existing.project_id;
// ... delete stale row ...
// Later: use project_id || previousProjectId in the insert
```

---

## Gap 5 — MEDIUM: `project_id` should become NOT NULL (follow-up)

*Source: Both reviews*

The migration adds `project_id UUID` as nullable with `ON DELETE SET NULL`. Correct for backfill, but the plan never mentions tightening this. If `project_id` stays nullable:
- Frontend must handle orphaned documents everywhere
- A bug in the upload path silently creates unscoped documents
- Queries filtering by `project_id` must handle NULLs

**Recommendation (tracked follow-up):**
1. After verifying all upload paths reliably set `project_id`, add migration: `ALTER TABLE documents_v2 ALTER COLUMN project_id SET NOT NULL;`
2. Reject uploads without a valid `project_id` in the edge function (400 error)

---

## Gap 6 — MEDIUM: Sidebar active-state logic will break

*Source: Session 2 review*

`AppLayout.tsx` currently checks:
```ts
active={
  item.path === '/app'
    ? location.pathname === '/app'
    : location.pathname.startsWith(item.path)
}
```

At `/app/projects/abc-123`, `location.pathname` is NOT `/app`, so "Projects" won't highlight. The user sees no active sidebar item while inside a project.

**Action:** Change the active check to:
```ts
location.pathname === '/app' || location.pathname.startsWith('/app/projects')
```

---

## Gap 7 — MEDIUM: Breadcrumbs and old-route redirects underspecified

*Source: Both reviews (Codex adds redirect angle)*

The plan says "add breadcrumb context" but leaves it completely open. Codex correctly adds: old routes like `/app/documents/:sourceUid` will 404 after restructuring — need explicit redirect rules.

**Breadcrumb recommendation:**
- `/app/projects/:projectId` -> `Projects > Project Name`
- `/app/projects/:projectId/upload` -> `Projects > Project Name > Upload`
- `/app/projects/:projectId/documents/:sourceUid` -> `Projects > Project Name > Doc Title`
- `/app/projects/:projectId/runs/:runId` -> `Projects > Project Name > Run xyz...`

Each segment should be a clickable link.

**Redirect recommendation:** For any old flat routes that get removed (`/app/documents/:sourceUid`, `/app/runs/:runId`), add redirects that infer the project from the document/run and send to the scoped URL. This prevents 404s from bookmarks or shared links.

---

## Gap 8 — LOW: Documents.tsx and RunsList.tsx cleanup is ambiguous

*Source: Session 2 review*

The plan says these pages "may become unnecessary" or "merge into ProjectDetail." This ambiguity risks orphan pages with flat global queries coexisting alongside project-scoped views.

**Recommendation:** Be explicit:
- **Remove** the standalone `/app/documents` and `/app/runs` routes
- **Remove** or gut `Documents.tsx` and `RunsList.tsx` — their functionality moves into `ProjectDetail.tsx`
- A "view all documents across all projects" feature is separate scope, not the current pages

---

## Gap 9 â€” MEDIUM: Migration version drift (repo vs. applied DB)

*Source: Codex investigation during assessment*

The remote database records migration `008_projects` as applied under a different timestamped version than the repo file name (DB: `20260209201249`, repo file: `20260209135000_008_projects.sql`).

This is easy to ignore until someone runs migrations via CLI/CI and gets unexpected behavior (double-apply attempts, “already exists” noise, or divergent histories).

**Recommendation:** After v1 stabilizes, reconcile migration history so the repo migration filenames match the DB’s recorded versions (or add a no-op “sync” migration that documents the already-applied state and prevents future confusion). Treat this as hygiene, but do not let it slip indefinitely.

---

## Gap 10 â€” MEDIUM: Project-scoped routes must verify membership (redirect or error)

When routes become project-scoped (e.g. `/app/projects/:projectId/documents/:sourceUid`), the UI should not silently display a document/run that belongs to a *different* project if the URL is wrong.

Even with owner-only RLS, this matters because it breaks the “active project context” mental model and makes navigation/breadcrumbs inconsistent.

**Recommendation:** In `DocumentDetail` / `RunDetail` (or route loaders), compare:

- document.project_id vs route `projectId`
- run.conv_uid â†’ documents_v2.project_id vs route `projectId`

Then either (a) redirect to the correct scoped URL, or (b) show “Not found in this project.”

---

## Additional findings from Codex assessment

### "Create one project at a time" ambiguity

*Source: Codex #3*

The user said "create one project at a time." Two interpretations:
- (A) User can have **only one project total** (hard constraint)
- (B) User can have many projects, works in **one active at a time** (UX constraint)

**Decision (locked):** Interpretation (B) — many projects per user, one active at a time. No DB singleton rule.

### `set_updated_at` function: reuse existing hardened version

*Source: Codex #4*

The plan's SQL snippet for `set_updated_at()` lacks `SET search_path = ''`. The repo already has a hardened version (migration 004). The actual migration 008 correctly reuses it via `EXECUTE FUNCTION public.set_updated_at()` rather than redefining it. No action needed — the plan's prose was inaccurate but the implementation is correct.

### DB already applied — don't re-run

*Source: Codex*

Migration 008 is already applied to the remote database. CC must not re-apply it. The focus should be on frontend + edge function alignment, not schema changes.

---

## Minor observations (non-blocking)

1. **`ON DELETE SET NULL` vs `CASCADE`:** Deleting a project orphans its documents. The UI should enforce "delete all docs first" or offer to cascade. Not blocking for v1.

2. **Unique constraint `(owner_id, project_name)`:** The backfill creates "Default Project." If a user already has one, the `WHERE NOT EXISTS` clause prevents a duplicate insert, but then the UPDATE for that user's orphaned docs won't fire (the CTE `inserted` is empty). Edge case — unlikely in dev, but worth a note.

3. **`owner_id DEFAULT auth.uid()`:** Works for frontend inserts, would fail in service-role contexts. Fine for now since project creation is frontend-only.

4. **No project rename/delete UI:** RLS policies support UPDATE/DELETE, but no page includes those controls. Users will eventually need this.

---

## Recommended execution strategy

Let CC implement the original plan as-is. The plan's structure is correct and the gaps are **additive** (layered on top of working code, not requiring a teardown). After CC finishes:

1. **Immediate fixes** (Gaps 2, 4, 6): security validation, retry path, sidebar active state
2. **UX refinement** (Gaps 3, 7): split Upload wizard, add breadcrumbs + redirects
3. **Cleanup** (Gap 8): remove dead flat pages/routes
4. **Follow-up migration** (Gap 5): `project_id NOT NULL`

This avoids interrupting CC's momentum while ensuring nothing ships broken.

---

## Consolidated checklist for post-implementation review

- [ ] **SECURITY:** Validate `project_id` ownership in `ingest` (service-role bypass)
- [ ] **DATA:** Preserve `project_id` in retry path (delete + re-insert failed docs)
- [ ] **UX:** Split Upload.tsx — upload-only when project-scoped; run creation in ProjectDetail
- [ ] **UI:** Fix sidebar active state for `/app/projects/*` routes
- [ ] **NAV:** Implement clickable breadcrumbs in all project-scoped pages
- [ ] **NAV:** Add redirects for old flat routes (`/app/documents/:id` -> scoped URL)
- [ ] **CLEANUP:** Remove flat `/app/documents`, `/app/runs`, `/app/upload` routes and pages
- [ ] **DB:** Follow-up migration to make `project_id NOT NULL`
- [ ] **META:** Reconcile migration version drift for `008_projects` (repo vs DB history)
- [ ] **ROUTES:** Verify doc/run belongs to route `projectId` (redirect or error)
