---
title: "Editor Sub-Views — Task List"
description: "These are the sub-tabs inside the Flow Editor (FlowWorkbench). They live within the Edit tab of Flow Detail."
---# Editor Sub-Views — Task List

These are the sub-tabs inside the Flow Editor (FlowWorkbench). They live within the Edit tab of Flow Detail.

**Parent component:** `web/src/components/flows/FlowWorkbench.tsx` (2,186 lines)
**State management:** `web/src/components/flows/flowWorkbenchState.ts`

The workbench infrastructure is excellent — split-pane editor, tab drag-and-drop, resize handles, context menus, localStorage persistence. The gap is the content inside each sub-view.

---

## 1. Flow Code (Monaco YAML Editor)

| Field | Value |
|---|---|
| Status | **Functional** |
| Tab ID | `flowCode` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-01-flowcode.png` |

**What exists:**
- Monaco editor with syntax highlighting
- Theme sync (light/dark)
- YAML content from flow source

**What's missing (to match Kestra):**
- [ ] Right-side property panel: shows properties of the flow or selected task
- [ ] Collapsible property sections (flow properties, input/output configs, metadata)
- [ ] Syntax validation with inline error markers
- [ ] Autocomplete for Kestra task types and properties
- [ ] Line-level gutter decorations (warnings, errors)

---

## 2. No-Code (Visual Block Builder)

| Field | Value |
|---|---|
| Status | **Skeleton** (CSS only) |
| Tab ID | `nocode` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-02-nocode.png` |

**What exists:**
- Tab renders but content is empty/placeholder

**What needs to be built (to match Kestra):**
- [ ] Left panel: YAML code editor (read-only, synced with visual builder)
- [ ] Center panel: form-based task creation and configuration
- [ ] Right panel: property inspector with detailed field configs
- [ ] Task type selector (dropdown or search from integration catalog)
- [ ] Per-task form fields generated from `parameter_schema` in `integration_catalog_items`
- [ ] Toggle switches, input fields, dropdowns for task configuration
- [ ] Add/remove/reorder tasks
- [ ] Changes sync back to YAML source

**Dependencies:** `integration_catalog_items` table (task type schemas), `kestra_plugin_inputs` table (parameter definitions)

---

## 3. Topology (Inline DAG)

| Field | Value |
|---|---|
| Status | **Partial** (dummy nodes) |
| Tab ID | `topology` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-03-topology.png` |

**What exists:**
- FlowCanvas component (ReactFlow-based)
- Renders placeholder/dummy nodes

**What needs to be built (to match Kestra):**
- [ ] Parse flow YAML into actual task nodes
- [ ] Left panel: YAML code editor (synced)
- [ ] Center panel: interactive DAG canvas
- [ ] Right panel: property inspector for selected node
- [ ] Click node to select and show properties
- [ ] Visual representation of task dependencies (sequential, parallel branches)
- [ ] Trigger nodes shown separately at top

**Dependencies:** Flow YAML parser

---

## 4. Documentation (Markdown Editor)

| Field | Value |
|---|---|
| Status | **Skeleton** |
| Tab ID | `documentation` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-04-documentation.png` |

**What exists:**
- Tab renders but content is empty/placeholder

**What needs to be built (to match Kestra):**
- [ ] Left panel: YAML code editor (synced)
- [ ] Center panel: Markdown editor (could use Monaco with markdown mode)
- [ ] Right panel: rendered Markdown preview
- [ ] Documentation stored in flow YAML under `description` field or separate `documentation` field
- [ ] Save documentation alongside flow source

**Dependencies:** Flows edge function (save documentation field)

---

## 5. Namespace Files (File Browser)

| Field | Value |
|---|---|
| Status | **Skeleton** |
| Tab ID | `assets` (maps to namespace files concept) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-05-namespacefiles.png` |

**What exists:**
- Assets panel with virtual folder structure from Supabase storage
- Document preview for DOCX, PDF, PPTX, text, images
- Signed URL resolution

**What needs to be built (to match Kestra):**
- [ ] Left panel: file tree browser showing namespace-scoped files
- [ ] Center panel: file content editor or preview
- [ ] Right panel: file metadata (size, type, last modified)
- [ ] File upload, delete, rename actions
- [ ] File content editing for text/YAML/JSON files
- [ ] Namespace scoping (files belong to a namespace, shared across flows in that namespace)

**Dependencies:** Namespace files storage (Supabase Storage bucket organization)

---

## 6. Blueprints (Template Catalog)

| Field | Value |
|---|---|
| Status | **Skeleton** |
| Tab ID | `blueprints` |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-06-blueprints.png` |

**What exists:**
- Tab renders but content is empty/placeholder

**What needs to be built (to match Kestra):**
- [ ] Left panel: YAML code editor (current flow source)
- [ ] Center panel: blueprint browser with collapsible sections
- [ ] Blueprint cards: title, description, tags, preview
- [ ] Search/filter blueprints by category or tag
- [ ] Click blueprint to preview its YAML
- [ ] "Use this blueprint" action that replaces current flow source
- [ ] Blueprint metadata display (author, usage count, rating)

**Dependencies:** `integration_catalog_items` table or new blueprints table. Could source from Kestra's blueprint API initially.

---

## 7. Playground (Test Execution)

| Field | Value |
|---|---|
| Status | **Skeleton** |
| Tab ID | `playground` (toggle exists in workbench) |
| Kestra screenshot | `docs-approved/backend setup/Screenshots/edit-sub-08-playground.png` |

**What exists:**
- Playground toggle with status message when enabled

**What needs to be built (to match Kestra):**
- [ ] Left panel: namespace files tree view
- [ ] Center/Right panel: playground interface with:
  - "Run All Tasks" button (blue/primary)
  - Input parameter forms (auto-generated from flow `inputs` definition)
  - Individual task "play" buttons
  - Description text area
- [ ] Bottom panel with execution output sub-tabs:
  - Logs (live tail during execution)
  - Gantt (task timeline visualization)
  - Outputs (per-task output data)
  - Metrics (per-task metrics)
- [ ] Execution state indicator (running, success, failed)
- [ ] Information banner about playground functionality

**Dependencies:** `flow-dispatch` edge function, `flow_executions` + `flow_execution_logs` JSONB tables, pipeline-worker running

---

## Summary

| Sub-View | Status | Effort | Priority |
|---|---|---|---|
| Flow Code | Functional | Low (add property panel) | High |
| No-Code | Skeleton | High (full builder) | Medium |
| Topology | Partial | Medium (parse YAML to nodes) | High |
| Documentation | Skeleton | Low (markdown editor) | Low |
| Namespace Files | Skeleton | Medium (file CRUD) | Low |
| Blueprints | Skeleton | Medium (catalog browser) | Low |
| Playground | Skeleton | High (execution integration) | High |
