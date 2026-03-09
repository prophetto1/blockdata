# Flow Identity Normalization — Change Log

All changes normalize flow identity from `flowId`-only to the composite key `(project_id, namespace, flow_id)`.

---

## New File: `supabase/migrations/20260309183000_073_normalize_flow_identity.sql`

New migration that formalizes the relationship contract: a user owns projects, a project contains many flows, a flow is identified by `(namespace, flow_id)` within a project.

- Adds `namespace TEXT NOT NULL DEFAULT 'default'` column to `flow_sources` and `flow_logs`
- Replaces unique constraint on `flow_sources` from `(project_id, flow_id, revision)` to `(project_id, namespace, flow_id, revision)`
- Replaces indexes on all three flow tables to use the composite `(project_id, namespace, flow_id, ...)` key
- Adds FK constraints from `flow_executions` and `flow_logs` to `projects(project_id)` with `ON DELETE CASCADE`
- Replaces all RLS policies on `flow_executions` and `flow_logs` to use project-ownership checks via `EXISTS (SELECT 1 FROM projects WHERE owner_id = auth.uid())`

---

## `supabase/functions/flows/index.ts`

### 1. FlowSourceRow type expanded

**Before:** `{ project_id, source, revision, updated_at }`
**After:** `{ flow_source_id, project_id, namespace, flow_id, source, revision, updated_at }`

Added `flow_source_id`, `namespace`, and `flow_id` fields to the type.

### 2. New `readProjectId()` helper

**Before:** No project_id query parameter support.
**After:** Reads `project_id` from the request's query string. Required for PUT, optional for GET.

### 3. `toFlowResponse()` identity derivation changed

**Before:** `namespace` came from `row.workspace_id`, `id` came from `row.project_id`, `flowName` from `row.project_name`.
**After:** `namespace` comes from `sourceRow.namespace`, `id` comes from `sourceRow.flow_id`, `flowName` derived from the flow_id. The `row` parameter is now nullable.

Flow identity was incorrectly derived from the project record. Now it comes from the flow_sources record.

### 4. `loadProjectRow()` — table name corrected

**Before:** Queried `user_projects` table by `project_id` using `flowId` as the value.
**After:** Queries `projects` table by `project_id` using the actual `projectId` value.

The function was using the flow ID to look up a project row. Now it uses the project ID.

### 5. `loadFlowSourceRow()` — composite key query

**Before:** Single `.eq('project_id', flowId)` then `.maybeSingle()`.
**After:** Three `.eq()` filters (`project_id`, `namespace`, `flow_id`), then `.order('revision', { ascending: false }).limit(1)`.

Was treating `flowId` as the project_id. Now uses all three identity columns and fetches the latest revision.

### 6. `saveFlowSourceRow()` — insert instead of upsert

**Before:** `.upsert({ project_id: flowId, source, revision }, { onConflict: 'project_id' })`.
**After:** `.insert({ project_id, namespace, flow_id, source, revision })`.

Upsert on project_id was wrong — it would overwrite unrelated flows. Now inserts a new revision row each time.

### 7. `handleFlowRoute()` — project_id decoupled from route

**Before:** `loadProjectRow(supabase, route.flowId)` — used the flow ID as the project ID.
**After:** `readProjectId(req)` gets the project from query string. Project lookup is optional for GET, required for PUT. Flow source lookup uses `(projectId, namespace, flowId)`.

---

## `supabase/functions/flows/index.test.ts`

### 1. FakeState shape changed

**Before:** `flowSource: { project_id, source, revision, updated_at } | null`
**After:** `flowSources: Array<{ flow_source_id, project_id, namespace, flow_id, source, revision, updated_at }>`

Single nullable object became an array of rows with the full composite key.

### 2. Fake client `flow_sources` mock rewritten

**Before:** Single `.eq()` chain returning `.maybeSingle()`.
**After:** Chained triple `.eq()` filters matching `project_id`, `namespace`, `flow_id`, then `.order().limit()` returning filtered/sorted array.

### 3. Fake client uses `.insert()` instead of `.upsert()`

**Before:** `.upsert()` replaced the single `flowSource`.
**After:** `.insert()` pushes a new row onto the `flowSources` array.

### 4. Request URLs changed

**Before:** `/flows/default/{projectId}?source=true`
**After:** `/flows/default/{flowId}?source=true&project_id={projectId}`

Flow ID is now in the URL path; project_id is a query parameter.

### 5. Assertions updated

**Before:** `assertEquals(body.id, projectId)`
**After:** `assertEquals(body.id, "flow-one")` / `"flow-two"`

The response `id` field now returns the flow ID, not the project ID.

---

## `web/src/components/flows/FlowWorkbench.tsx`

### 1. New `flowRequestPath` memo

**Before:** Used `flowPath` directly for API calls.
**After:** New `flowRequestPath` appends `?project_id=...` when a project is focused.

### 2. Load and save use `flowRequestPath`

**Before:** `edgeJson(\`${flowPath}?source=true\`)`
**After:** `edgeJson(\`${flowRequestPath}${includes '?' ? '&' : '?'}source=true\`)`

Same pattern for the PUT save call — now sends `project_id` to the edge function.

---

## `web/src/components/flows/tabs/AuditLogsTab.tsx`

### 1. Props expanded

**Before:** `{ flowId: string }`
**After:** `{ projectId: string | null; flowId: string }`

### 2. Query scoped by project

**Before:** Only `.eq('flow_id', flowId)`.
**After:** Early return if no `projectId`. Adds `.eq('project_id', projectId)` before `.eq('flow_id', flowId)`.

### 3. Effect deps updated

**Before:** `[flowId, reloadTick]`
**After:** `[flowId, projectId, reloadTick]`

---

## `web/src/components/flows/tabs/ExecutionsTab.tsx`

### 1. Props expanded

**Before:** `{ flowId: string }`
**After:** `{ projectId: string | null; flowId: string }`

### 2. Query scoped by project

**Before:** Only `.eq('flow_id', flowId)`.
**After:** Early return if no `projectId`. Adds `.eq('project_id', projectId)`.

### 3. Effect deps updated

**Before:** `[flowId, reloadTick]`
**After:** `[flowId, projectId, reloadTick]`

---

## `web/src/components/flows/tabs/ExecutionsTab.test.tsx`

### 1. Test render calls updated

**Before:** `<ExecutionsTab flowId="business-automation" />`
**After:** `<ExecutionsTab projectId="project-1" flowId="business-automation" />`

---

## `web/src/components/flows/tabs/LogsTab.tsx`

### 1. Props expanded

**Before:** `{ flowId: string }`
**After:** `{ projectId: string | null; flowId: string }`

### 2. Query scoped by project

**Before:** Only `.eq('flow_id', flowId)`.
**After:** Early return if no `projectId`. Adds `.eq('project_id', projectId)`.

### 3. Effect deps updated

**Before:** `[flowId]`
**After:** `[flowId, projectId]`

---

## `web/src/components/flows/tabs/RevisionsTab.tsx`

### 1. Props expanded

**Before:** `{ flowId: string }`
**After:** `{ projectId: string | null; flowId: string }`

### 2. Query scoped by project

**Before:** Only `.eq('flow_id', flowId)`.
**After:** Early return if no `projectId`. Adds `.eq('project_id', projectId)`.

### 3. Effect deps updated

**Before:** `[flowId]`
**After:** `[flowId, projectId]`

---

## `web/src/components/layout/FlowsRouteShell.tsx`

### 1. Flow detail route regex updated

**Before:** `/^\/app\/flows\/[^/]+(?:\/[^/]+)?$/` — expected `/app/flows/{flowId}` or `/app/flows/{flowId}/{tab}`
**After:** `/^\/app\/flows\/[^/]+\/[^/]+(?:\/[^/]+)?$/` — expects `/app/flows/{namespace}/{flowId}` or `/app/flows/{namespace}/{flowId}/{tab}`

Now requires namespace as a separate segment in the URL.

---

## `web/src/components/shell/LeftRailShadcn.tsx`

### 1. `extractFlowId` adds URI decoding

**Before:** `return match ? match[1]! : null`
**After:** `return match ? decodeURIComponent(match[1]!) : null`

### 2. Superuser button added to account menu

**Before:** Single settings button in the account card.
**After:** Two buttons side-by-side — a superuser tools button (visible only when `isSuperuser`) and the existing settings button.

### 3. Drill back-button label override

**Before:** Always shows `config.parentLabel`.
**After:** Shows `'Main Menu'` when `config.id === 'superuser'`, otherwise `config.parentLabel`.

---

## `web/src/components/shell/ProjectSwitcher.tsx`

### 1. Popover z-index fix

**Before:** `<Popover.Positioner>` and `<Popover.Content>` had no explicit z-index.
**After:** Both get `className="z-[140]"` / `className="relative z-[140] ..."`.

Fixes the popover being hidden behind other overlapping UI elements.

---

## `web/src/components/shell/nav-config.ts`

### 1. `resolveFlowDrillPath` URI-encodes the flowId

**Before:** `` `/app/flows/${flowId}/${tabSlug}` ``
**After:** `` `/app/flows/${encodeURIComponent(flowId)}/${tabSlug}` ``

---

## `web/src/pages/FlowDetail.tsx`

### 1. Project context wired in

**Before:** No project awareness.
**After:** Imports `readFocusedProjectId` and `PROJECT_LIST_CHANGED_EVENT`. Initializes `projectId` state from localStorage and syncs via event listener.

### 2. Metadata fetch includes project_id

**Before:** `edgeJson(\`flows/default/${encodeURIComponent(flowId)}\`)`
**After:** Appends `?project_id=...` when `projectId` is available.

### 3. Effect deps updated

**Before:** `[flowId]`
**After:** `[flowId, projectId]`

### 4. Error suppression regex loosened

**Before:** Only suppressed errors matching `flows/default/{id}`.
**After:** Suppresses errors matching `flows/{any namespace}/{id}`.

### 5. All tab components receive `projectId`

**Before:** `<ExecutionsTab flowId={flowId} />`, `<RevisionsTab flowId={flowId} />`, etc.
**After:** `<ExecutionsTab projectId={projectId} flowId={flowId} />`, etc. Applied to ExecutionsTab, RevisionsTab, LogsTab, and AuditLogsTab.

### 6. Navigation paths URI-encode flowId

**Before:** `` `/app/flows/${flowId}/executions` ``
**After:** `` `/app/flows/${encodeURIComponent(flowId)}/executions` ``

Applied to overview execute button, triggers edit link, and tab navigation.

---

## `web/src/pages/FlowsList.tsx`

### 1. Header switched to PageHeader component

**Before:** Used `useShellHeaderTitle({ title: 'Flows' })` hook.
**After:** Renders `<PageHeader title="Flows" />` component directly.

### 2. Flow navigation includes namespace

**Before:** `navigate(\`/app/flows/${row.flowId}/overview\`)`
**After:** `navigate(\`/app/flows/${encodeURIComponent(row.namespace)}/${encodeURIComponent(row.flowId)}/overview\`)`

### 3. Layout restructured

**Before:** Top action bar with border-b, then filter bar with border-b, then table, then footer — all as flat siblings.
**After:** Wrapped in a single `<section>` card with `rounded-lg border bg-card`. Filter controls and action buttons merged into one toolbar row inside the card. Footer is inside the card. Outer container has `gap-3 px-4 pt-3`.

---

## `web/src/pages/flows/FlowsList.test.tsx`

### 1. Mock strategy changed

**Before:** Mocked `supabase.from()` directly, building fake query chain results for `flow_sources`.
**After:** Mocks `loadFlowsList` from `flows.api.ts` directly, returning `{ total, results }`.

Tests no longer test internal Supabase query implementation — they test the component against the API contract.

### 2. Global stubs added

**Before:** No ResizeObserver/IntersectionObserver stubs.
**After:** `beforeAll` stubs both globals (needed for ScrollArea and other layout components).

### 3. Test cases rewritten

**Before:** Tests checked for "Revision 3", seeded flow rows, schema-error fallbacks, and ensured project identity wasn't exposed.
**After:** Tests check for PageHeader rendering, namespace column display, empty-state message, toolbar controls visibility, and API error surfacing.

---

## `web/src/router.tsx`

No meaningful changes (line-ending normalization only).
