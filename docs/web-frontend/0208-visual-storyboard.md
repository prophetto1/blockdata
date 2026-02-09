# Visual Storyboard — MD-Annotate Web Frontend

**Date:** 2026-02-08
**Status:** Design draft for review
**Grounded in:** PRD (0207-prd-doc1.md), Tech Spec (0207-prd-tech-spec-doc2.md), Assessment feedback, Wizard UI pattern research, CaseScribe/Bering Lab references

---

## Layout Decision

**Chosen: Side nav + top header** (already built as Mantine `AppShell`)

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER (56px)                                               │
│  Logo/Brand .......................... user@email  [Sign out] │
├────────────┬─────────────────────────────────────────────────┤
│  SIDE NAV  │                                                 │
│  (240px)   │  MAIN CONTENT AREA                              │
│            │  (fluid width, scrollable)                      │
│  ┌──────┐  │                                                 │
│  │ nav  │  │                                                 │
│  │ items│  │                                                 │
│  │      │  │                                                 │
│  └──────┘  │                                                 │
│            │                                                 │
│  collapses │                                                 │
│  on mobile │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

**Why side nav:** The user works in context for extended periods (reviewing 200+ blocks, examining schema columns). Side nav provides persistent navigation without consuming vertical space. CaseScribe uses the same pattern. The nav collapses on mobile (Mantine `AppShell` breakpoint `sm`).

**Nav items (revised for project-centric model):**

| Icon | Label | Path | Purpose |
|---|---|---|---|
| IconFolderPlus | Projects | `/app` | Project list (new default landing) |
| IconSchema | Schemas | `/app/schemas` | Schema library (browse, create, manage) |
| IconPlug | Integrations | `/app/integrations` | Neo4j, export configs (future) |

**Removed from nav:** Upload (absorbed into project wizard), Documents (accessed within projects), Runs (accessed within projects). The nav becomes simpler as the project container absorbs the operational pages.

---

## Page 1: Projects List (Dashboard)

**Route:** `/app`
**Purpose:** The user's home after login. Shows all projects, recent activity, and the primary action button.

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects● │  My Projects                          [+ New Project]   │
│  Schemas   │  ─────────────────────────────────────────────────────  │
│  Integrate │                                                         │
│            │  ┌─[A]──────────────────────────────────────────────┐   │
│            │  │ SCOTUS Close Reading                             │   │
│            │  │                                                  │   │
│            │  │  [B]3 documents  [C]482 blocks                   │   │
│            │  │  [D]scotus_close_reading_v1                      │   │
│            │  │                                                  │   │
│            │  │  [E]████████████████████░░░░  78%                │   │
│            │  │  [F]376 complete  3 failed  103 pending          │   │
│            │  │                                                  │   │
│            │  │  [G]Updated 2 hours ago                          │   │
│            │  └──────────────────────────────────────────────────┘   │
│            │                                                         │
│            │  ┌──────────────────────────────────────────────────┐   │
│            │  │ MSA Contract Review                              │   │
│            │  │                                                  │   │
│            │  │  1 document   214 blocks                         │   │
│            │  │  contract_clause_review_v1                        │   │
│            │  │                                                  │   │
│            │  │  ████████████████████████████  100%              │   │
│            │  │  214 complete  0 failed                           │   │
│            │  │                                                  │   │
│            │  │  Completed yesterday                              │   │
│            │  └──────────────────────────────────────────────────┘   │
│            │                                                         │
│            │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   │
│            │  │ [H]                                              │   │
│            │  │  + Create your first project                     │   │
│            │  │  Upload documents, define a schema, let AI work  │   │
│            │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

### Component Inventory

| Label | Component | Mantine | Data Source | Behavior |
|---|---|---|---|---|
| **[+ New Project]** | Primary action button | `Button` variant="filled" | — | Opens wizard (Page 2) |
| **[A]** | Project card | `Card` withBorder | `projects` table | Click → Project View (Page 3). One card per project. |
| **[B]** | Document count badge | `Badge` variant="light" | `COUNT(documents_v2 WHERE project_id)` | Static stat |
| **[C]** | Block count badge | `Badge` variant="light" | `SUM(conv_total_blocks)` across project docs | Static stat |
| **[D]** | Schema ref tag | `Badge` variant="outline" color="violet" | `schemas.schema_ref` via project FK | Shows which schema is attached |
| **[E]** | Aggregate progress bar | `Progress.Root` with sections | `SUM(completed_blocks) / SUM(total_blocks)` across all runs in project | Green = complete, Red = failed, Gray = pending |
| **[F]** | Progress text | `Text` size="xs" c="dimmed" | Same aggregation | Human-readable counts |
| **[G]** | Timestamp | `Text` size="xs" c="dimmed" | `MAX(block_overlays_v2.claimed_at)` or `projects.updated_at` | Relative time ("2 hours ago") |
| **[H]** | Empty state CTA | Dashed `Card` with `Center` | — | Shows when zero projects exist. Click → wizard. |

### Notes
- Cards use `SimpleGrid cols={{ base: 1, md: 2 }}` for responsive layout
- Projects without a schema yet show "No schema attached" with a subtle "Configure" link
- Projects mid-wizard (docs uploaded but no schema) show a "Resume setup" button

---

## Page 2: New Project Wizard

**Route:** `/app/projects/new`
**Purpose:** Multi-step guided flow from naming → uploading → reviewing stats → attaching schema.
**Pattern:** Mantine `Stepper` (horizontal steps, 4 total, matches the 3–7 step best practice)

### Step 1 of 4 — Name

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects  │  New Project                                            │
│  Schemas   │                                                         │
│  Integrate │  [S] ①─Name ──── ②─Upload ──── ③─Review ──── ④─Schema  │
│            │                                                         │
│            │  ┌──────────────────────────────────────────────────┐   │
│            │  │                                                  │   │
│            │  │  Project Name *                                  │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ [A] SCOTUS Close Reading                   │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │  Description (optional)                          │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ [B] First Amendment cases, 2020 term       │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │                                    [Next →]  [C] │   │
│            │  └──────────────────────────────────────────────────┘   │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

| Label | Component | Notes |
|---|---|---|
| **[S]** | `Stepper` | 4 steps. Horizontal. Active step highlighted. Steps clickable for back-navigation. |
| **[A]** | `TextInput` required | Project name. Validates non-empty. |
| **[B]** | `Textarea` | Optional description. |
| **[C]** | `Button` "Next" | Disabled until name is non-empty. Creates `projects` row with `schema_id=null`. |

---

### Step 2 of 4 — Upload Documents

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects  │  New Project: SCOTUS Close Reading                      │
│  Schemas   │                                                         │
│  Integrate │  [S] ①─Name ──── ②─Upload ──── ③─Review ──── ④─Schema  │
│            │                                                ●                 │
│            │  ┌──────────────────────────────────────────────────┐   │
│            │  │                                                  │   │
│            │  │  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐  │   │
│            │  │  │ [D]                                       │  │   │
│            │  │  │   📄 Drop files here (.md .docx .pdf)     │  │   │
│            │  │  │         or  [Browse Files]                │  │   │
│            │  │  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘  │   │
│            │  │                                                  │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ [E] FILE LIST                              │  │   │
│            │  │  │                                            │  │   │
│            │  │  │ ✓  Mahanoy_v_BL.md      42KB   ingested   │  │   │
│            │  │  │    mdast │ 168 blocks │ 41,220 chars       │  │   │
│            │  │  │                                            │  │   │
│            │  │  │ ◐  Fulton_v_Phil.md     38KB   converting │  │   │
│            │  │  │    processing...                           │  │   │
│            │  │  │                                            │  │   │
│            │  │  │ ↑  Cedar_Point.md       51KB   uploading  │  │   │
│            │  │  │    uploading... 67%                        │  │   │
│            │  │  │                                            │  │   │
│            │  │  │ ✗  broken_file.docx     12KB   failed [F] │  │   │
│            │  │  │    Error: conversion timed out  [Retry][×] │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │  [G] + Add more files                            │   │
│            │  │                                                  │   │
│            │  │  [← Back]                     [Next →] [H]       │   │
│            │  └──────────────────────────────────────────────────┘   │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

| Label | Component | Mantine | Behavior |
|---|---|---|---|
| **[D]** | Dropzone | `Dropzone` (Mantine) | Accepts `.md`, `.docx`, `.pdf`, `.txt`. Multi-file. Calls `ingest` edge function per file. |
| **[E]** | File status list | `Stack` of `Card` rows | Each file shows: name, size, status badge, track info (mdast/docling), block count + char count (once ingested). Real-time updates via Supabase polling or channel. |
| **[F]** | Error row | `Alert` inline | Failed files show error message + Retry button + Remove (×) button. |
| **[G]** | Add more | `Button` variant="subtle" | Re-opens dropzone for additional files. User can keep adding while earlier files process. |
| **[H]** | Next button | `Button` | **Disabled** until all files are either `ingested` or removed. Grayed with tooltip: "Waiting for N files to finish processing." |

**Status badge colors:**
- `uploading` → blue (animated)
- `converting` → yellow (animated spinner)
- `ingested` → green (checkmark)
- `failed` → red (× icon, with retry)

**Key detail:** Once a file reaches `ingested`, its row expands to show the track used (`mdast` or `docling`), block count, and character count — giving immediate feedback that the document was parsed correctly.

---

### Step 3 of 4 — Review Statistics

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects  │  New Project: SCOTUS Close Reading                      │
│  Schemas   │                                                         │
│  Integrate │  [S] ①─Name ──── ②─Upload ──── ③─Review ──── ④─Schema  │
│            │                                       ●                 │
│            │  ┌──────────────────────────────────────────────────┐   │
│            │  │                                                  │   │
│            │  │  Project Summary                                 │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ [I]   3 documents                          │  │   │
│            │  │  │ [J] 482 blocks total                       │  │   │
│            │  │  │ [K] 127,431 characters                     │  │   │
│            │  │  │ [L] 131 KB total size                      │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │  Block Type Distribution                         │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ [M]                                        │  │   │
│            │  │  │ paragraph  ████████████████████  312 (65%) │  │   │
│            │  │  │ heading    ██████                 58 (12%) │  │   │
│            │  │  │ list_item  █████                  47 (10%) │  │   │
│            │  │  │ footnote   ████                   39  (8%) │  │   │
│            │  │  │ code_block ██                     15  (3%) │  │   │
│            │  │  │ other      █                      11  (2%) │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │  Per-Document Breakdown                          │   │
│            │  │  ┌────────────┬──────┬───────┬───────┬───────┐  │   │
│            │  │  │ [N]        │ Type │ Track │Blocks │ Chars │  │   │
│            │  │  ├────────────┼──────┼───────┼───────┼───────┤  │   │
│            │  │  │ Mahanoy    │  md  │ mdast │  168  │41,220 │  │   │
│            │  │  │ Fulton     │  md  │ mdast │  157  │44,891 │  │   │
│            │  │  │ Cedar_Pt   │  md  │ mdast │  157  │41,320 │  │   │
│            │  │  └────────────┴──────┴───────┴───────┴───────┘  │   │
│            │  │                                                  │   │
│            │  │  [← Back]                          [Next →]      │   │
│            │  └──────────────────────────────────────────────────┘   │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

| Label | Component | Data Source |
|---|---|---|
| **[I-L]** | Stat cards | `SimpleGrid` of `Paper` with icon + number | Aggregated from `documents_v2` rows in the project: `COUNT(*)`, `SUM(conv_total_blocks)`, `SUM(conv_total_characters)`, `SUM(source_filesize)` |
| **[M]** | Block type bar chart | Horizontal `Progress.Root` rows per type, or a simple bar chart | Aggregated `conv_block_type_freq` across all project docs (merge the JSONB maps). Color-coded per `block_type`. |
| **[N]** | Per-document table | `Table` (Mantine) | One row per document. Shows `doc_title`, `source_type`, `conv_parsing_tool` (track), `conv_total_blocks`, `conv_total_characters`. |

**Purpose:** This screen builds confidence. The user sees their corpus correctly parsed before committing a schema. If block counts look wrong, they go back and re-upload. This is purely informational — no user input needed.

---

### Step 4 of 4 — Attach Schema

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects  │  New Project: SCOTUS Close Reading                      │
│  Schemas   │                                                         │
│  Integrate │  [S] ①─Name ──── ②─Upload ──── ③─Review ──── ④─Schema  │
│            │                                                ●        │
│            │  ┌──────────────────────────────────────────────────┐   │
│            │  │                                                  │   │
│            │  │  Choose a schema for this project                │   │
│            │  │  This schema will apply to all 3 documents       │   │
│            │  │  (482 blocks total).                             │   │
│            │  │                                                  │   │
│            │  │  ┌──[O] SCHEMA SOURCE TABS─────────────────┐    │   │
│            │  │  │ [My Schemas] [Templates] [Upload JSON]  │    │   │
│            │  │  └─────────────────────────────────────────-┘    │   │
│            │  │                                                  │   │
│            │  │  ── Tab: My Schemas ──                           │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ ○ scotus_close_reading_v1              [P] │  │   │
│            │  │  │   5 fields: rhetorical_function,           │  │   │
│            │  │  │   precedents_cited, legal_principle,       │  │   │
│            │  │  │   key_entities, reasoning_type             │  │   │
│            │  │  │                                            │  │   │
│            │  │  │ ○ prose_edit_and_assess_v1                 │  │   │
│            │  │  │   4 fields: revised_block, revision_notes, │  │   │
│            │  │  │   narrative_summary, key_terms             │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │  ── Schema Preview (when selected) ──────────   │   │
│            │  │  ┌────────────────────────────────────────────┐  │   │
│            │  │  │ [Q] scotus_close_reading_v1                │  │   │
│            │  │  │                                            │  │   │
│            │  │  │ These become column headers in the grid:   │  │   │
│            │  │  │                                            │  │   │
│            │  │  │  rhetorical_function  enum (7 values)      │  │   │
│            │  │  │  precedents_cited     array of strings     │  │   │
│            │  │  │  legal_principle      string | null        │  │   │
│            │  │  │  key_entities         array of strings     │  │   │
│            │  │  │  reasoning_type       enum (5 values)      │  │   │
│            │  │  └────────────────────────────────────────────┘  │   │
│            │  │                                                  │   │
│            │  │  ── Or skip for now ──                           │   │
│            │  │  [R] You can attach a schema later from the     │   │
│            │  │  project view.                                   │   │
│            │  │                                                  │   │
│            │  │  [← Back]              [Create Project] [T]      │   │
│            │  │                  [Skip — create without schema]   │   │
│            │  └──────────────────────────────────────────────────┘   │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

| Label | Component | Behavior |
|---|---|---|
| **[O]** | Tab group | `Tabs` (Mantine) | Three tabs: "My Schemas" (existing), "Templates" (built-in library — future), "Upload JSON" (file picker for raw schema JSON). |
| **[P]** | Schema radio list | `Radio.Group` with `Card` items | Each card shows `schema_ref`, field count, and field names preview. Selecting one highlights it and shows the preview below. |
| **[Q]** | Schema preview panel | `Paper` with field table | Uses `extractSchemaFields()` to parse the selected schema's `schema_jsonb` and display each field's name, type, and enum values. This is the same function `BlockViewerGrid` uses — the user sees exactly what columns will appear. |
| **[R]** | Skip option | `Text` with `Anchor` | Allows creating the project without a schema. Documents are processed, blocks exist, but no runs are created. Schema can be attached later. |
| **[T]** | Create Project button | `Button` variant="filled" | On click: (1) sets `project.schema_id`, (2) calls `create_run_v2` for each document in the project, (3) navigates to Project View (Page 3). **Disabled** if no schema selected (unless user chooses "skip"). |

**Future enhancement (Tier 2):** The "Templates" tab would show built-in schemas (contract review, prose editing, entity extraction, citation analysis). The "AI Assist" option (not shown) would let AI examine the user's uploaded documents and recommend a schema structure.

---

## Page 3: Project View

**Route:** `/app/projects/:projectId`
**Purpose:** The project-level hub. Shows all documents in the project, aggregate run progress, and actions (run AI, export, integrate).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                      user@email [Sign out] │
├────────────┬─────────────────────────────────────────────────────────────┤
│            │                                                             │
│  Projects  │  [A] ← Projects / SCOTUS Close Reading                     │
│  Schemas   │                                                             │
│  Integrate │  [B] scotus_close_reading_v1              [C] [Change Schema]│
│            │                                                             │
│            │  ┌──[D] ACTION BAR─────────────────────────────────────┐   │
│            │  │                                                      │   │
│            │  │  [▶ Run All Pending]  [Export JSONL ▾]  [Integrate ▾]│   │
│            │  │                                                      │   │
│            │  └──────────────────────────────────────────────────────┘   │
│            │                                                             │
│            │  ┌──[E] AGGREGATE PROGRESS──────────────────────────────┐  │
│            │  │ 376 complete, 3 failed, 103 pending of 482           │  │
│            │  │ ████████████████████░░░░░░  78%                      │  │
│            │  └──────────────────────────────────────────────────────┘  │
│            │                                                             │
│            │  ┌──[F] DOCUMENT TABLE (AG Grid)────────────────────────┐  │
│            │  │                                                       │  │
│            │  │  #  │ Document             │ Type │ Track  │ Blocks  │  │
│            │  │ ────┼──────────────────────┼──────┼────────┼─────────│  │
│            │  │  1  │ Mahanoy_v_BL         │ md   │ mdast  │   168   │  │
│            │  │     │ ████████████████████  │      │        │  done   │  │
│            │  │ ────┼──────────────────────┼──────┼────────┼─────────│  │
│            │  │  2  │ Fulton_v_Phil.       │ md   │ mdast  │   157   │  │
│            │  │     │ █████████████░░░░░░░ │      │        │  74%    │  │
│            │  │ ────┼──────────────────────┼──────┼────────┼─────────│  │
│            │  │  3  │ Cedar_Point_v_Hassid │ md   │ mdast  │   157   │  │
│            │  │     │ ░░░░░░░░░░░░░░░░░░░ │      │        │  0%     │  │
│            │  │                                                       │  │
│            │  └──────────────────────────────────────────────────────┘  │
│            │                                                             │
│            │  ┌──[G] STATS CARDS─────────────────────────────────────┐  │
│            │  │  3 documents  │  482 blocks  │  127K chars  │ 131KB  │  │
│            │  └──────────────────────────────────────────────────────┘  │
│            │                                                             │
└────────────┴─────────────────────────────────────────────────────────────┘
```

### Component Inventory

| Label | Component | Behavior |
|---|---|---|
| **[A]** | Breadcrumb | `Breadcrumbs` → "Projects" (link to `/app`) / "SCOTUS Close Reading" |
| **[B]** | Schema badge | `Badge` variant="outline" color="violet" | Shows attached `schema_ref`. |
| **[C]** | Change Schema | `Button` variant="subtle" | Opens modal to switch schema (creates new runs). |
| **[D]** | Action bar | `Group` of `Button` components in a `Paper` | **Run All Pending:** kicks off worker pipeline for all pending overlays. **Export JSONL:** dropdown with options (all docs, per-doc, immutable-only). **Integrate:** dropdown → Neo4j, DuckDB (future). |
| **[E]** | Progress section | `Progress.Root` + `Text` | Aggregated across all runs in project. Green = complete, Red = failed, Gray = remaining. Updates in real-time via Supabase Realtime subscription. |
| **[F]** | Document table | AG Grid (or Mantine `Table`) | One row per document. Columns: #, title (clickable → Page 4), source_type, conv_parsing_tool, conv_total_blocks, per-doc progress bar, per-doc run status. **Click a row → Document Block Grid (Page 4).** |
| **[G]** | Stats footer | `SimpleGrid` of `Paper` stat cards | Aggregate numbers from immutable fields. |

### The "Integrate" dropdown (the KG destination)

This is the endpoint you keep coming back to — once the user is satisfied with their overlays, they don't just export JSONL, they push directly to Neo4j or another target.

```
  ┌─ Integrate ─────────────────────┐
  │                                  │
  │  🔗 Neo4j (Graph Database)      │
  │     Push nodes + edges to a     │
  │     connected Neo4j instance    │
  │                                  │
  │  📊 DuckDB (Analytics)          │
  │     Export as Parquet for        │
  │     analytical queries          │
  │                                  │
  │  🔌 Webhook (POST JSONL)        │
  │     POST to a custom endpoint   │
  │                                  │
  │  ⚙ Configure integrations...   │
  │                                  │
  └──────────────────────────────────┘
```

The Neo4j integration reads the schema's optional `graph_mapping` section (described in PRD Section 7) and maps overlay fields to nodes/edges. If no `graph_mapping` exists, the integration wizard asks the user to map fields → node types / edge types.

---

## Page 4: Document Block Grid

**Route:** `/app/projects/:projectId/documents/:sourceUid`
**Purpose:** The primary working surface. Immutable blocks on the left, schema overlay columns on the right. This is what the user spends most of their time in.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                                user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────────────────┤
│            │                                                                     │
│  Projects  │  [A] ← Projects / SCOTUS Close Reading / Mahanoy_v_BL.md          │
│  Schemas   │                                                                     │
│  Integrate │  [B] md │ mdast │ 168 blocks │ 41,220 chars                        │
│            │  [C] scotus_close_reading_v1    ● complete                           │
│            │                                                                     │
│            │  ┌──[D] TOOLBAR────────────────────────────────────────────────┐   │
│            │  │  [Export JSONL]  [▶ Run Pending]     168 blocks  │ 50/page  │   │
│            │  └─────────────────────────────────────────────────────────────┘   │
│            │                                                                     │
│            │  ┌──[E] AG GRID──────────────────────────────────────────────────┐ │
│            │  │                                                                │ │
│            │  │   IMMUTABLE (pinned left)        │ USER-DEFINED (scrollable)  │ │
│            │  │   ─────────────────────────────  │ ─────────────────────────  │ │
│            │  │   #  │ Type      │ Content       │ Status │ rhetorical_ │ pre │ │
│            │  │      │           │               │        │ function    │ced. │ │
│            │  │ ─────┼───────────┼───────────────┼────────┼─────────────┼─────│ │
│            │  │   0  │ heading   │ SUPREME COU…  │  done  │ --          │ --  │ │
│            │  │   1  │ paragraph │ This is an a…  │  done  │ issue_fra…  │ []  │ │
│            │  │   2  │ paragraph │ The loss as …  │  done  │ fact_narr…  │ []  │ │
│            │  │   3  │ paragraph │ From the ev…   │  done  │ fact_narr…  │ []  │ │
│            │  │   4  │ paragraph │ In the case…   │  done  │ rule_stat…  │ [1] │ │
│            │  │   5  │ paragraph │ But the Cou…   │  done  │ rule_appl…  │ [1] │ │
│            │  │  ... │           │               │        │             │     │ │
│            │  │                                                                │ │
│            │  │  ← scroll right for: legal_principle, key_entities,           │ │
│            │  │    reasoning_type                                              │ │
│            │  │                                                                │ │
│            │  └────────────────────────────────────────────────────────────────┘ │
│            │                                                                     │
│            │  [F]  ◄  1  2  3  4  ►     Page 1 of 4                            │
│            │                                                                     │
└────────────┴─────────────────────────────────────────────────────────────────────┘
```

### Component Inventory

| Label | Component | Existing Code | Notes |
|---|---|---|---|
| **[A]** | Breadcrumb | NEW (currently just a page title) | 3-level: Projects → Project Name → Document Name. Each level is a link. |
| **[B]** | Doc metadata bar | `Paper` with `Group` of `Badge`/`Text` | Shows `source_type`, `conv_parsing_tool` (track), `conv_total_blocks`, `conv_total_characters`. Already partially built in `DocumentDetail.tsx`. |
| **[C]** | Run/schema info | `Badge` + status indicator | Shows which schema's overlay is displayed. In a project context, the run is pre-selected (no dropdown needed — the project implies the schema). |
| **[D]** | Toolbar | `Paper` with `Group` | `RunSelector` is simplified in project context. Page size selector. Export button. Run pending button. Block count display. Already built in `BlockViewerGrid.tsx`. |
| **[E]** | AG Grid | `AgGridReact` | **Already built.** Two column groups: Immutable (pinned left: #, Type, Content) and User-Defined (scrollable: Status + one column per schema field). Schema field names ARE the column headers. Overlay data fills the cells. Custom cell renderers for badges, tooltips, arrays, nested objects. |
| **[F]** | Pagination | `Pagination` (Mantine) | Already built. Server-side pagination via `useBlocks` hook. |

### Column layout detail (what the user sees)

```
PINNED LEFT (always visible)                    SCROLLABLE RIGHT (schema-dependent)
─────────────────────────────────────          ────────────────────────────────────────────
  #  │  Type       │  Content (350px)            Status │ field_1    │ field_2    │ field_N
─────┼─────────────┼───────────────────          ───────┼────────────┼────────────┼────────
  0  │ [heading]   │ SUPREME COURT OF…            done  │ --         │ --         │ --
  1  │ [paragraph] │ This is an actio…            done  │ [badge]    │ [array]    │ [text]
  2  │ [paragraph] │ The loss as alle…            done  │ [badge]    │ [array]    │ [text]
```

- `#` = `block_index` (60px, numeric)
- `Type` = `block_type` (120px, colored badge)
- `Content` = `block_content` preview (350px, truncated with tooltip)
- `Status` = overlay processing status (100px, colored badge)
- `field_1..N` = one column per key from `schema_jsonb.properties` (160px each, resizable)

Cell renderers adapt to data type:
- `boolean` → green/gray badge (Yes/No)
- `enum string` → colored badge
- `number` → right-aligned bold text
- `string` → text with tooltip on overflow
- `array of strings` → up to 5 inline badges, "+N" for overflow
- `object` → truncated key:value preview with tooltip showing full JSON
- `null` → dimmed "--"

**Real-time updates:** The `useOverlays` hook subscribes to Supabase Realtime. When a worker writes to `block_overlays_v2`, the grid cell updates from "--" (pending) to the filled value. The user watches columns populate as AI processes blocks.

---

## Page 5: Schema Library

**Route:** `/app/schemas`
**Purpose:** Browse, create, and manage schemas independently of projects.

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects  │  Schemas                              [+ New Schema]    │
│  Schemas●  │  ─────────────────────────────────────────────────────  │
│  Integrate │                                                         │
│            │  ┌────────────────────────────────────────────────────┐ │
│            │  │ scotus_close_reading_v1                            │ │
│            │  │ 5 fields │ Used in 2 projects │ Created Feb 7      │ │
│            │  │ rhetorical_function, precedents_cited,             │ │
│            │  │ legal_principle, key_entities, reasoning_type      │ │
│            │  ├────────────────────────────────────────────────────┤ │
│            │  │ prose_edit_and_assess_v1                           │ │
│            │  │ 4 fields │ Used in 1 project │ Created Feb 7       │ │
│            │  │ revised_block, revision_notes,                     │ │
│            │  │ narrative_summary, key_terms                       │ │
│            │  ├────────────────────────────────────────────────────┤ │
│            │  │ contract_clause_review_v1                          │ │
│            │  │ 6 fields │ Used in 1 project │ Created Feb 7       │ │
│            │  │ clause_type, obligations, risk_flags,              │ │
│            │  │ defined_terms_used, cross_references, deadlines    │ │
│            │  └────────────────────────────────────────────────────┘ │
│            │                                                         │
│            │  [+ New Schema] opens:                                  │
│            │  ┌─────────────────────────────────────────────────┐    │
│            │  │  How do you want to create a schema?            │    │
│            │  │                                                  │    │
│            │  │  [Upload JSON file]                             │    │
│            │  │  Already have a schema artifact as JSON.        │    │
│            │  │                                                  │    │
│            │  │  [Start from template]  (future)                │    │
│            │  │  Browse built-in templates and customize.       │    │
│            │  │                                                  │    │
│            │  │  [Build with AI]  (future)                      │    │
│            │  │  Describe what you want to extract and AI       │    │
│            │  │  will generate a schema for you.                │    │
│            │  └─────────────────────────────────────────────────┘    │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

| Component | Notes |
|---|---|
| Schema card list | `Stack` of `Card` items. Each shows `schema_ref`, field count, field names preview, usage count (how many projects use it), creation date. Click to expand → full field table (using `extractSchemaFields`). |
| "+ New Schema" button | Opens a modal with three paths. Currently only "Upload JSON" is functional. "Start from template" and "Build with AI" are the Tier 2 features from the PRD. |

---

## Page 6: Integration Configuration (Future)

**Route:** `/app/integrations`
**Purpose:** Configure external targets that consume the platform's structured output.

```
┌──────────────────────────────────────────────────────────────────────┐
│  MD-Annotate                                    user@email [Sign out]│
├────────────┬─────────────────────────────────────────────────────────┤
│            │                                                         │
│  Projects  │  Integrations                                           │
│  Schemas   │  ─────────────────────────────────────────────────────  │
│  Integrate●│                                                         │
│            │  ┌────────────────────────────────────────────────────┐ │
│            │  │  Neo4j                                  [Configure]│ │
│            │  │  Push overlay data as nodes and edges              │ │
│            │  │  to a Neo4j graph database.                       │ │
│            │  │                                                    │ │
│            │  │  Status: ● Connected                               │ │
│            │  │  bolt://neo4j.example.com:7687                    │ │
│            │  │  Last push: 214 nodes, 387 edges (2 hours ago)    │ │
│            │  ├────────────────────────────────────────────────────┤ │
│            │  │  Webhook                                [Configure]│ │
│            │  │  POST JSONL to a custom endpoint when a            │ │
│            │  │  run completes.                                    │ │
│            │  │                                                    │ │
│            │  │  Status: ○ Not configured                          │ │
│            │  ├────────────────────────────────────────────────────┤ │
│            │  │  DuckDB / Parquet                       [Configure]│ │
│            │  │  Export structured data as Parquet for             │ │
│            │  │  analytical queries.                               │ │
│            │  │                                                    │ │
│            │  │  Status: ○ Not configured                          │ │
│            │  └────────────────────────────────────────────────────┘ │
│            │                                                         │
└────────────┴─────────────────────────────────────────────────────────┘
```

**Neo4j configuration flow** (when user clicks Configure):

1. Connection: bolt URL, credentials, database name
2. Field mapping: which overlay fields become nodes, edges, properties
   - If schema has `graph_mapping` key → auto-mapped
   - If not → user maps via a simple form (field → node label / edge type / property)
3. Test: push a single block's overlay to verify connection + mapping
4. Deploy: "Push all complete overlays" or "Auto-push on run completion"

This is the direct path from "user is satisfied with their overlays" → "knowledge graph exists" without downloading files.

---

## Navigation Flow Summary

```
Login
  │
  ▼
Projects List (Page 1)
  │
  ├── [+ New Project] → Wizard (Page 2)
  │                        Step 1: Name
  │                        Step 2: Upload
  │                        Step 3: Review Stats
  │                        Step 4: Attach Schema
  │                        │
  │                        ▼
  ├── [Click project] → Project View (Page 3)
  │                        │
  │                        ├── [Click document] → Block Grid (Page 4)
  │                        │                        (primary working surface)
  │                        │
  │                        ├── [Export JSONL ▾]  → Download
  │                        │
  │                        └── [Integrate ▾]    → Neo4j / Webhook / DuckDB
  │
  ├── Schemas (Page 5)   → Browse, create, manage schemas
  │
  └── Integrations (Page 6) → Configure Neo4j, webhooks, etc.
```

---

## Data Model Addition

One new table is required to support the project-centric model:

```sql
CREATE TABLE projects (
  project_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id),
  project_name TEXT NOT NULL,
  description  TEXT,
  schema_id    UUID REFERENCES schemas(schema_id),  -- nullable until Step 4
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FK on documents_v2 (nullable for legacy standalone docs)
ALTER TABLE documents_v2
  ADD COLUMN project_id UUID REFERENCES projects(project_id);
```

**RLS policy:** `SELECT WHERE owner_id = auth.uid()` (same pattern as all other tables).

When the wizard completes Step 4:
1. `UPDATE projects SET schema_id = :selected_schema_id`
2. For each document in the project: `SELECT create_run_v2(owner_id, conv_uid, schema_id)`
3. Navigate to Project View

---

## What Exists vs What Needs Building

| Component | Status | Notes |
|---|---|---|
| `AppShell` (header + side nav + main) | **Built** | Needs nav item updates |
| `AgGridReact` block viewer with dynamic schema columns | **Built** | `BlockViewerGrid.tsx` — works today |
| `useBlocks`, `useRuns`, `useOverlays` hooks | **Built** | Pagination, realtime, client-side join |
| `extractSchemaFields` | **Built** | Parses schema JSON → field metadata |
| Cell renderers (badge, tooltip, array, object) | **Built** | In `BlockViewerGrid.tsx` |
| `DocumentDetail` page (metadata + block grid) | **Built** | Needs breadcrumb + project context |
| `Schemas` page (list + upload) | **Built** | Needs usage count, field preview |
| `projects` table | **Not built** | New table + RLS + FK on documents_v2 |
| Projects list page (Page 1) | **Not built** | Replaces current Dashboard |
| New Project wizard (Page 2) | **Not built** | 4-step Stepper |
| Project View (Page 3) | **Not built** | New page, reuses existing hooks |
| Breadcrumb navigation | **Not built** | Simple addition |
| Integrations page (Page 6) | **Not built** | Future — Neo4j, webhook configs |
