# Add Projects Hierarchy

## Context

The current app has a flat structure: Dashboard shows Documents and Runs directly owned by the user. There's no grouping concept. The user wants a clear hierarchy:

```
User logs in → sees Projects (create one at a time)
  → inside a Project: upload Documents (multiple), create Runs
Schemas remain global — created separately, reused across projects
```

Currently, the sidebar already says "Projects" but `/app` renders a flat dashboard of recent docs + runs. Documents, runs, schemas, and blocks all hang directly off `owner_id` with no intermediate project entity.

---

## What Changes

### 1. Database: new `projects` table + FK on `documents_v2`

**New table:**
```sql
CREATE TABLE public.projects (
  project_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id),
  project_name TEXT NOT NULL,
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_owner ON projects(owner_id, created_at DESC);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- RLS: owner can SELECT, INSERT, UPDATE, DELETE their own projects
```

**`updated_at` trigger** (without this, `updated_at` always equals `created_at`):
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Add column to `documents_v2`:**
```sql
ALTER TABLE documents_v2 ADD COLUMN project_id UUID REFERENCES projects(project_id);
```

Nullable initially. **Backfill:** create one "Default Project" per distinct `owner_id` in `documents_v2`, then assign each doc to its owner's default project. Handles multiple users gracefully, not just the current single user.

**No changes to:** `schemas`, `blocks_v2`, `block_overlays_v2`, `runs_v2`. Runs inherit project context through their document (`runs_v2.conv_uid` → `documents_v2.conv_uid` → `documents_v2.project_id`). Schemas are global.

### 2. Edge Function: `ingest/index.ts`

Accept optional `project_id` from form data. Pass it through to the `documents_v2` insert. One-line additions — no structural changes.

**File:** `supabase/functions/ingest/index.ts`

### 3. Frontend: Types

Add `ProjectRow` to `web/src/lib/types.ts`. Add `project_id` to `DocumentRow`. Add `'projects'` to `web/src/lib/tables.ts`.

### 4. Frontend: New page — Projects list (replaces Dashboard)

**New file:** `web/src/pages/Projects.tsx`

- Fetches `projects` table filtered by owner (RLS handles it)
- Shows cards/list of projects with name, description, doc count, last activity
- "New Project" button → inline modal or simple form (name + optional description)
- Empty state: prompt to create first project
- Click a project → navigate to `/app/projects/:projectId`

**Modify:** `web/src/pages/Dashboard.tsx` — delete or redirect to Projects

### 5. Frontend: New page — Project Detail

**New file:** `web/src/pages/ProjectDetail.tsx`

- Reads `projectId` from route params
- Fetches project metadata + documents for this project + runs for those documents
- Two sections:
  - **Documents** — table of docs in this project, with upload button
  - **Runs** — table of runs for docs in this project, with "New Run" inline form (pick doc + pick schema from global pool)
- Upload button → navigates to `/app/projects/:projectId/upload`

### 6. Frontend: Update Upload page

**Modify:** `web/src/pages/Upload.tsx`

- Read `projectId` from route params
- Pass `project_id` in the FormData to the ingest edge function
- After upload, navigate back to project detail (not the flat documents list)

### 7. Frontend: Update routing

**Modify:** `web/src/router.tsx`

```
/app                                → Projects list (was Dashboard)
/app/projects/:projectId            → Project detail (docs + runs)
/app/projects/:projectId/upload     → Upload (scoped to project)
/app/projects/:projectId/documents/:sourceUid → Document detail / block viewer
/app/projects/:projectId/runs/:runId → Run detail
/app/schemas                        → Schemas (global, stays in top nav)
```

### 8. Frontend: Update navigation

**Modify:** `web/src/components/layout/AppLayout.tsx`

Nav items stay as-is (Projects + Schemas + Integrations). The "Projects" link already points to `/app`. When inside a project, add breadcrumb context in the header or a back-to-project link.

### 9. Frontend: Update existing pages for project-scoped routes

- **Documents.tsx** — may become unnecessary (ProjectDetail shows docs). Keep if we want a standalone list, but scope queries by project_id.
- **RunsList.tsx** — same: merge into ProjectDetail or scope by project.
- **DocumentDetail.tsx** — update links/breadcrumbs to include project context in URL.
- **RunDetail.tsx** — update links/breadcrumbs similarly.

---

## Files to Modify

| File | Change |
|:--|:--|
| `supabase/functions/ingest/index.ts` | Accept + store `project_id` |
| `web/src/lib/types.ts` | Add `ProjectRow`, add `project_id` to `DocumentRow` |
| `web/src/lib/tables.ts` | Add `projects: 'projects'` |
| `web/src/router.tsx` | New project-scoped routes |
| `web/src/components/layout/AppLayout.tsx` | Breadcrumb/back-link when inside a project |
| `web/src/pages/Dashboard.tsx` | Replace with Projects list (or rename) |
| `web/src/pages/Upload.tsx` | Read `projectId` from params, send in FormData |
| `web/src/pages/DocumentDetail.tsx` | Update nav links for project-scoped URLs |
| `web/src/pages/RunDetail.tsx` | Update nav links for project-scoped URLs |
| `web/src/pages/RunsList.tsx` | Scope to project or merge into ProjectDetail |
| `web/src/pages/Documents.tsx` | Scope to project or merge into ProjectDetail |

## New Files

| File | Purpose |
|:--|:--|
| `web/src/pages/Projects.tsx` | Projects list (replaces Dashboard) |
| `web/src/pages/ProjectDetail.tsx` | Project overview: docs + runs |

---

## Implementation Order

1. **DB migration** — create `projects` table + RLS + add `project_id` to `documents_v2` + backfill
2. **Edge function** — update `ingest/index.ts` to accept `project_id`
3. **Types + tables** — update `types.ts` and `tables.ts`
4. **Projects.tsx** — new projects list page (replaces Dashboard at `/app`)
5. **ProjectDetail.tsx** — new project detail page
6. **Upload.tsx** — scope to project
7. **Router** — add project-scoped routes
8. **Update existing pages** — DocumentDetail, RunDetail breadcrumbs/links
9. **Cleanup** — remove or consolidate flat Documents/RunsList pages

---

## Verification

1. Create a new project from the dashboard → appears in project list
2. Open project → upload a document → doc appears in project's document list
3. Upload a second document → both visible
4. Create a run (pick doc + global schema) → run appears in project's runs
5. Navigate to document detail → block viewer works as before
6. Navigate to run detail → export works as before
7. Back button / breadcrumb returns to project
8. Schemas page still accessible from top nav, lists all schemas globally
9. Existing data backfilled into a default project
