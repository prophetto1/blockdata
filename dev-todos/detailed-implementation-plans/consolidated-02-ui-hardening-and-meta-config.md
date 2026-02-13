# Consolidated Active Todos 02: UI Hardening + Meta Configurator

This file is a verbatim consolidation of active todo/spec documents.
No summarization or truncation has been applied to source content.

Generated: 2026-02-12 22:10:26 -07:00

## Source Files
- dev-todos\0210-project-detail-layout-and-wiring.md
- dev-todos\0210-schema-wizard-and-ai-requirements.md
- dev-todos\0210-test-driven-hardening-plan.md
- dev-todos\meta-configurator-integration\spec.md
- dev-todos\meta-configurator-integration\status.md
- dev-todos\meta-configurator-integration\verbal-specs.md


---

<!-- BEGIN SOURCE: dev-todos\0210-project-detail-layout-and-wiring.md -->

# Issue: ProjectDetail Layout + Wiring Gaps

**Filed:** 2026-02-10
**Status:** Open
**Severity:** Medium (UX confusion + one data bug)
**Page:** `web/src/pages/ProjectDetail.tsx`

---

## 1. Layout: Schema/Bulk Actions Bar Is Mispositioned

**Current:** The schema scope selector, bulk action buttons, summary badges, and progress bar sit in a full-width `Paper` bar above the Documents/Runs two-column grid. This creates a visual disconnect â€” the schema/run controls feel detached from the content they govern.

**Problem from screenshot:** The bar spans the full width at the top, pushing the Documents and Runs panels down. The bulk actions (Apply Schema to All, Run All Pending, Confirm All, Export All) are crammed into the left side of the top bar, while the overlay status badges (confirmed/staged/pending/failed) float far right. The user has to visually bridge three separate zones.

**Proposed fix:** Restructure ProjectDetail into a three-column layout:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Breadcrumbs > Projects > test-jon                                    â”‚
â”‚ test-jon                                    [Edit] [Upload] [Delete] â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Documents (3)      â”‚ Schema & Actions     â”‚ Runs (0)                 â”‚
â”‚                    â”‚                      â”‚                          â”‚
â”‚ pdf test      FAIL â”‚ Schema scope: [v]    â”‚ No runs yet.             â”‚
â”‚ aswsd      INGEST  â”‚ [Apply Schema to All]â”‚                          â”‚
â”‚ wss        INGEST  â”‚ [Run All Pending]    â”‚                          â”‚
â”‚                    â”‚ [Confirm All]        â”‚                          â”‚
â”‚                    â”‚ [Export All (ZIP)]   â”‚                          â”‚
â”‚                    â”‚                      â”‚                          â”‚
â”‚                    â”‚ â”€â”€â”€â”€ Summary â”€â”€â”€â”€    â”‚                          â”‚
â”‚                    â”‚ 2 docs â€¢ 0 overlays  â”‚                          â”‚
â”‚                    â”‚ â–ˆâ–ˆâ–ˆâ–ˆâ–‘â–‘â–‘â–‘â–‘ 0%         â”‚                          â”‚
â”‚                    â”‚ 0 conf 0 staged ...  â”‚                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
```

- **Left column:** Documents list (as-is)
- **Center column:** Schema selector + bulk actions + summary dashboard + progress bar
- **Right column:** Runs list (as-is)

This keeps schema/run context visually centered between the entities it connects.

**Implementation notes:**
- Change the `SimpleGrid cols={{ base: 1, md: 2 }}` to a 3-column layout on md+ breakpoints
- Move the `Paper p="sm" withBorder mb="md"` (schema/bulk actions bar) into the center column
- On mobile (base), stack: documents â†’ schema/actions â†’ runs

---

## 2. "0 document(s)" Shows Wrong Count When Schema Is Selected

**Current behavior (line 237-239):**
```tsx
const documentsInScope = selectedSchemaId
  ? new Set(runsInScope.map((run) => run.conv_uid)).size
  : docs.length;
```

When a schema is selected but no runs exist for it yet, `runsInScope` is empty, so `documentsInScope` = 0. The summary text reads "0 document(s) â€¢ 0 block overlay(s)" even though the Documents panel clearly shows 3 documents.

**Why it's confusing:** The user selects a schema, sees "0 documents" in the summary, but sees 3 documents in the panel below. The summary is technically scoped to "documents that have runs for this schema" but there's no label explaining that.

**Fix options:**

**Option A (Recommended):** Always show total document count, add a scoped label:
```
3 documents â€¢ 0 with runs for prose_optimizer_v1 â€¢ 0 block overlay(s)
```

**Option B:** Show both counts:
```
3 documents (0 with schema applied) â€¢ 0 block overlay(s)
```

**Option C:** Don't scope document count to the schema â€” just show `docs.length` always. Only overlay counts need schema scoping.

---

## 3. Status Badges (Top-Right) â€” What Are They?

From the screenshot, the top-right area shows:
```
Active schema: prose_optimizer_v1
0 CONFIRMED  0 STAGED  0 PENDING  0 FAILED
```

**What they are:** These are the project-level overlay summary badges from Phase 5B.5 (`ProjectDetail.tsx:657-661`). They show the aggregate status of all `block_overlays_v2` rows across all runs in the project that use the selected schema.

**Why they show 0:** The project has no runs yet (Runs panel shows "Runs (0)"). Since no runs exist, there are no overlay rows, so all counts are 0.

**Potential improvement:** When all counts are 0 and no runs exist, hide the badges or show a contextual message like "No runs yet â€” apply a schema to get started." Showing four "0" badges is visual noise that doesn't help the user.

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

<!-- END SOURCE: dev-todos\0210-project-detail-layout-and-wiring.md -->


---

<!-- BEGIN SOURCE: dev-todos\0210-schema-wizard-and-ai-requirements.md -->

# Requirements: Schema Wizard + AI-Assisted Schema Creation

**Filed:** 2026-02-10
**Status:** Reference-only for Priority 7 execution planning  
**Priority 7 authority:** `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`
**Priority:** High (user-facing feature gap â€” currently schemas must be hand-authored as JSON)

---

## Problem

Today, creating a user-defined schema requires:
1. Writing a JSON object by hand (with `schema_ref`, `properties`, optionally `prompt_config`)
2. Uploading it via the Schemas page (raw JSON file upload)

This works for developers but is unusable for non-technical users. There's no guidance on what fields make sense for a given document type, no validation beyond "is it valid JSON with a `schema_ref`", and no way to iterate on a schema without re-uploading.

---

## Proposed Solution: Schema Builder Wizard

A multi-step wizard on the Schemas page that guides users from intent to deployed schema, with optional AI assistance.

### Step 1: Intent Capture

**Question:** "What do you want to extract or annotate?"

- Free-text description of the task (e.g., "I want to classify each paragraph by rhetorical function and extract key legal citations")
- Optional: select a document from an existing project as a reference sample
- Optional: select a template/starting point from a gallery of common schema patterns

**Output:** A natural-language intent string + optional reference document `conv_uid`.

### Step 2: Field Definition (Manual or AI-Assisted)

**Manual path:**
- Interactive form to add fields one at a time
- Per field: name (key), type (string/number/boolean/enum/array/object), description, required?
- For enum types: add allowed values
- For string types: optional max length hint
- Drag to reorder fields
- Live JSON preview on the right side

**AI-assisted path (requires AI connection):**
- User clicks "Suggest fields from description"
- System sends the intent from Step 1 (and optionally a sample block's content) to an LLM
- LLM returns a proposed field list with types, descriptions, and enum values
- User reviews, edits, adds/removes fields
- Can iterate: "Add a field for sentiment" â†’ AI adds it to the draft

**Combined:** Both paths feed the same field editor. AI suggestions populate the form; user always has final edit control.

### Step 3: Prompt Configuration (Optional, AI-Assisted)

If the user wants the AI worker to fill overlays automatically:

- **System instructions:** What persona/context should the AI use? (e.g., "You are a legal analyst reviewing Supreme Court opinions")
- **Per-block prompt:** What should the AI do with each block? (e.g., "For this paragraph, extract the following fields: ...")
- **Model selection:** dropdown (claude-sonnet-4-5, claude-haiku-4-5, etc.)
- **Temperature / max tokens:** advanced settings, collapsed by default

**AI-assisted:** If user provided intent in Step 1, auto-generate a draft system prompt and per-block prompt. User reviews and edits.

**Without AI:** User writes prompts manually or leaves blank (schema is still valid for manual annotation).

### Step 4: Preview + Validation

- Full JSON preview of the schema artifact
- Structural validation: is JSON object? has `schema_ref`? properties are well-formed?
- If a reference document was selected: show a mock of what the grid would look like with these columns
- Optional: run the schema against 1-3 sample blocks using the AI worker to preview output quality

### Step 5: Save + Apply

- Save schema (calls existing `POST /schemas` edge function)
- Optional: immediately apply to a project or document ("Apply to project X" button)
- Returns to schema detail page or back to project

---

## AI Connection Requirements

The wizard's AI-assisted features require an LLM API connection. This has broader implications beyond the wizard.

### What Needs AI

| Feature | AI Role | Blocking? |
|---|---|---|
| Schema wizard: field suggestions | Generate field definitions from intent description | No â€” manual path works without AI |
| Schema wizard: prompt generation | Draft system/per-block prompts from intent | No â€” user can write manually |
| Schema wizard: preview run | Process sample blocks with draft schema | No â€” preview is optional |
| Worker: overlay generation | Process all blocks in a run | Yes â€” worker is the primary AI consumer |
| Future: schema refinement chat | Iterate on schema via conversation | No â€” nice-to-have |

### AI Connection Architecture

**Current state:** The `worker` edge function already has the Anthropic Messages API integration (`ANTHROPIC_API_KEY` secret). It uses `tool_use` for structured output constrained by the schema's properties.

**What's needed for the wizard:**

1. **A lightweight LLM endpoint** â€” either:
   - A new edge function `schema-assist` that accepts intent + optional sample blocks and returns suggested fields/prompts
   - Or client-side API call from the browser (requires exposing an API key or proxy)

2. **Recommended: new edge function `schema-assist`**
   - `POST /schema-assist` with JWT auth
   - Accepts: `{ intent: string, sample_blocks?: string[], current_fields?: SchemaField[] }`
   - Returns: `{ suggested_fields: SchemaField[], system_prompt?: string, per_block_prompt?: string }`
   - Uses the same `ANTHROPIC_API_KEY` as the worker
   - Rate-limited per user (schema creation is infrequent)

3. **API key management** â€” For now, platform-managed key (same as worker). Future: user-provided keys for higher usage.

### Setting Up the AI Connection

Before any AI features work (wizard or worker), these steps are needed:

1. Set `ANTHROPIC_API_KEY` in Supabase Edge Function secrets
2. The `worker` edge function is already deployed and ready
3. Deploy `schema-assist` edge function (new, for wizard)
4. Test: create a run â†’ trigger worker â†’ overlays reach `ai_complete`

---

## Schema Gallery (Future Enhancement)

A library of pre-built schema templates that users can browse and fork:

| Template | Use Case | Fields |
|---|---|---|
| `close_reading_v1` | Literary/legal close reading | rhetorical_function, key_claims, evidence_type, confidence |
| `prose_editor_v1` | Writing improvement | revised_content, issues_found, strunk_rules_violated |
| `entity_extraction_v1` | NER from paragraphs | entities (array), entity_types, relationships |
| `contract_review_v1` | Legal contract analysis | clause_type, risk_level, obligations, parties |
| `research_coding_v1` | Qualitative research coding | codes (array), themes, memo |

Users click "Use template" â†’ pre-populates the wizard with fields and prompts â†’ customize â†’ save.

---

## Scope for Initial Implementation

**MVP (no AI required):**
- Step 2 manual field editor (form-based, no JSON hand-authoring)
- Step 4 JSON preview + validation
- Step 5 save
- Replace the current raw-JSON upload with this wizard

**V2 (requires AI connection):**
- Step 1 intent capture
- Step 2 AI-assisted field suggestions
- Step 3 AI-assisted prompt generation
- Step 4 preview run against sample blocks

**V3 (future):**
- Schema gallery / templates
- Schema versioning (fork + edit an existing schema)
- Schema refinement chat ("make the sentiment field an enum instead of a string")

---

## Dependencies

| Dependency | Status | Blocking? |
|---|---|---|
| `ANTHROPIC_API_KEY` in Supabase secrets | Not set | Blocks V2 (AI features) |
| `worker` edge function | Deployed, untested live | Blocks preview runs |
| `schema-assist` edge function | Not built | Blocks V2 (AI features) |
| Existing `POST /schemas` endpoint | Working | No â€” MVP save uses this |
| Schema field type system | Defined in `schema-fields.ts` | No â€” reuse for wizard form |

---

## Key Files

| File | Role |
|---|---|
| `web/src/pages/Schemas.tsx` | Current schemas page (list + raw JSON upload) |
| `web/src/lib/schema-fields.ts` | Extracts field metadata from schema JSON (types, enums) |
| `supabase/functions/schemas/index.ts` | Schema upload edge function |
| `supabase/functions/worker/index.ts` | AI worker (reference for LLM integration pattern) |

<!-- END SOURCE: dev-todos\0210-schema-wizard-and-ai-requirements.md -->


---

<!-- BEGIN SOURCE: dev-todos\0210-test-driven-hardening-plan.md -->

# Plan: Test-Driven Hardening of Existing Features

**Filed:** 2026-02-10
**Status:** Draft plan
**Priority:** High (stabilize before building new features)
**Rationale:** Phases 1-6 are implemented. Rather than pushing into Phases 7-9 (export variants, integrations, polish), harden what exists first. Every feature path should have automated coverage before adding new surface area.

---

## Testing Stack

| Tool | Purpose |
|---|---|
| **Vitest** | Unit + integration test runner (Vite-native, fast) |
| **React Testing Library (RTL)** | Component rendering + interaction tests |
| **MSW (Mock Service Worker)** | Mock Supabase API calls without hitting real DB |
| **Playwright** | End-to-end browser tests for critical flows |

Setup: `vitest` + `@testing-library/react` + `@testing-library/user-event` + `msw` + `playwright`

---

## Feature Inventory: What Needs Coverage

### Tier 1 â€” Core Data Paths (highest risk, test first)

These are the paths where bugs cause data loss or corruption.

| # | Feature | Entry Point | Key Files | What to Test |
|---|---|---|---|---|
| 1.1 | **Upload + ingest (MD)** | Upload.tsx â†’ `ingest` edge fn | `Upload.tsx`, `ingest/index.ts`, `process-md.ts`, `_shared/markdown.ts` | Single file upload, multi-file batch, file type rejection, max 10 limit, per-file status transitions (readyâ†’uploadingâ†’ingested), duplicate upload idempotency, project_id association |
| 1.2 | **Upload + ingest (non-MD)** | Upload.tsx â†’ `ingest` â†’ conversion service | `process-convert.ts`, `conversion-complete/index.ts`, `_shared/docling.ts` | Status transitions (readyâ†’uploadingâ†’uploadedâ†’converting), conversion_failed handling, callback processing, docling vs mdast track selection |
| 1.3 | **Schema upload** | Schemas.tsx â†’ `schemas` edge fn | `Schemas.tsx`, `schemas/index.ts` | Valid JSON upload, schema_ref dedup (idempotent), invalid JSON rejection, schema_uid conflict (409) |
| 1.4 | **Run creation** | DocumentDetail â†’ `runs` edge fn | `DocumentDetail.tsx`, `runs/index.ts`, `create_run_v2` RPC | Creates run + pending overlay rows atomically, validates document ownership, validates ingested status, correct total_blocks count |
| 1.5 | **Worker processing** | Worker edge fn | `worker/index.ts`, `claim_overlay_batch` RPC | Atomic claim (no double-processing), status transitions (pendingâ†’claimedâ†’ai_complete), writes to overlay_jsonb_staging (not confirmed), run rollup updates, failure handling + retry, cancellation check |
| 1.6 | **Confirm overlays** | BlockViewerGrid â†’ `confirm_overlays` RPC | `BlockViewerGrid.tsx`, migration 009 RPC | Atomic copy stagingâ†’confirmed, stamps confirmed_at/by, per-block confirm, bulk confirm, reject-to-pending |
| 1.7 | **Export JSONL** | DocumentDetail â†’ `export-jsonl` edge fn | `export-jsonl/index.ts` | Only exports confirmed overlays, correct v3.0 canonical shape, blocks without confirmed data get null user_defined, pairing rules respected |

### Tier 2 â€” Frontend Interactions (medium risk)

| # | Feature | Key Files | What to Test |
|---|---|---|---|
| 2.1 | **Auth flow** | `Login.tsx`, `Register.tsx`, `AuthCallback.tsx`, `lib/supabase.ts` | Login, register, sign out, session persistence, redirect after login, protected route guard |
| 2.2 | **Projects CRUD** | `Projects.tsx`, `ProjectDetail.tsx` | Create project, edit name/description, delete project (cascade confirmation), project list loading |
| 2.3 | **Document detail + grid** | `DocumentDetail.tsx`, `BlockViewerGrid.tsx` | Block loading + pagination, run selector, column visibility toggle, view mode toggle, block type filter, type-specific cell renderers |
| 2.4 | **Inline editing** | `BlockViewerGrid.tsx`, `useOverlays.ts` | Double-click staged cell â†’ edit â†’ save via RPC, type coercion (number/boolean/enum), revert on failure, non-editable for non-staged rows |
| 2.5 | **Bulk actions** | `ProjectDetail.tsx` | Apply Schema to All (skips already-bound docs), Run All Pending (multi-round dispatch), Confirm All (per-run RPC calls), Export All ZIP (file download) |
| 2.6 | **Realtime updates** | `ProjectDetail.tsx`, `useOverlays.ts` | Document status updates after upload, overlay status updates during worker processing |

### Tier 3 â€” Edge Cases + Error Handling (lower risk but important)

| # | Feature | What to Test |
|---|---|---|
| 3.1 | **Idempotency** | Re-uploading same file returns existing row, re-uploading same schema returns existing row |
| 3.2 | **Stale conversion cleanup** | pg_cron marks stale `converting` rows as `conversion_failed` after 5 minutes |
| 3.3 | **Route guards** | Legacy flat routes redirect to project-scoped URLs, document project_id mismatch redirects, 404 handling |
| 3.4 | **Concurrent workers** | Two workers claiming from same run don't overlap (SKIP LOCKED), partial batch success |
| 3.5 | **Deletion cascades** | Delete document â†’ blocks + overlays gone, delete run â†’ overlays gone, delete project â†’ everything gone |
| 3.6 | **RLS enforcement** | User A can't see User B's documents/runs/overlays via PostgREST |

---

## Recommended Execution Order

### Phase A: Setup (1-2 hours)

1. Install test dependencies:
   ```bash
   cd web && npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw
   ```

2. Configure Vitest in `vite.config.ts`:
   ```ts
   test: {
     environment: 'jsdom',
     globals: true,
     setupFiles: ['./src/test/setup.ts'],
   }
   ```

3. Create `src/test/setup.ts` with RTL matchers + MSW server setup

4. Create MSW handlers for core Supabase endpoints:
   - `POST /functions/v1/ingest` â†’ mock ingest responses
   - `POST /functions/v1/schemas` â†’ mock schema upload
   - `POST /functions/v1/runs` â†’ mock run creation
   - `GET /functions/v1/export-jsonl` â†’ mock JSONL export
   - `POST /rest/v1/rpc/*` â†’ mock RPCs (confirm_overlays, etc.)
   - `GET /rest/v1/documents_v2` â†’ mock document queries
   - `GET /rest/v1/blocks_v2` â†’ mock block queries

### Phase B: Unit Tests â€” Pure Logic (fast wins)

| File to Test | Test File | What |
|---|---|---|
| `lib/schema-fields.ts` | `schema-fields.test.ts` | `extractSchemaFields()` with various schema shapes (string, enum, number, boolean, nested, array) |
| `lib/edge.ts` | `edge.test.ts` | `edgeJson()` and `edgeFetch()` error handling, auth header injection |
| `_shared/hash.ts` | `hash.test.ts` | `sha256Hex()` determinism, `concatBytes()` |
| `_shared/markdown.ts` | `markdown.test.ts` | Block extraction from various mdast structures, block_type mapping, char_span correctness |
| `_shared/docling.ts` | `docling.test.ts` | Block extraction from DoclingDocument JSON fixtures, tree traversal, labelâ†’block_type mapping, table serialization |

### Phase C: Component Tests â€” UI Behavior

| Component | Test File | Key Scenarios |
|---|---|---|
| `Upload.tsx` | `Upload.test.tsx` | Add files via click, add via drag, reject bad file types, max 10 enforcement, upload all â†’ parallel calls, per-file retry, clear all |
| `BlockViewerGrid.tsx` | `BlockViewerGrid.test.tsx` | Renders blocks, pagination, type filter, column visibility, staging banner visible when staged overlays exist, inline edit calls RPC, confirm/reject buttons |
| `ProjectDetail.tsx` | `ProjectDetail.test.tsx` | Loads project + docs + schemas, Apply Schema to All creates runs, summary badges reflect overlay counts, delete project shows confirmation |
| `DocumentDetail.tsx` | `DocumentDetail.test.tsx` | Loads document metadata, run selector, export button calls edge function, delete document |

### Phase D: Integration Tests â€” End-to-End Data Flows

These test full requestâ†’response cycles with MSW intercepting the Supabase calls.

| Flow | Steps | Assertions |
|---|---|---|
| Upload â†’ View | Upload .md file â†’ poll documents â†’ navigate to DocumentDetail â†’ verify blocks rendered | Blocks appear in grid, block_type badges correct, pagination works |
| Schema â†’ Run â†’ Overlays | Upload schema â†’ select document â†’ create run â†’ verify overlay rows created | Run appears in selector, overlay status column shows "pending" for all blocks |
| Worker â†’ Review â†’ Confirm | Mock worker processing â†’ overlays transition to ai_complete â†’ staging banner appears â†’ confirm all â†’ overlays become confirmed | Status badges update, confirmed cells lose staging indicator, export includes confirmed data |
| Bulk Operations | Upload 3 docs â†’ Apply Schema to All â†’ Run All Pending â†’ Confirm All â†’ Export All ZIP | Correct number of runs created, all overlays processed, ZIP contains 3 JSONL files |

### Phase E: Playwright E2E (optional, highest-value flows)

| Test | What |
|---|---|
| `auth.spec.ts` | Register â†’ login â†’ see projects â†’ sign out â†’ redirect to login |
| `upload-to-export.spec.ts` | Login â†’ create project â†’ upload .md â†’ wait for ingested â†’ view blocks â†’ export JSONL â†’ verify file content |
| `schema-run-flow.spec.ts` | Login â†’ upload schema â†’ navigate to document â†’ create run â†’ verify pending overlays in grid |

---

## Success Criteria

- All Tier 1 paths have at least one happy-path test + one error-path test
- All Tier 2 components have rendering + basic interaction tests
- CI runs `vitest` on every PR (Phase 9.5, but can set up early)
- Test suite runs in under 30 seconds (no real network calls)
- Zero known data-path bugs before adding new features

---

## What This Replaces

Instead of building Phases 7-9 next, this plan hardens Phases 1-6:

| Instead of | Do this |
|---|---|
| Phase 7: Enhanced export options | Test existing export thoroughly, then add variants |
| Phase 8: Integrations | Test bulk operations + export, then build connectors |
| Phase 9: Polish (code-splitting, CI, error boundaries) | Set up test infrastructure first, polish follows naturally |

The schema wizard (separate issue doc) can proceed in parallel with testing â€” it's a new page, not a modification of existing code.

<!-- END SOURCE: dev-todos\0210-test-driven-hardening-plan.md -->


---

<!-- BEGIN SOURCE: dev-todos\meta-configurator-integration\spec.md -->

# Schema Creation Wizard + Schema Co-Pilot â€” End-to-End Spec (v0)

**Status:** Reference-only for Priority 7 execution.  
**Priority 7 authority:** `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`

This spec is written to be end-to-end: Schema authoring â†’ save â†’ run uses schema â†’ overlays display in the grid.

---

## 0) Product principle (non-negotiable)

Schema creation is **wizard-first** and **visual-first** for non-technical domain experts. Direct JSON authoring is the **escape hatch**, not the default.

---

## 1) Definitions (canonical terms)

- **Schema**: A user-owned JSON artifact stored in `schemas.schema_jsonb` that defines the per-block overlay fields for a run.
- **`schema_ref`**: User-facing slug/name (stored in `schemas.schema_ref`).
- **`schema_uid`**: Content hash of canonicalized JSON bytes (stored in `schemas.schema_uid`).
- **`schema_jsonb`**: The full schema JSON object (stored as JSONB; DB treats it as opaque).
- **`prompt_config`**: Optional section inside `schema_jsonb` that provides worker instructions and model defaults.
- **Run**: A binding of `conv_uid` + `schema_id` for one execution instance (`runs_v2`).
- **Overlay**: Per-block mutable data for a run (`block_overlays_v2.*overlay_jsonb*`), exported as `user_defined.data`.

---

## 2) System Requirements List (SRL)

SRL-1. Users can create a schema without writing JSON (wizard + visual field editor).

SRL-2. Users can edit the full schema JSON directly (power-user escape hatch).

SRL-3. Saved schemas persist in `schemas` with stable `schema_ref` + deterministic `schema_uid`.

SRL-4. Schema save is idempotent on identical content; conflicts on `(owner_id, schema_ref)` with different content are explicit and recoverable.

SRL-5. Schemas are provenance artifacts: editing defaults to **fork** (save as new schema), not in-place mutation of an in-use `schema_id`.

SRL-6. Schemas created in the wizard are compatible with the worker + grid conventions (Section 4).

SRL-7. The block viewer grid derives overlay columns from the schema and displays staged/confirmed overlay values for the selected run.

SRL-8. Platform-provided schema assistance exists and is strictly separated from user-provided API keys.

SRL-9. Advanced editor embed does not break Mantine styling and supports host-controlled theming (Section 5.4.2).

---

## 3) Data model / database constraints (Supabase)

### 3.1 `schemas` table (source of truth)

- `schema_id` UUID PK
- `owner_id` UUID NOT NULL
- `schema_ref` TEXT NOT NULL, format: `^[a-z0-9][a-z0-9_-]{0,63}$`, unique per owner
- `schema_uid` TEXT NOT NULL, format: `^[0-9a-f]{64}$`, unique per owner
- `schema_jsonb` JSONB NOT NULL (**opaque blob â€” DB does not inspect**)

### 3.2 Provenance / immutability

Runs reference `schema_id`. If `schema_jsonb` is mutated in-place for an existing `schema_id`, past runs now point to a different schema than the one they executed under.

Therefore:
- **Default edit action is fork:** â€œSave as new schemaâ€ (new `schema_id`).
- In-place replace is only allowed if the schema has **0** referencing rows in `runs_v2` (explicitly detected) and the user confirms replacement.

---

## 4) Schema artifact contract (`schemas.schema_jsonb`)

### 4.1 Baseline platform validation (hard boundary)

The platform enforces only:
- `schema_jsonb` must be a JSON object.
- `schema_ref` must be a valid slug (stored in DB column; can be derived if not explicitly provided).

Everything else is user-defined and opaque.

### 4.2 v0 conventions for worker + grid compatibility

To work end-to-end with the current worker/grid contract, wizard-produced schemas MUST satisfy:

1. `schema_jsonb.type` MUST be `"object"`.
2. `schema_jsonb.properties` MUST be an object whose keys are overlay field names.
3. Each top-level `properties[k]` MUST be a JSON Schema fragment (subset below).
4. `schema_jsonb.prompt_config` MAY be present.

Compatibility note:
- Some legacy examples use a top-level `fields` object. The grid may display `fields`, but the v0 worker contract is `properties`. The wizard MUST output `properties`.

### 4.3 Supported JSON Schema subset (wizard authoring)

Wizard MUST be able to produce:

- Top level:
  - `type: "object"`
  - `properties: { ... }`
  - `required: string[]` (optional)
  - `additionalProperties: boolean` (optional; default: `false`)
  - `$id`, `title`, `description` (optional but recommended)
- Per-field subset:
  - Common: `type`, `description`, `enum`, `default`
  - String: `minLength`, `maxLength`, `pattern`, `format`
  - Number/integer: `minimum`, `maximum`, `multipleOf`
  - Array: `items` (single schema), `minItems`, `maxItems`
  - Object: `properties`, `required`, `additionalProperties`
  - Nullable types: allow `type: ["string","null"]` etc.

### 4.4 `prompt_config` (schema-level worker instruction)

`schema_jsonb.prompt_config` is optional. When present, it is:

```json
{
  "prompt_config": {
    "system_instructions": "string",
    "per_block_prompt": "string",
    "model": "string",
    "temperature": 0.2,
    "max_tokens_per_block": 2000,
    "max_batch_size": 15
  }
}
```

Priority (model selection):
1. Request override (if present)
2. `schema_jsonb.prompt_config.model`
3. `runs_v2.model_config.model`
4. User defaults (Settings)
5. Platform defaults (env)

---

## 5) Schema Creation Wizard (UX spec)

### 5.1 Entry points

From the Schemas menu (`/app/schemas`):
- Primary action: **Create schema** â†’ opens the wizard.
- Per-row action: **View / Edit** â†’ opens the wizard in â€œedit modeâ€ (preloaded), with fork-by-default save semantics.

### 5.2 Wizard structure (exact steps)

**Step 1 â€” Intent**
- One required textbox: â€œWhat do you want to extract or annotate?â€
- Optional selector: â€œUse a sample documentâ€ (selects a `conv_uid`) to power preview and AI assistance.

**Step 2 â€” Fields**
- Visual field editor is primary.
- For each field:
  - `key` (required; unique within schema)
  - `type` (required)
  - `description` (recommended; treated as the per-field instruction prompt)
  - `required` toggle
  - Type-specific constraints (enum, min/max, items, nested properties)
- Live JSON preview exists but is secondary; user does not need to touch it.

**Step 3 â€” Prompt config (optional)**
- `system_instructions` (textarea)
- `per_block_prompt` (textarea)
- Advanced (collapsed by default): model, temperature, max tokens per block

**Step 4 â€” Preview**
- Always show the column preview: table header mock derived from the schema field keys/types.
- If a sample `conv_uid` is selected: show 1â€“3 sample blocks (read-only) and the predicted column set beside them.
- Optional AI preview (platform key): run the schema against 1â€“3 sample blocks and show suggested outputs (never auto-saved).

**Step 5 â€” Save**
- Required: `schema_ref` input (slug). The wizard enforces the slug format and shows conflicts clearly.
- Save action writes to the existing schema save boundary (Edge Function).
- Optional post-save CTA: â€œApply to a documentâ€ (creates a run) â€” out of scope for v0 if it expands scope; include only if already trivial in the UI.

### 5.3 JSON escape hatch (power-user mode)

- A JSON tab/editor can directly edit the full `schema_jsonb`.
- Rules:
  - If JSON is invalid: wizard blocks â€œNextâ€ and â€œSaveâ€ and shows parse errors.
  - If JSON is valid but doesnâ€™t match the wizardâ€™s supported subset: wizard preserves unknown keys, but may disable the visual editor for unsupported parts.

### 5.4 Advanced editor mode (MetaConfigurator-style split view)

In addition to the wizard, the Schemas menu offers an **Advanced editor** for power users working on complex schemas.

**UX:**
- Full-screen editor surface (not embedded in the wizard stepper).
- Split panels with:
  - **Text View** (raw JSON)
  - **GUI View** (property tree)
  - Optional: **Diagram View** (schema graph)
- Save is still the platformâ€™s save flow (Section 5.6): the advanced editor does not bypass schema persistence rules.

**Contract with the rest of the platform (critical):**
- v0 worker execution reads **only**:
  - `schema_jsonb.prompt_config` (if present)
  - `schema_jsonb.properties` (for structured output shape)
- Therefore, the Advanced editor MUST warn if the current schemaâ€™s effective top-level `properties` is empty/missing.
- Advanced JSON Schema constructs (`allOf/anyOf/oneOf/$ref/$defs/conditionals`) may be editable/visualized, but they are **not interpreted by v0 worker** unless `properties` is explicitly present at the top level.

**Implementation requirement (no iframe):**
- Reuse MetaConfiguratorâ€™s schema editor UI as a **mounted Vue island** (micro-frontend) that runs on a dedicated route.
- React/Mantine remains the owner of:
  - schema load (by `schema_id`)
  - schema save (calls `POST /schemas`)
  - conflict handling (`409`)
  - provenance (fork-by-default)
- The mounted editor is a pure client-side editor:
  - Input: initial `schema_jsonb` object
  - Output: updated `schema_jsonb` object via a callback/event
  - No direct DB writes from the Vue editor

#### 5.4.1 Embed contract (exact)

- The Advanced editor route loads **two static assets**:
  - `/meta-configurator-embed/meta-configurator-embed.css`
  - `/meta-configurator-embed/meta-configurator-embed.js`
- The JS registers a global:
  - `window.MetaConfiguratorEmbed.mountSchemaEditor(el, { initialSchema, onChange })`
  - Returns `{ getSchemaJson(), setSchemaJson(schemaJson), destroy() }`
- The host MUST call `destroy()` on navigation/unmount.
- Host-owned persistence:
  - Save uses `POST /schemas` (Section 5.7).
  - The embedded editor never writes to Supabase directly.

#### 5.4.2 UI theming + upgrades (requirement)

- v0 requirement is **no visual breakage** of the React/Mantine app:
  - The embedded editor CSS MUST NOT include global CSS resets (e.g., Tailwind preflight).
- The Advanced editor UI MAY differ from Mantine in v0, but MUST support:
  - system dark/light (or an explicit host-provided mode)
  - host-controlled primary color (via theme tokens / CSS variables)
- UI replacement scope:
  - Replacing MetaConfiguratorâ€™s internal PrimeVue widgets (e.g., TreeTable) with AG Grid is a **fork** and out of scope for v0.
  - AG Grid is permitted/preferred for React/Mantine surfaces (wizard tables, previews, column mocks).

### 5.5 Edit mode behavior (wizard; fork-by-default)

When opening an existing schema in the wizard:
- The user can modify it.
- Default save button is: **Save as new schema**.
- If the user attempts to save back to the same `schema_ref` with modified content, the backend conflict path (`409`) is shown, and the wizard offers â€œSave with a new schema_refâ€.

### 5.6 Edit mode behavior in advanced editor (fork-by-default)

When opening an existing schema in the Advanced editor:
- The user can modify it.
- Default save is **Save as new schema** (fork) with a new `schema_ref`.
- Attempting to save with the same `schema_ref` and different content produces `409` and a guided rename flow.

### 5.7 Persistence boundary: `POST /schemas` (exact contract)

All schema persistence goes through the existing `schemas` Edge Function.

**Method:** `POST`

**Request formats (both supported):**

1) `multipart/form-data`
- `schema_ref` (optional string) â€” user-chosen slug
- `schema` (required file) â€” JSON file contents

2) `application/json`
- Either a raw schema JSON object, **or** an object wrapper:
  - `{ "schema_ref": "optional", "schema_json": { ... } }`

**Behavior (idempotency + conflicts):**

- If `(owner_id, schema_ref)` does not exist: insert and return `200` with `{ schema_id, schema_ref, schema_uid, created_at }`.
- If `(owner_id, schema_ref)` exists and uploaded content produces the same `schema_uid`: return `200` with the existing row.
- If `(owner_id, schema_ref)` exists but uploaded content produces a different `schema_uid`: return `409` with a conflict payload.

**`schema_ref` derivation (when not provided):**
- If `$id` exists, use the tail segment (split on `:` and `/`) as the base; else if `title` exists, use it; else `"schema"`.
- Slugify:
  - lowercase
  - replace invalid chars with `_`
  - trim leading/trailing `_`
  - collapse multiple `_`
  - truncate to 64 chars

**`schema_uid` derivation (deterministic):**
- Canonicalize the schema JSON by recursively sorting object keys (arrays preserve order).
- `schema_uid = sha256_hex(JSON.stringify(canonicalized_schema_json))`

---

## 6) Platform-provided Schema Co-Pilot (v0)

### 6.1 Boundary: two AI systems (hard separation)

- **User-provided API keys** (Settings) are used for **annotation runs**.
- **Platform-provided schema assistance** uses a **platform key** and must never read or require `user_api_keys`.

### 6.2 `schema-assist` Edge Function (contract)

Endpoint: `POST /schema-assist`

Auth:
- Requires a logged-in user JWT (same as other app functions).

Request:
```json
{
  "operation": "suggest_fields" | "suggest_prompts" | "modify_schema" | "question",
  "intent": "string",
  "current_schema_json": {},
  "sample_blocks": [
    { "block_type": "paragraph", "block_content": "..." }
  ]
}
```

Response:
- For suggest/modify: `{ "suggested_schema_json": { ... } }`
- For question: `{ "answer": "..." }`

Hard requirements:
- JSON-only responses (no Markdown code fences).
- `suggested_schema_json`, when present, MUST satisfy the v0 compatibility conventions (Section 4.2).
- The function MUST NOT call the user-key infrastructure.

Rate limiting (v0):
- Per-user throttling; return `429` when exceeded.

UX rules:
- Co-Pilot output is always presented as a **proposal**.
- User must click â€œApplyâ€ to merge suggestions into the working draft.
- Co-Pilot must never directly save schemas.

---

## 7) How schema JSONB becomes grid columns (display spec)

For a selected run:

1. The frontend reads `schemas.schema_jsonb` for that run (via run â†’ schema join).
2. The grid derives overlay columns from `schema_jsonb.properties` keys:
   - Each key becomes a column (header uses the key; optional description shown in tooltip).
3. Row values come from `block_overlays_v2`:
   - If `status = 'confirmed'`: display `overlay_jsonb_confirmed[k]`
   - If `status = 'ai_complete'`: display `overlay_jsonb_staging[k]`
   - Otherwise: blank/null

Editing rule (v0):
- Users can edit overlay cells only while the row is staged (`status = 'ai_complete'`).
- Cell edits update `overlay_jsonb_staging` for that `(run_id, block_uid)`.
- Confirm actions copy staging â†’ confirmed (per existing confirm RPC semantics).

---

## 8) Acceptance criteria (end-to-end)

AC-1. A user can create a schema using the wizardâ€™s visual editor and save it.

AC-2. The saved schema appears in Schemas list with stable `schema_ref` and deterministic `schema_uid`.

AC-3. A run using the schema produces overlay data that renders as grid columns derived from `schema_jsonb.properties`.

AC-4. Editing a schema defaults to fork; saving with a conflicting `schema_ref` yields a clear, recoverable conflict path.

AC-5. (If enabled) Schema Co-Pilot can propose fields/prompts/schema modifications, and the user can apply them without breaking v0 compatibility.

<!-- END SOURCE: dev-todos\meta-configurator-integration\spec.md -->


---

<!-- BEGIN SOURCE: dev-todos\meta-configurator-integration\status.md -->

# MetaConfigurator Integration - Status (2026-02-11)

Advanced-editor reference spec: `docs/ongoing-tasks/meta-configurator-integration/spec.md` (reference-only for Priority 7 execution)
Priority 7 execution authority: `docs/ongoing-tasks/0212-priority7-schema-contracts-master-spec.md`

## Direction Lock (2026-02-11)

1. The right-side assistant panel is for the platform's internal customized assistant.
2. It is intentionally separate from user-key worker AI that processes run overlays after schema definition.
3. The Databricks screenshot is used as a spacing/density/layout reference only, not a strict geometric clone target.
4. The left-nav/top-bar geometry can differ as long as density and visual consistency goals are met.
5. System-wide tighter spacing and typography should be implemented now while UI surface area is still manageable.

## Scope

This status covers the v1 "Advanced editor" integration pathway (MetaConfigurator embed) plus the build/copy plumbing required to serve the embed from the React app.

## Implemented

### Advanced editor UI (React/Mantine)

- Routes:
  - `/app/schemas/advanced`
  - `/app/schemas/advanced/:schemaId`
- Entry points:
  - Schemas page header button: "Advanced editor"
  - Per-schema row action: pencil icon
- Behavior:
  - Optional load by `schema_id` (Supabase select on `schemas`)
  - Fork-by-default: defaults `schema_ref` to `<existing>_v2` when editing
  - Save: `POST /schemas` via `edgeFetch` (`application/json`)
  - Conflict: surfaces HTTP `409` as rename-required
  - Compatibility warnings:
    - `schema_jsonb` must be an object
    - v0 worker/grid compatibility expects top-level `properties` to be an object

Files:
- `web/src/pages/SchemaAdvancedEditor.tsx`
- `web/src/pages/Schemas.tsx`
- `web/src/router.tsx`

### MetaConfigurator embed (Vue island, no iframe)

- Build type: Vite IIFE library -> `window.MetaConfiguratorEmbed` global.
- Mount API: `mountSchemaEditor(el, { initialSchema, onChange }) -> { getSchemaJson, setSchemaJson, destroy }`.
- CSS strategy: Tailwind `components` + `utilities` only (no `@tailwind base;` / preflight).

Files (tracked fork in `third_party/`):
- `third_party/meta-configurator/meta_configurator/vite.embed.config.js` (sets `base: '/meta-configurator-embed/'`)
- `third_party/meta-configurator/meta_configurator/src/embed-entry.ts`
- `third_party/meta-configurator/meta_configurator/src/embed/EmbeddedSchemaEditor.vue`
- `third_party/meta-configurator/meta_configurator/src/embed-style.css`
- `third_party/meta-configurator/meta_configurator/package.json` (script: `build:embed`)

### Serving and lazy-load contract

- Static asset URLs (per `spec.md` Section 5.4.1):
  - `/meta-configurator-embed/meta-configurator-embed.css`
  - `/meta-configurator-embed/meta-configurator-embed.js`
- Additional embed runtime assets:
  - `/meta-configurator-embed/assets/validationWorker-296995c3.js`
  - `/meta-configurator-embed/validation-templates/*`
- Lazy loader injects `<link>` + `<script>` once and returns `window.MetaConfiguratorEmbed`.

Files:
- `web/src/lib/metaConfiguratorEmbed.ts`
- `web/public/meta-configurator-embed/*`

### Build/copy plumbing (dist -> web/public)

- `scripts/build-meta-configurator-embed.mjs`:
  - Runs `npm ci` (only if needed) and `npm run build:embed` inside `third_party/meta-configurator/meta_configurator/`
  - Copies `dist-embed/` -> `web/public/meta-configurator-embed/`
- `web/package.json` script:
  - `build:meta-configurator-embed` -> `node ../scripts/build-meta-configurator-embed.mjs`

Files:
- `scripts/build-meta-configurator-embed.mjs`
- `web/package.json`

## Verified (2026-02-11)

- Ran `node scripts/build-meta-configurator-embed.mjs`: build succeeded and copied output.
- Vite-reported outputs:
  - `dist-embed/meta-configurator-embed.js`: 2,146.18 kB (gzip 584.14 kB)
  - `dist-embed/meta-configurator-embed.css`: 986.52 kB (gzip 408.03 kB)
  - `dist-embed/assets/validationWorker-ccf3499f.js`: 149.56 kB
- Verified `dist-embed/` and `web/public/` copies are byte-identical for JS and CSS (SHA256 matches at the time of this report).
- Verified embed output loads its validation worker under `/meta-configurator-embed/assets/...` (not `/assets/...`), matching the hosting prefix.

## Not implemented yet (gaps vs `spec.md`)

- Schema Creation Wizard (spec Sections 5.1-5.3)
- Platform co-pilot edge function `schema-assist` (spec Section 6)
- Host-controlled theming bridge for the embed (spec Section 5.4.2 host-controlled primary color)
- Any AG Grid replacement inside MetaConfigurator (explicitly post-v0 in spec)

## Repo hygiene / capture status

- `third_party/meta-configurator/` is now the tracked fork location used by the embed build.
- `ref-repos/` remains gitignored scratch space and is no longer required for the embed build.

<!-- END SOURCE: dev-todos\meta-configurator-integration\status.md -->


---

<!-- BEGIN SOURCE: dev-todos\meta-configurator-integration\verbal-specs.md -->

# Schema Builder Co-Pilot â€” Verbal Specs

**Spec authority (v0):** `docs/ongoing-tasks/meta-configurator-integration/spec.md`

## Core Concept

> This should be part of the schemas menu â€” where users can upload pre-designed
> JSON schemas or use this to create the JSON schemas.

The Schemas menu supports two workflows:

1. **Upload** â€” users upload pre-designed JSON schemas
2. **Create with AI** â€” users build schemas interactively with the platform co-pilot

## Two Distinct AI Systems

> The AI models â€” there are two types of AI models we support.

### 1. User-Provided LLM Keys (Settings page)

> The ones that the users connect API keys to do the runs â€” the actual
> annotations onto already created user schemas.

- User connects their own API keys (Anthropic, OpenAI, Google, etc.)
- These power **annotation runs** â€” AI processing of blocks against existing schemas
- Already built. Separate concern from the co-pilot.

### 2. Platform-Provided Co-Pilot

> The other model/AI they use is the one we provide internally â€” integrated
> into the system â€” the model trained to provide highly specialized assistance
> in creating schemas by asking questions, etc. This model is a co-pilot or
> browser-end extension that is integrated into our platform that the user
> chats with that can create and save schemas for users.

- Internally integrated, platform-wide â€” not limited to a single page
- The Schemas page is one surface where it operates (schema creation/editing)
- Trained to provide highly specialized assistance in creating schemas
- Asks questions, iterates on drafts, generates and saves schemas
- Acts as a co-pilot or browser-end extension
- The user chats with it; it creates and saves schemas for them

#### Model & Knowledge

> Most likely Opus or Gemini Pro. Everything it knows will be 100% about
> the platform and how to do everything on it. I am going to train it with
> KGs and vector and serve it behind an MCP.

- Powered by Opus or Gemini Pro (platform pays)
- 100% platform-aware â€” knows the platform's schema rules, block types, pairing rules, everything
- Trained with knowledge graphs and vector embeddings
- Served behind an MCP server

#### v0 vs future

- **v0 (this build):** a minimal, platform-provided `schema-assist` capability scoped to schema creation/editing (field suggestions, prompt drafting, schema modifications, Q&A).
- **Future:** the platform-wide Co-Pilot (KG/vector trained, MCP-served) that is not limited to the Schemas surface.

### The distinction

These two AI systems do not share keys, models, or infrastructure. User API keys
power annotation runs. The platform co-pilot is a separate system the platform
provides and pays for.

---

## Design Decisions

| Decision | Answer | Notes |
|---|---|---|
| Where does the co-pilot live? | On the platform â€” the Schemas page is one surface | Platform-wide assistant; schema creation is one of its capabilities |
| What model powers it? | Most likely Opus or Gemini Pro | Platform-provided, platform pays |
| Should it know platform rules? | 100% about the platform | Trained with KGs and vectors, served behind an MCP |

| How should users refine schema drafts? | Visual field list as primary view, JSON tab for power users | Domain experts are the primary audience, not developers |

<!-- END SOURCE: dev-todos\meta-configurator-integration\verbal-specs.md -->


