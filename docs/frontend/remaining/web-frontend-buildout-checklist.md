# Web Frontend Buildout Checklist

**Date:** 2026-02-08
**Stack:** React 19 + Vite 7 + Mantine v8 + AG Grid v35 + Supabase JS v2
**Directory:** `web/`

---

## Legend

- [x] Done and verified
- [~] Partially done / needs improvement
- [ ] Not started

---

## Phase 1 — Project Foundation

### 1.1 Scaffolding & Config

- [x] `web/` directory created at repo root
- [x] Vite + React + TypeScript template initialized
- [x] `vite.config.ts` with `@/` path alias
- [x] `postcss.config.cjs` with Mantine preset + breakpoint vars
- [x] `tsconfig.json` (strict mode via tsconfig.app.json)
- [x] `index.html` entry point
- [x] `.env.example` with placeholder values
- [x] `.env` with live Supabase credentials
- [x] `.gitignore` in `web/` — `.env` exclusion added
- [x] `vercel.json` SPA routing config

### 1.2 Dependencies Installed

- [x] `@mantine/core` v8, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`
- [x] `react-router-dom` v7
- [x] `@supabase/supabase-js` v2.95
- [x] `@tabler/icons-react` v3.36
- [x] `ag-grid-community` v35, `ag-grid-react` v35
- [x] PostCSS dev dependencies
- [x] TanStack Table removed (superseded by AG Grid)

### 1.3 Build Verification

- [x] `npm run dev` starts dev server
- [x] `npx tsc -b --noEmit` compiles clean (zero errors)
- [x] `npm run build` produces dist/ (1.8MB JS, 204KB CSS)
- [ ] Code-splitting / chunk optimization (single 1.8MB bundle flagged by Vite)

---

## Phase 2 — Core Library Layer (`src/lib/`)

### 2.1 Supabase Client

- [x] `lib/supabase.ts` — singleton client, env var validation, auth persistence

### 2.2 Edge Function Helpers

- [x] `lib/edge.ts` — `edgeFetch()`, `edgeJson<T>()`, `downloadFromEdge()`
- [x] Auth token injection (Bearer + apikey headers)
- [x] Blob download with anchor-click trigger

### 2.3 Table Names

- [x] `lib/tables.ts` — centralized v2 table name constants
- [x] Documented Step 9 cutover path (remove `_v2` suffixes)

### 2.4 Type Definitions

- [x] `lib/types.ts` — `DocumentRow`, `BlockRow`, `SchemaRow`, `RunRow`, `RunWithSchema`, `BlockOverlayRow`, `BlockWithOverlay`

### 2.5 Schema Field Extraction

- [x] `lib/schema-fields.ts` — `extractSchemaFields()` parses JSON Schema `properties` or `fields`
- [x] Returns `SchemaFieldMeta[]` with key, type, enumValues, description

---

## Phase 3 — Auth

- [x] `auth/AuthContext.tsx` — React context with session/user/loading/signIn/signOut
- [x] Supabase `onAuthStateChange` listener
- [x] `auth/AuthGuard.tsx` — redirect to `/login` if unauthenticated, Loader while checking
- [x] Session persists across page refresh
- [x] Sign-out clears session and redirects

---

## Phase 4 — Layout & Navigation

- [x] `components/layout/AppLayout.tsx` — Mantine AppShell with header + sidebar navbar
- [x] Sidebar nav items: Dashboard, Upload, Documents, Schemas, Runs
- [x] Active route highlighting
- [x] Mobile hamburger menu (responsive)
- [x] User email display + Sign Out button in header
- [x] `components/layout/PublicLayout.tsx` — simple centered container for login/landing

---

## Phase 5 — Routing

- [x] `router.tsx` with `createBrowserRouter`
- [x] Public routes: `/` (Landing), `/login` (Login)
- [x] Protected routes under AuthGuard + AppLayout:
  - [x] `/app` → Dashboard
  - [x] `/app/upload` → Upload wizard
  - [x] `/app/documents` → Document list
  - [x] `/app/documents/:sourceUid` → Document detail + Block Viewer
  - [x] `/app/schemas` → Schema list + upload
  - [x] `/app/runs` → Run list + create
  - [x] `/app/runs/:runId` → Run detail
- [x] Experimental Documents-2 routes removed (consolidated)

---

## Phase 6 — Data Hooks

### 6.1 useBlocks

- [x] `hooks/useBlocks.ts` — paginated fetch from `blocks_v2`
- [x] Server-side pagination via `.range()`
- [x] Returns `{ blocks, totalCount, loading, error, refetch }`
- [x] Count via `{ count: 'exact' }`

### 6.2 useRuns

- [x] `hooks/useRuns.ts` — fetch runs with joined schema data
- [x] Query: `select('*, schemas(schema_ref, schema_uid, schema_jsonb)')`
- [x] Filtered by `conv_uid`

### 6.3 useOverlays

- [x] `hooks/useOverlays.ts` — initial bulk fetch + Supabase Realtime subscription
- [x] Maintains `Map<string, BlockOverlayRow>` keyed by block_uid
- [x] Channel lifecycle management (create on mount/runId change, remove on cleanup)
- [x] Handles INSERT, UPDATE, DELETE events
- [ ] Reconnection / error handling for Realtime channel drops
- [ ] Optimistic UI updates (status transitions)

### 6.4 useDocument

- [x] `hooks/useDocuments.ts` — fetch single document by source_uid

---

## Phase 7 — Common Components

- [x] `components/common/PageHeader.tsx` — title + subtitle + children slot
- [x] `components/common/ErrorAlert.tsx` — red alert with icon

---

## Phase 8 — Block Viewer (Core Product Feature)

### 8.1 AG Grid Integration

- [x] `ag-grid-community` + `ag-grid-react` installed (v35)
- [x] `AllCommunityModule` registered
- [x] `themeQuartz` applied

### 8.2 BlockViewerGrid Component

- [x] `components/blocks/BlockViewerGrid.tsx` (348 lines)
- [x] Pinned left "Immutable" column group: #, Type, Content
- [x] Dynamic right "User-Defined" column group: Status + schema field columns
- [x] Column group headers show schema_ref name
- [x] Columns regenerate on run/schema change via `useMemo`

### 8.3 Custom Cell Renderers

- [x] `BlockTypeCellRenderer` — colored Badge by block type
- [x] `ContentCellRenderer` — whitespace-normalized text with Tooltip for long values
- [x] `StatusCellRenderer` — pending/claimed/complete/failed Badge
- [x] `SchemaFieldCellRenderer` — type-aware rendering:
  - [x] null/undefined → dimmed "--"
  - [x] boolean → green/gray Badge
  - [x] number → bold text
  - [x] string → text with Tooltip, or Badge for enum values
  - [x] string/number arrays → inline Badge group (first 5 + overflow count)
  - [x] complex arrays → "[N items]" with JSON Tooltip
  - [x] objects → truncated key-value preview with JSON Tooltip

### 8.4 Toolbar & Controls

- [x] RunSelector dropdown (no-run option + runs with schema_ref/status/progress)
- [x] Progress bar (green=complete, red=failed)
- [x] Block count display
- [x] Page size selector (25/50/100)
- [x] Server-side pagination with Mantine Pagination component

### 8.5 Sub-Components

- [x] `RunSelector.tsx` — searchable Select for run switching
- [x] `StatusBadge.tsx` — color-coded overlay status badge

### 8.6 Missing / Future Improvements

- [ ] Column resizing persistence (save widths to localStorage)
- [ ] Column sorting (AG Grid `sortable: true` set, but no server-side sort)
- [ ] Column filtering (AG Grid `filter: true` set, but no server-side filter)
- [ ] Row click → detail panel or inline expansion
- [ ] Keyboard navigation (row selection via arrow keys)
- [ ] Inline editing of overlay values (for manual annotation)
- [ ] Export current grid view to CSV/Excel (AG Grid built-in)
- [ ] Dark mode theme support (AG Grid theming)
- [ ] Loading skeleton/spinner while blocks fetch
- [ ] Empty state when no blocks exist

---

## Phase 9 — Pages

### 9.1 Landing Page

- [x] `pages/Landing.tsx` — hero section, CTA button to /login
- [ ] Feature summary sections
- [ ] Product screenshots or illustrations
- [ ] Responsive design polish

### 9.2 Login Page

- [x] `pages/Login.tsx` — email/password form
- [x] Error notification on failure
- [x] Redirect to /app on success
- [ ] "Forgot password" flow
- [ ] "Sign up" flow (registration)
- [ ] OAuth providers (Google, GitHub)
- [ ] Loading state on submit button

### 9.3 Dashboard

- [x] `pages/Dashboard.tsx` — recent documents + recent runs cards
- [x] Empty state CTA ("Get started" → upload)
- [x] Loading skeletons
- [ ] Quick stats summary (total docs, total runs, total blocks)
- [ ] Activity feed / recent changes

### 9.4 Upload Wizard

- [x] `pages/Upload.tsx` — 3-step Mantine Stepper (320 lines)
  - [x] Step 1: File upload + optional title → calls `ingest` edge function
  - [x] Step 2: Select existing schema or upload new → calls `schemas` edge function
  - [x] Step 3: Confirmation + create run → calls `runs` edge function
  - [x] Completion state with "Open Block Viewer" link
- [x] Handles multipart form data for ingest
- [x] Handles both JSON and multipart for schemas
- [ ] Drag-and-drop file upload zone
- [ ] Upload progress indicator
- [ ] Batch upload (multiple files)
- [ ] Schema preview/validation before submission
- [ ] "Skip schema" option (upload without creating a run)

### 9.5 Documents List

- [x] `pages/Documents.tsx` — table with title, type, status, upload date
- [x] Row click → document detail
- [ ] Search/filter by title or status
- [ ] Sort by columns
- [ ] Pagination (currently hard limit 50)
- [ ] Bulk actions (delete, export)

### 9.6 Document Detail

- [x] `pages/DocumentDetail.tsx` — metadata bar + BlockViewerGrid
- [x] Status-dependent rendering (ingested → viewer, converting → alert, failed → error)
- [x] Export JSONL button
- [x] Loading skeleton
- [ ] "Re-ingest" or "Delete document" actions
- [ ] Auto-refresh for "converting" status
- [ ] Show conversion metadata (parsing tool, representation type, character count)

### 9.7 Schemas

- [x] `pages/Schemas.tsx` — list + upload form
- [x] Schema upload via edge function
- [ ] Schema detail view (show full JSON schema)
- [ ] Schema field preview table
- [ ] Schema deletion
- [ ] Schema versioning display (schema_uid)
- [ ] Edit/clone schema

### 9.8 Runs List

- [x] `pages/RunsList.tsx` — table + create form
- [x] Create run (select doc + schema)
- [ ] Run status live updates (polling or Realtime)
- [ ] Run cancellation
- [ ] Run deletion
- [ ] Filter by status
- [ ] Pagination

### 9.9 Run Detail

- [x] `pages/RunDetail.tsx` — status, block counts, export
- [x] Refresh button
- [ ] Progress bar (like in BlockViewerGrid)
- [ ] Link to document's block viewer with run pre-selected
- [ ] Overlay completion timeline / chart
- [ ] Error log (failed blocks list)

---

## Phase 10 — Backend (Edge Functions)

### 10.1 Deployed Functions

- [x] `ingest` — file upload + MD processing + non-MD queuing
- [x] `conversion-complete` — webhook callback for conversion service
- [x] `export-jsonl` — canonical v3.0 NDJSON export
- [x] `schemas` — schema registration with SHA256 dedup
- [x] `runs` — run creation via `create_run_v2` RPC
- [x] `_shared/` utilities (cors, hash, markdown, docling, env, sanitize, supabase)

### 10.2 Missing/Pending Backend

- [ ] **Worker/processor edge function** — claims pending overlays, calls LLM, writes results back (the actual AI annotation loop)
- [x] **Non-MD Docling track** — fully implemented: `ingest` creates `docling_output` for docx/pdf, conversion service serializes deterministically, `conversion-complete` has Docling branch with `docling_json_pointer` locators, `_shared/docling.ts` extraction utility (330 lines), smoke test has hard assertions
- [ ] Run cancellation endpoint
- [ ] Run deletion endpoint
- [ ] Document deletion endpoint (cascade blocks + overlays)
- [ ] Schema deletion endpoint
- [ ] User management / API key management

---

## Phase 11 — Database

### 11.1 Migrations Applied

- [x] `001` — v1 immutable documents + blocks
- [x] `002` — schemas, runs, block_annotations (v1)
- [x] `003` — v2 parallel tables (documents_v2, blocks_v2)
- [x] `004` — runs_v2, block_overlays_v2, RPC functions, cron
- [x] `005` — v1 freeze, v2 activation
- [x] `006` — block_overlays_v2 added to Realtime publication

### 11.2 Pending DB Work

- [ ] Step 9 cutover decision: rename v2 tables → drop `_v2` suffix (or keep as-is)
- [ ] Drop v1 tables after cutover verification
- [ ] Review RLS policies for completeness (UPDATE, DELETE policies)
- [ ] Indexes on frequently queried columns (e.g., `blocks_v2(conv_uid, block_index)`)
- [ ] Database backups / point-in-time recovery configured

---

## Phase 12 — Quality & Polish

### 12.1 Testing

- [ ] Testing framework setup (Vitest + React Testing Library)
- [ ] Unit tests: `schema-fields.ts`, `edge.ts`
- [ ] Component tests: `BlockViewerGrid`, `RunSelector`, `StatusBadge`
- [ ] Hook tests: `useBlocks`, `useOverlays`, `useRuns`
- [ ] Integration tests: Upload wizard flow, auth flow
- [ ] E2E tests (Playwright or Cypress)

### 12.2 Error Handling & Resilience

- [ ] React Error Boundary (global catch for render errors)
- [ ] Retry logic for failed API calls
- [ ] Offline detection / reconnection banner
- [ ] Realtime channel reconnection handling
- [ ] Rate limiting / throttle for rapid pagination
- [ ] Form validation (Mantine `useForm` integration)

### 12.3 Performance

- [ ] Code splitting: lazy-load pages via `React.lazy()` + `Suspense`
- [ ] AG Grid chunk separation (largest dep, ~1MB)
- [ ] Image optimization (if any static assets added)
- [ ] Memoization audit (verify useMemo/useCallback usage)
- [ ] Virtual scrolling for very long block lists (AG Grid handles this)

### 12.4 Accessibility

- [ ] Keyboard navigation for all interactive elements
- [ ] ARIA labels on all form inputs (some present, audit needed)
- [ ] Screen reader testing
- [ ] Color contrast audit
- [ ] Focus management on route changes

### 12.5 Visual Design

- [ ] Consistent spacing / typography system
- [ ] Dark mode support
- [ ] Mobile responsive audit (sidebar collapse works, but page content?)
- [ ] Empty state illustrations
- [ ] Loading state animations
- [ ] Favicon and meta tags
- [ ] OG image / social preview meta

### 12.6 Security

- [x] `.env` excluded from git (root .gitignore + web/.gitignore)
- [ ] CSP headers (Content Security Policy)
- [ ] Rate limiting on auth attempts
- [ ] Session expiry handling (auto-refresh works via Supabase, but UI state?)
- [ ] Audit: no XSS vectors in cell renderers (currently rendering user data via React — safe by default)

---

## Phase 13 — Deployment & DevOps

### 13.1 Deployment

- [x] `vercel.json` SPA config present
- [x] Vercel project created and deployed (https://blockdata.run)
- [ ] Custom domain configured
- [x] Environment variables set in Vercel dashboard
- [ ] Preview deployments for PRs

### 13.2 CI/CD

- [ ] GitHub Actions workflow: lint + type-check + build on PR
- [ ] GitHub Actions workflow: deploy to Vercel on merge to main
- [ ] Pre-commit hooks (lint-staged + prettier)

### 13.3 Monitoring

- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (usage tracking)
- [ ] Performance monitoring (Web Vitals)
- [ ] Uptime monitoring

---

## Summary: Current State

| Area | Status |
|:--|:--|
| **Scaffolding & Config** | Complete |
| **Library Layer** | Complete |
| **Auth** | Complete |
| **Layout & Navigation** | Complete |
| **Routing** | Complete |
| **Data Hooks** | Complete (Realtime needs hardening) |
| **Block Viewer (AG Grid)** | Complete (core), needs polish |
| **Pages** | Functional stubs, need polish |
| **Edge Functions** | 5/5 deployed, worker missing |
| **Database** | v2 active, cutover pending |
| **Testing** | Not started |
| **Error Handling** | Basic, needs hardening |
| **Performance** | Needs code-splitting |
| **Accessibility** | Not audited |
| **Visual Design** | Functional, not polished |
| **Deployment** | Live at blockdata.run |
| **CI/CD** | Not configured |

**Approximate code:** ~2,000 lines of production React across 31 source files.
