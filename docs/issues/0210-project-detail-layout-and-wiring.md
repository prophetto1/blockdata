# Issue: ProjectDetail Layout + Wiring Gaps

**Filed:** 2026-02-10
**Status:** Open
**Severity:** Medium (UX confusion + one data bug)
**Page:** `web/src/pages/ProjectDetail.tsx`

---

## 1. Layout: Schema/Bulk Actions Bar Is Mispositioned

**Current:** The schema scope selector, bulk action buttons, summary badges, and progress bar sit in a full-width `Paper` bar above the Documents/Runs two-column grid. This creates a visual disconnect — the schema/run controls feel detached from the content they govern.

**Problem from screenshot:** The bar spans the full width at the top, pushing the Documents and Runs panels down. The bulk actions (Apply Schema to All, Run All Pending, Confirm All, Export All) are crammed into the left side of the top bar, while the overlay status badges (confirmed/staged/pending/failed) float far right. The user has to visually bridge three separate zones.

**Proposed fix:** Restructure ProjectDetail into a three-column layout:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Breadcrumbs > Projects > test-jon                                    │
│ test-jon                                    [Edit] [Upload] [Delete] │
├────────────────────┬──────────────────────┬──────────────────────────┤
│ Documents (3)      │ Schema & Actions     │ Runs (0)                 │
│                    │                      │                          │
│ pdf test      FAIL │ Schema scope: [v]    │ No runs yet.             │
│ aswsd      INGEST  │ [Apply Schema to All]│                          │
│ wss        INGEST  │ [Run All Pending]    │                          │
│                    │ [Confirm All]        │                          │
│                    │ [Export All (ZIP)]   │                          │
│                    │                      │                          │
│                    │ ──── Summary ────    │                          │
│                    │ 2 docs • 0 overlays  │                          │
│                    │ ████░░░░░ 0%         │                          │
│                    │ 0 conf 0 staged ...  │                          │
├────────────────────┴──────────────────────┴──────────────────────────┤
```

- **Left column:** Documents list (as-is)
- **Center column:** Schema selector + bulk actions + summary dashboard + progress bar
- **Right column:** Runs list (as-is)

This keeps schema/run context visually centered between the entities it connects.

**Implementation notes:**
- Change the `SimpleGrid cols={{ base: 1, md: 2 }}` to a 3-column layout on md+ breakpoints
- Move the `Paper p="sm" withBorder mb="md"` (schema/bulk actions bar) into the center column
- On mobile (base), stack: documents → schema/actions → runs

---

## 2. "0 document(s)" Shows Wrong Count When Schema Is Selected

**Current behavior (line 237-239):**
```tsx
const documentsInScope = selectedSchemaId
  ? new Set(runsInScope.map((run) => run.conv_uid)).size
  : docs.length;
```

When a schema is selected but no runs exist for it yet, `runsInScope` is empty, so `documentsInScope` = 0. The summary text reads "0 document(s) • 0 block overlay(s)" even though the Documents panel clearly shows 3 documents.

**Why it's confusing:** The user selects a schema, sees "0 documents" in the summary, but sees 3 documents in the panel below. The summary is technically scoped to "documents that have runs for this schema" but there's no label explaining that.

**Fix options:**

**Option A (Recommended):** Always show total document count, add a scoped label:
```
3 documents • 0 with runs for prose_optimizer_v1 • 0 block overlay(s)
```

**Option B:** Show both counts:
```
3 documents (0 with schema applied) • 0 block overlay(s)
```

**Option C:** Don't scope document count to the schema — just show `docs.length` always. Only overlay counts need schema scoping.

---

## 3. Status Badges (Top-Right) — What Are They?

From the screenshot, the top-right area shows:
```
Active schema: prose_optimizer_v1
0 CONFIRMED  0 STAGED  0 PENDING  0 FAILED
```

**What they are:** These are the project-level overlay summary badges from Phase 5B.5 (`ProjectDetail.tsx:657-661`). They show the aggregate status of all `block_overlays_v2` rows across all runs in the project that use the selected schema.

**Why they show 0:** The project has no runs yet (Runs panel shows "Runs (0)"). Since no runs exist, there are no overlay rows, so all counts are 0.

**Potential improvement:** When all counts are 0 and no runs exist, hide the badges or show a contextual message like "No runs yet — apply a schema to get started." Showing four "0" badges is visual noise that doesn't help the user.

---

## 4. Wiring Verification: Is Everything Operational for a Fresh Project?

Checked each feature path for a new project with documents but no runs:

| Feature | Wired? | Notes |
|---|---|---|
| Document list | Yes | Loads via `TABLES.documents` filtered by `project_id` |
| Document status badges | Yes | Color-coded by status (ingested/converting/failed) |
| Realtime doc updates | Yes | Subscription on `documents_v2` filtered by `project_id` |
| Schema selector | Yes | Loads all schemas (global, not project-scoped) |
| "Apply Schema to All" | Yes | Filters ingested docs without existing runs for selected schema |
| "Run All Pending" | Yes, but disabled | `runsInScope.length === 0` disables the button (correct) |
| "Confirm All" | Yes, but disabled | Same guard (correct) |
| "Export All (ZIP)" | Yes, but disabled | Same guard (correct) |
| Summary badges | Yes, but misleading | Shows "0 document(s)" due to scoping bug (see #2) |
| Progress bar | Yes | Hidden when `totalBlocks === 0` (correct) |
| Runs list | Yes | Shows empty state message |
| Upload button | Yes | Routes to `/app/projects/:projectId/upload` |
| Delete project | Yes | Calls `delete_project` RPC with cascade |
| Edit project | Yes | Updates `project_name` and `description` |

**Overall verdict:** The page is functionally wired. The main issues are layout (schema bar position) and the misleading "0 document(s)" count. No broken data flows.

---

## Action Items

1. **Restructure to 3-column layout** (documents | schema+actions | runs)
2. **Fix document count scoping** (always show total docs, add "with schema applied" qualifier)
3. **Hide overlay badges when no runs exist** (reduce visual noise on fresh projects)
4. **Optional: Add "Get started" CTA in center column** when no runs exist yet
