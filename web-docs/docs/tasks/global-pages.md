# Global Pages — Task List

These are top-level pages outside the flow detail view. They provide cross-flow operational visibility and platform-wide features.

---

## 1. Dashboard Page

| Field | Value |
|---|---|
| Status | **Missing** |
| Route | `/app/dashboard` |
| Existing file | None |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/02-dashboards.png` |

**What needs to be built:**
- [ ] New page component: `web/src/pages/Dashboard.tsx`
- [ ] Add route to `web/src/router.tsx`
- [ ] Add to left rail navigation in `web/src/components/shell/nav-config.ts`
- [ ] Top right: "Default Dashboard" dropdown + "+ Create Flow" button
- [ ] KPI cards row: Success Ratio %, Failed Ratio %, In Progress count, Pending count
- [ ] Chart: "Total Executions" (executions duration and count per date)
- [ ] Chart: "Executions in Progress" (real-time count)
- [ ] Table: "Next Executions" (Namespace, Flow, Next Execution Date)
- [ ] Filter: "Add filters" button, time interval selector ("Last 24 hours" default)
- [ ] Data aggregated across all flows owned by user

**Dependencies:** `flow_executions` + `flow_triggers` JSONB tables

---

## 2. Global Executions Page

| Field | Value |
|---|---|
| Status | **Missing** |
| Route | `/app/executions` |
| Existing file | None |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/05-executions.png` |

**What needs to be built:**
- [ ] New page component: `web/src/pages/Executions.tsx`
- [ ] Add route to `web/src/router.tsx`
- [ ] Add to left rail navigation
- [ ] Top right: "Export as CSV" + "Execute" buttons
- [ ] Filter section: "Add filters", search, time interval "Last 24 hours", state filter "in any"
- [ ] Statistics: "Total Executions" card (count or chart)
- [ ] Data table columns: Id, Start date, End date, Duration, Namespace, Flow, Labels, State (badge), Triggers, Actions
- [ ] Pagination with per-page selector
- [ ] Empty state: "No Executions Found" with icon and guidance
- [ ] Row click navigates to execution detail
- [ ] Cross-flow: shows executions from ALL flows owned by user

**Dependencies:** `flow_executions` JSONB table, flow-executions edge function

---

## 3. Global Logs Page

| Field | Value |
|---|---|
| Status | **Missing** |
| Route | `/app/logs` |
| Existing file | None |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/06-logs.png` |

**What needs to be built:**
- [ ] New page component: `web/src/pages/Logs.tsx`
- [ ] Add route to `web/src/router.tsx`
- [ ] Add to left rail navigation
- [ ] Filter section: "Add filters", search, "Log Level: INFO" filter chip, "Interval: Last 24 hours"
- [ ] Log entry table: timestamp, level (badge), namespace, flow, task, message
- [ ] Empty state: "No logs found for the selected filters" with guidance text
- [ ] Level filter: dropdown with ERROR, WARN, INFO, DEBUG, TRACE
- [ ] Time range filter
- [ ] Full-text search across log messages
- [ ] Cross-flow: shows logs from ALL flows

**Dependencies:** `flow_execution_logs` JSONB table, flow-execution-logs edge function

---

## 4. Namespaces Page

| Field | Value |
|---|---|
| Status | **Missing** |
| Route | `/app/namespaces` |
| Existing file | None |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/09-namespaces.png` |

**What needs to be built:**
- [ ] New page component: `web/src/pages/Namespaces.tsx`
- [ ] Add route to `web/src/router.tsx`
- [ ] Add to left rail navigation
- [ ] Search bar: "Search namespaces"
- [ ] Namespace cards (expandable list items) showing:
  - Namespace name
  - Description badge
  - Flow count
  - Context menu (three dots) with actions
- [ ] Selected namespace highlighted with accent border
- [ ] Click namespace to filter flows view by namespace

**Dependencies:** Namespace concept derived from `flow_sources` table (namespace generated column)

---

## 5. Plugins/Tasks Catalog Page

| Field | Value |
|---|---|
| Status | **Partial** (different UX) |
| Route | `/app/plugins` or refactor `/app/marketplace/integrations` |
| Existing file | `web/src/pages/marketplace/IntegrationsCatalog.tsx` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/10-plugins.png` |

**What exists:**
- Integration catalog with marketplace grid
- Service/integration detail views
- Different UX pattern than Kestra's plugin browser

**What needs to change (to match Kestra):**
- [ ] Search bar: "Search for tasks and triggers to build your flow"
- [ ] Icon grid/tile view (not list) — each plugin as a color-coded tile
- [ ] Plugin tiles show: icon, name, category
- [ ] Group by provider/category
- [ ] Click tile to see plugin detail: description, task types, parameter schema, examples
- [ ] "Use in flow" action that inserts task YAML into flow editor
- [ ] Data from `integration_catalog_items` + `kestra_plugin_inputs` tables

**Dependencies:** `integration_catalog_items` table (already populated with 821 plugins)

---

## 6. Blueprints Page

| Field | Value |
|---|---|
| Status | **Missing** |
| Route | `/app/blueprints` |
| Existing file | None |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/11-blueprints.png` (shows 404 in screenshot) |

**What needs to be built:**
- [ ] New page component: `web/src/pages/Blueprints.tsx`
- [ ] Add route to `web/src/router.tsx`
- [ ] Pre-built flow template catalog
- [ ] Template cards: title, description, tags, category
- [ ] Search and filter by category
- [ ] Preview template YAML on click
- [ ] "Fork into project" action — creates new flow from template
- [ ] Could source templates from Kestra's blueprint API or curate internally

**Dependencies:** Blueprint data source (new table or external API)

---

## 7. Source Search Page

| Field | Value |
|---|---|
| Status | **Missing** |
| Route | `/app/flows/source-search` |
| Existing file | None |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/flows-detail-overview.png` |

**What needs to be built:**
- [ ] New page component: `web/src/pages/SourceSearch.tsx`
- [ ] Add route to `web/src/router.tsx`
- [ ] Search input for full-text search across all flow YAML source code
- [ ] Namespace filter dropdown
- [ ] Results list: flow name, namespace, matched snippet with highlighting
- [ ] Click result navigates to flow detail edit tab
- [ ] Powered by GIN index on `fulltext_index(source_code)` in `flow_sources` table

**Dependencies:** `flow_sources` JSONB table with `source_code` TEXT column and GIN fulltext index

---

## 8. Welcome/Onboarding Page

| Field | Value |
|---|---|
| Status | **Missing** (Landing.tsx is marketing, not onboarding) |
| Route | `/app/welcome` or `/app` (default for new users) |
| Existing file | `web/src/pages/Landing.tsx` (marketing page, different purpose) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/01-welcome.png` |

**What needs to be built:**
- [ ] New page component: `web/src/pages/Welcome.tsx`
- [ ] Centered hero: icon + "Welcome to BlockData"
- [ ] Headline: "Build and run your first workflow in minutes"
- [ ] Two primary CTAs: "Build your first flow" (tutorial), "Create flow from scratch"
- [ ] Support links: Documentation, Tutorial, Blueprints, Community
- [ ] Show for new users (no flows yet) or as explicit route
- [ ] Redirect to Dashboard once user has flows

**Dependencies:** None (static page with links)

---

## 9. Settings Page Enhancement

| Field | Value |
|---|---|
| Status | **Partial** (exists but different structure) |
| Route | `/app/settings` |
| Existing file | `web/src/pages/settings/` (multiple files) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/14-settings.png` |

**What exists:**
- Settings pages for: profile, AI config, model roles, MCP, themes
- Admin panels for: runtime policy, services, integration catalog, instance config

**What's missing (to match Kestra settings):**
- [ ] "Main Configuration" section:
  - Default Namespace dropdown
  - Default Log Level dropdown (INFO/DEBUG/WARN/ERROR/TRACE)
  - Default Log Display dropdown (Expand all / Collapse all)
  - Default Editor Type dropdown (YAML Editor / No-code)
  - Execute the Flow dropdown (In same tab / New tab)
  - Default Execution Tab dropdown (Gantt / Logs / Outputs)
  - Default Flow Tab dropdown (Overview / Edit / Executions)
  - Playground toggle
  - Auto Refresh Interval number input (seconds)
- [ ] "Theme Preferences" section:
  - Theme dropdown (Light / Dark / System)
  - Logs Font Size number input
  - Editor Font Size number input
  - Editor Font Family dropdown
  - Automatic Code Folding toggle
  - Hover on property description toggle
- [ ] Save button (top right)
- [ ] Store preferences in user profile or localStorage

**Dependencies:** None (user preferences, can be localStorage-backed initially)

---

## Navigation Updates Required

**File:** `web/src/components/shell/nav-config.ts`

Add to left rail to match Kestra's sidebar:
- [ ] Dashboard (new, top position)
- [ ] Flows (exists)
- [ ] Executions (new, global)
- [ ] Logs (new, global)
- [ ] Namespaces (new)
- [ ] Plugins (refactor from marketplace/integrations)
- [ ] Blueprints (new)
- [ ] Settings (exists)

**File:** `web/src/router.tsx`

Add routes:
- [ ] `/app/dashboard` → Dashboard
- [ ] `/app/executions` → Executions (global)
- [ ] `/app/logs` → Logs (global)
- [ ] `/app/namespaces` → Namespaces
- [ ] `/app/plugins` → Plugins catalog
- [ ] `/app/blueprints` → Blueprints
- [ ] `/app/flows/source-search` → Source Search
- [ ] `/app/welcome` → Welcome
- [ ] `/app/flows/:flowId/executions/:executionId` → Execution Detail

---

## Summary

| Page | Status | Effort | Priority |
|---|---|---|---|
| Dashboard | Missing | High | High — operational visibility |
| Global Executions | Missing | Medium | High — cross-flow monitoring |
| Global Logs | Missing | Medium | High — debugging |
| Namespaces | Missing | Low | Medium |
| Plugins Catalog | Partial | Medium | Medium — refactor existing |
| Blueprints | Missing | Medium | Low |
| Source Search | Missing | Low | Medium |
| Welcome | Missing | Low | Low |
| Settings Enhancement | Partial | Low | Low |
