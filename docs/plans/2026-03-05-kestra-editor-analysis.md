# Kestra Editor Feature Analysis

> Source: [kestra-io/kestra](https://github.com/kestra-io/kestra) `develop` branch, `ui/src/`
> Verified: 2026-03-05

This document catalogs every editor sub-feature in Kestra's flow editor, organized by functional area. Each section lists exact source files, component APIs, and behavioral details.

---

## Table of Contents

1. [Multi-Panel System](#1-multi-panel-system)
2. [Flow Code (YAML Editor)](#2-flow-code-yaml-editor)
3. [No-Code Editor](#3-no-code-editor)
4. [Topology (DAG Visualization)](#4-topology-dag-visualization)
5. [Documentation (Plugin Browser)](#5-documentation-plugin-browser)
6. [Namespace Files (File Explorer)](#6-namespace-files-file-explorer)
7. [Blueprints (Template Catalog)](#7-blueprints-template-catalog)
8. [Playground (Execution Panel)](#8-playground-execution-panel)
9. [Editor Toolbar](#9-editor-toolbar)
10. [Our Equivalent Architecture](#10-our-equivalent-architecture)

---

## 1. Multi-Panel System

The panel system is the container that holds all editor sub-tabs. It provides splitting, tab drag/drop, and persistence.

### Source Files

| File | Purpose |
|------|---------|
| `components/MultiPanelGenericEditorView.vue` | Top-level layout: vertical splitter (editor + bottom playground) |
| `components/MultiPanelTabs.vue` | Core panel engine: horizontal splitter, tab bar, drag/drop |
| `components/MultiPanelEditorTabs.vue` | Tab strip UI above the panels |
| `components/flows/MultiPanelFlowEditorView.vue` | Flow-specific wrapper: wires panel definitions + playground |
| `override/components/flows/panelDefinition.ts` | Declares the 6 editor tabs with UIDs, icons, components |

### Panel Definition (panelDefinition.ts)

Six panels are registered in `EDITOR_ELEMENTS`:

| UID | Label | Component | Notes |
|-----|-------|-----------|-------|
| `code` | Flow Code | `EditorWrapper` | YAML editor |
| `nocode` | No-code | `NoCode` | Form-based editor |
| `topology` | Topology | `LowCodeEditorWrapper` | DAG visualization |
| `doc` | Documentation | `PluginListWrapper` | Plugin schema docs |
| `files` | Namespace Files | `FileExplorerWrapper` | File browser, `prepend: true` |
| `blueprints` | Blueprints | `BlueprintsWrapper` | Template catalog |

Default active tabs persist via localStorage. When `NO_CODE` view mode was previously saved, it auto-selects.

Each element provides:
- `uid`: string identifier
- `icon`: Material Design icon name
- `title`: display label
- `component`: raw Vue component (via `markRaw`)
- `deserialize(tabValue)`: restores tab state from saved string

### MultiPanelGenericEditorView.vue

**Props:**
- `editorElements` (EditorElement[]): available tabs
- `defaultActiveTabs` (string[]): initial tabs to open
- `saveKey` (string): localStorage key for persistence
- `bottomVisible` (boolean): show/hide playground panel
- `preSerializePanels` (function): hook to transform panels before save

**Exposed API:**
- `panels`: reactive panel state
- `openTabs`: computed list of open tab UIDs
- `focusTab(tabValue)`: activate a specific tab
- `setTabValue(tabValue)`: toggle tab open/closed
- `saveState()`: persist to localStorage

**Layout:** Three-tier grid:
```
MultiPanelEditorTabs (tab strip + action buttons)
├── el-splitter (vertical)
│   ├── MultiPanelTabs (horizontal splitter with panels)
│   └── Bottom Panel (FlowPlayground, conditional)
└── Footer slot (keyboard shortcuts)
```

### MultiPanelTabs.vue (Core Panel Engine)

**Model:** `v-model:panels` — reactive `Panel<TabLive>[]`

**Tab Drag/Drop Workflow:**
1. `dragstart()` — captures tab info (panelIndex, tabId, tab object)
2. `dragover()` — calculates insertion index via mouse X vs. tab midpoints, inserts placeholder
3. `drop()` — calls `moveTab()` to splice tab from source and insert at target
4. `cleanUp()` — resets drag state, removes placeholders

**Panel Operations:**
- `splitPanel()` — duplicates active tab into new adjacent panel
- `movePanel()` — reorders panels via array splice
- `newPanelDrop()` — creates new panel from left/right drop zones
- `onResize()` — updates `panel.size` percentages from splitter events

**Other Behaviors:**
- Middle-click closes tab (`button === 1`)
- Horizontal mouse wheel scrolls the tab bar
- Empty panels auto-removed via watcher
- Panel sizes recalculated as fractions on resize
- `el-splitter` with min 10% panel width
- `KeepAlive` wraps active tab component for state preservation

---

## 2. Flow Code (YAML Editor)

The primary code editing experience using Monaco Editor.

### Source Files

| File | Purpose |
|------|---------|
| `components/inputs/EditorWrapper.vue` | Tab-level wrapper: draft mode, AI copilot, file type routing |
| `components/inputs/Editor.vue` | Monaco configuration, keyboard shortcuts, decorations |
| `components/inputs/MonacoEditor.vue` | Low-level Monaco instance: themes, diff editor, date picker |

### EditorWrapper.vue (Tab-Level Wrapper)

**File type routing:**
- Images (jpg, jpeg, png, gif, webp, webm, avif) → preview
- Code files (yaml, yml, json, js, ts, jsx, tsx) → Monaco editor

**Draft Mode (AI Copilot):**
- Toggle: `Ctrl/Cmd + Alt + Shift + K`
- Maintains separate `draftSource` from main `source`
- Shows diff view between draft and original
- Accept/Reject buttons to commit or discard AI changes
- Tracks user actions for analytics (PostHog)
- Conversation IDs for multi-turn AI interactions

**Key Behaviors:**
- Watches flow store for AI copilot open signals
- Updates plugin documentation on cursor movement
- Throttles flow validation updates (1000ms debounce)
- Dirty state tracking via injection keys
- `Ctrl/Cmd + S` triggers save

### Editor.vue (Monaco Configuration)

**Props (20+):**
- `modelValue`, `original`, `lang`, `path`, `extension`, `schemaType`
- `navbar`, `input`, `keepFocused`, `largeSuggestions`, `fullHeight`
- `customHeight`, `theme`, `placeholder`, `diffSideBySide`, `readOnly`
- `wordWrap`, `lineNumbers`, `minimap`, `creating`, `label`, `shouldFocus`, `showScroll`, `diffOverviewBar`, `scrollKey`

**Emits (8):** `save`, `execute`, `focusout`, `update:modelValue`, `cursor`, `confirm`, `mouse-move`, `mouse-leave`

**Keyboard Shortcuts (editorDidMount):**
- `Ctrl/Cmd + S` → save
- `Ctrl/Cmd + E` → execute
- `Ctrl/Cmd + Enter` → confirm

**Monaco Features:**
- Pebble template syntax highlighting (`{{...}}`) via regex decorations
- Duplicate YAML task ID detection with marker highlighting
- Scroll position memory via localStorage
- Auto-fold / unfold all controls
- Content widgets (dynamic overlays)
- Line range highlighting with decorations
- Font size/family from localStorage preferences
- Responsive height adjustment

**Diff Mode:** Activated when `original` prop is set; supports side-by-side or inline view.

### MonacoEditor.vue (Low-Level Instance)

**Props:** `value`, `language`, `theme`, `diffEditor`, `original`, `placeholder`, `readonly`, `largeSuggestions`, `schemaType`

**Emits:** `editorDidMount`, `change`, `mouseMove`, `mouseLeave`

**Features:**
- Custom light/dark themes with configurable token rules
- Inline date picker widget for timestamp insertion
- Ghost text (inline suggestions) for YAML flow editors
- Pebble template block detection for context-aware suggestions
- Suggestion widget auto-resizing with DOM manipulation
- VS Code icons replaced with task-specific icons
- TypeScript type definitions loading with retry logic
- Resize observers for container changes

---

## 3. No-Code Editor

Schema-driven form UI that generates editable forms from plugin schemas and syncs changes back to YAML.

### Source Files

| File | Purpose |
|------|---------|
| `components/no-code/NoCode.vue` | Main no-code editor: YAML parsing, form rendering, validation |
| `components/no-code/components/tasks/MixinTask.ts` | Base mixin for all task field components |
| `components/no-code/components/tasks/TaskBasic.vue` | Basic field (string, number) |
| `components/no-code/components/tasks/TaskBoolean.vue` | Boolean toggle |
| `components/no-code/components/tasks/TaskArray.vue` | Array field |
| `components/no-code/components/tasks/TaskComplex.vue` | Nested object field |
| `components/no-code/components/tasks/TaskAnyOf.vue` | Union/anyOf field |
| `components/no-code/components/tasks/TaskConstant.vue` | Constant value display |
| `components/no-code/components/inputs/InputText.vue` | Text input |
| `components/no-code/components/inputs/InputSwitch.vue` | Toggle switch |
| `components/no-code/components/inputs/InputPair.vue` | Key-value pair |
| `components/no-code/components/Add.vue` | Add task button |
| `components/no-code/components/TaskEditor.vue` | Task editing form |

### NoCode.vue

**Props (via NoCodeProps):**
- `parentPath`: parent path for task hierarchy
- `refPath`: reference path identifier
- `position`: "after" or "before" (default: "after")
- `creatingTask`: boolean — task creation mode
- `editingTask`: boolean — task editing mode
- `fieldName`: field identifier
- `blockSchemaPath`: schema path for validation

**Emits:**
- `createTask(parentPath, blockSchemaPath, refPath, position)`
- `editTask(parentPath, blockSchemaPath, refPath)`
- `closeTask` — signals task panel closure

**Key Computed:**
- `lastValidFlowYaml` — tracks most recent parseable YAML
- `flowYaml` — current flow YAML from store
- `flowIdentity` — namespace/flowId combination

**Methods:**
- `onTaskUpdateField()` — sanitizes values (removes null/undefined), updates YAML via `replaceBlockWithPath`
- `editorUpdate()` — validates parsed YAML against store; only updates if structural changes detected
- `validateFlow()` — debounced validation (500ms)
- `shouldMerge()` — determines wrapper merging based on schema complexity

**Dependency Injection:** Provides 14 injection keys to child components (schema definitions, update functions, configuration state).

### MixinTask.ts (Base Task Component)

**Accepted modelValue types:** Object, String, Number, Boolean, Array

**Update flow:**
1. `onInput()` receives new value
2. `collapseEmptyValues()` normalizes (removes empty strings, nulls, empty objects)
3. Emits `update:modelValue` with processed value

**Schema integration:**
- Extracts `title`, `type` from schema prop
- Checks required fields via `schema.required`
- Applies defaults from `schema.default`
- `editorValue` computed: converts non-string values to YAML for display
- `getKey()` constructs dotted paths using optional `root` parameter

### Form Generation Flow

```
Plugin Schema (JSON Schema)
  → NoCode.vue parses schema
  → Determines field type (basic, boolean, array, complex, anyOf, constant)
  → Renders appropriate Task* component
  → User edits field
  → MixinTask.onInput() sanitizes
  → NoCode.onTaskUpdateField() updates YAML via replaceBlockWithPath
  → Store receives updated YAML
  → Debounced validation (500ms)
```

---

## 4. Topology (DAG Visualization)

Interactive directed acyclic graph rendering of flow tasks and their relationships.

### Source Files

| File | Purpose |
|------|---------|
| `components/inputs/LowCodeEditor.vue` | Flow topology with task CRUD operations |
| `components/inputs/LowCodeEditorWrapper.vue` | Wrapper for panel integration |
| `components/flows/Topology.vue` | Execution topology (read-only variant) |
| `components/executions/Topology.vue` | Execution-specific topology |
| `ui-libs: components/topology/Topology.vue` | Core DAG rendering engine (in ui-libs) |

### LowCodeEditor.vue

**Props:**
- `flowGraph` (required): graph data object
- `flowId`, `namespace`: flow identity
- `execution`: execution data for state visualization
- `isReadOnly` (default: false)
- `source` (default: ""): flow YAML source
- `isAllowedEdit` (default: false)
- `horizontalDefault`: initial layout direction
- `toggleOrientationButton` (default: true)
- `expandedSubflows` (default: [])

**Emits:** `follow`, `on-edit`, `loading`, `expand-subflow`, `swapped-task`

**Task Operations (methods):**
- `onEditTask()` — routes task edit via injection key
- `onDelete()` — removes task (prevents empty flows)
- `onCreateNewTask()` — creates task before/after target
- `showLogs()` — displays task run logs in drawer
- `showDescription()` — renders markdown task documentation
- `showCondition()` — shows YAML conditional expression

**Layout:**
- `toggleOrientation()` — switches horizontal/vertical (persisted in localStorage)
- `openFlow()` — opens execution or flow in new window

**Graph source:** `playgroundStore.enabled ? executionsStore.flowGraph : props.flowGraph`

**Task sections:** tasks, errors, triggers — each supports edit, delete, swap order, add error handlers.

**Drawer Panel:** Side panel showing:
- Task run logs with search/level filtering
- Markdown task descriptions
- YAML condition expressions
- Task ID displayed in code tag

**Vue Flow Integration:**
- Uses `@vue-flow/core`
- Dynamic viewport ID: `Math.random().toString()`
- Minimum zoom: `0.1`
- `fitView()` on resize with 50ms debounce
- Execution graph augmentation via store

---

## 5. Documentation (Plugin Browser)

Browsable plugin documentation with schema rendering and search.

### Source Files

| File | Purpose |
|------|---------|
| `ui-libs: components/plugins/PluginListWrapper.vue` | Wrapper for panel integration |
| `ui-libs: components/plugins/PluginList.vue` | Plugin list with group/subgroup hierarchy |
| `ui-libs: components/plugins/PluginIndex.vue` | Plugin index page |
| `ui-libs: components/plugins/SchemaToHtml.vue` | Renders JSON Schema as HTML docs |
| `ui-libs: components/plugins/SchemaToCode.vue` | Renders schema as code examples |
| `ui-libs: components/plugins/CollapsibleProperties.vue` | Collapsible property sections |
| `ui-libs: components/plugins/PropertyDetail.vue` | Individual property documentation |
| `ui-libs: stores/plugins.ts` | Plugin data store with caching |
| `ui-libs: utils/plugins.ts` | Plugin utility functions |

### Plugin Browser Hierarchy

```
Plugin Groups (e.g., "io.kestra.plugin.core")
  → Subgroups (e.g., "flow", "http", "script")
    → Individual plugins (e.g., "io.kestra.plugin.core.flow.If")
      → Schema properties (inputs, outputs, definitions)
```

### Key Behaviors

- **Lazy loading:** Plugin schemas loaded on demand, not all at once
- **Caching:** Plugin store caches fetched schemas to avoid redundant API calls
- **Search:** Text search across plugin names and descriptions
- **Group/subgroup navigation:** Hierarchical tree navigation
- **Schema rendering:** JSON Schema → HTML documentation with collapsible sections
- **Flow properties sidebar:** Rendered from `basic.md` — shows flow-level settings (id, namespace, description, inputs)

---

## 6. Namespace Files (File Explorer)

Full file management system for namespace-scoped files (scripts, configs, etc.).

### Source Files

| File | Purpose |
|------|---------|
| `components/inputs/FileExplorer.vue` | Core file tree with all CRUD operations |
| `components/inputs/FileExplorerWrapper.vue` | Wrapper for panel integration |

### FileExplorer.vue

**Props:** `currentNS` (string | null) — current namespace

**Injection Keys:**
- `FILES_OPEN_TAB_INJECTION_KEY` — opens editor tab with file metadata
- `FILES_CLOSE_TAB_INJECTION_KEY` — closes tab by file path

### Tree Operations

- **Lazy loading:** Tree nodes load children on expansion
- **Single click:** Selects item; opens files in editor tab
- **Ctrl+Click:** Toggle individual selection
- **Shift+Click:** Range selection using flattened tree indexing
- **Checkbox:** Direct toggle in multi-select mode
- **Empty-area click:** Clears selection
- **Drag-drop:** Reorganize with rollback on failure

### File/Folder Management

| Method | Behavior |
|--------|----------|
| `addFile()` | Creates new file; opens in editor tab |
| `addFolder()` | Creates new folder in parent |
| `renameItem()` | Renames maintaining path structure |
| `removeItems()` | Deletes selected; closes associated tabs |
| `nodeMoved()` | Handles drag-drop reorganization |

### Import/Export

- `importFiles()` — multi-file/folder upload via file picker
- `exportFiles()` — exports entire namespace directory
- `exportFile()` — downloads individual file as Blob

### Revision Management

- `showRevisionsHistory()` — fetches file revision history
- `fetchRevisionSource()` — retrieves specific revision content
- `restore()` — restores file to previous revision

### Template Structure

```
Toolbar
├── Search filter (remote method)
├── Create file/folder buttons (with tooltips)
├── Import file/folder inputs
└── Export button

Tree (el-tree)
├── Lazy-loading nodes
├── Custom node renderer (type icons)
├── Drag-drop with validation
├── Context menu per node
└── Checkbox selection (multi-select mode)

Dialogs
├── Creation Dialog (name + parent folder)
├── Rename Dialog
├── Confirmation Dialog (deletion)
└── Revisions Dialog (full-width history viewer)
```

### Context Menu

Right-click on node: create, history, copy path, export, rename, delete. Multi-select shows aggregated delete. Root context menu for quick file/folder creation.

---

## 7. Blueprints (Template Catalog)

Searchable catalog of flow templates that can be used to bootstrap new flows.

### Source Files

| File | Purpose |
|------|---------|
| `components/flows/blueprints/BlueprintsBrowser.vue` | Main catalog grid with search/filter |
| `components/flows/blueprints/BlueprintsWrapper.vue` | Wrapper for panel integration |

### BlueprintsBrowser.vue

**Props:**
- `blueprintType`: "community" | "custom" (default: "community")
- `blueprintKind`: "flow" | "dashboard" | "app" (default: "flow")
- `embed`: boolean for embedded mode
- `system`: boolean for system namespace display
- `tagsResponseMapper`: function to transform tag responses

### Card Grid Layout

```css
display: grid;
grid-template-columns: repeat(auto-fill, minmax(297px, 1fr));
```

Cards scale 1.02x on hover with shadow enhancement.

**Card content:**
- Tag badges
- "Template" indicator
- Blueprint title
- Task icons (from `includedTasks`)
- Action buttons

### Search & Filtering

- **Text search:** `handleSearch()` updates route query; watched for data reload
- **Tag filtering:** Selected tags update URL query params; different behavior in embedded vs standard mode
- **Data loading:** Parallel load of tags and blueprints via API; query params: `page`, `size`, `q`, `tags`

### "Use" Action Flow

1. User clicks "Use" button (shown when `!embed && userCanCreate`)
2. `blueprintToEditor()` fires, logs to PostHog
3. Sets localStorage editor view type
4. Navigates to editor route with `blueprintId` query parameter
5. For flows, includes `blueprintSource` query parameter
6. Route target: `${blueprintKind}s/create`

**Other actions:**
- `copy()` — fetches blueprint source, copies to clipboard
- `goToDetail()` — navigates to detail view or emits event (embedded mode)

---

## 8. Playground (Execution Panel)

Bottom panel for executing flows/tasks and viewing results in real-time.

### Source Files

| File | Purpose |
|------|---------|
| `components/flows/FlowPlayground.vue` | Main playground: run controls, tab navigation, history |
| `components/flows/playground/PlaygroundLog.vue` | Run history sidebar |
| `components/inputs/PlaygroundRunTaskButton.vue` | Per-task run button in editor |
| `components/inputs/FlowPlaygroundToggle.vue` | Toggle playground visibility |

### FlowPlayground.vue

**Store integration:** `playgroundStore` (enabled, executions, latestExecution) + `executionsStore` (execution data, SSE streaming)

**Template layout:**
```
Playground Section
├── Header (sticky, z-100)
│   ├── Title with icon
│   └── Action dropdowns (clear, close)
├── Content (flex)
│   ├── Current Run Panel
│   │   ├── Pill tab navigation (Logs | Gantt | Outputs | Metrics)
│   │   └── Dynamic tab component
│   ├── Run History Sidebar (300px when visible)
│   │   └── PlaygroundLog (execution list)
│   └── Toggle history button (absolute)
```

### Sub-Panels

| Tab | Content |
|-----|---------|
| Logs | Execution log output with level filtering |
| Gantt | Task timeline visualization |
| Outputs | Execution results wrapper |
| Metrics | Performance metrics display |

### SSE Streaming

Reactive watcher monitors `latestExecution?.id` changes → triggers `followExecution()` for live EventSource streaming. Connection closes via `closeSSE()` on unmount.

### PlaygroundLog.vue (Run History)

- Iterates `executions` array; one button per execution
- Grid layout: 284px width, `1fr 80px` columns
- Shows: start date (formatted), duration (humanized), status badge
- Click selects execution → updates `executionsStore.execution`
- Active item highlighted with background color change
- Sidebar animates width (0 → 300px) with smooth transition

### Execution Flow

1. User clicks "Run" (PlaygroundRunTaskButton or flow-level run)
2. Execution created via API
3. SSE connection opened for real-time updates
4. Logs/Gantt/Outputs/Metrics panels populate as data streams in
5. Run appears in history sidebar
6. Can kill running execution
7. `runFromQuery()` auto-executes from URL query on mount

---

## 9. Editor Toolbar

### Source Files

| File | Purpose |
|------|---------|
| `components/inputs/EditorButtons.vue` | Save, export, delete, copy actions |
| `components/inputs/EditorButtonsWrapper.vue` | Wrapper for panel integration |

### EditorButtons.vue

**Primary action:** Save — enabled when changes exist or during creation; disabled if errors present

**Dropdown menu** (when user has edit/delete permissions):
- Export flow
- Delete flow (hidden during creation)
- Copy flow (hidden during creation)

**Conditions:** All dropdown actions disabled in read-only mode. Save button displays differently when playground mode is enabled.

**Not included in toolbar:** Undo, redo, AI copilot toggle (these are handled via keyboard shortcuts in EditorWrapper).

---

## 10. Our Equivalent Architecture

Our `FlowWorkbench` already mirrors Kestra's panel system with significant overlap:

### Current State (flowWorkbenchState.ts)

**PaneTabId union:** `flowCode | preview | documentation | nocode | topology | assets | blueprints`

**FLOW_WORKBENCH_TABS:**
| Our Tab | Kestra Equivalent | Status |
|---------|-------------------|--------|
| `flowCode` | Flow Code (`code`) | Implemented (Monaco YAML) |
| `preview` | — | Implemented (no Kestra equivalent) |
| `nocode` | No-code (`nocode`) | Stub |
| `topology` | Topology (`topology`) | Implemented (FlowCanvas) |
| `documentation` | Documentation (`doc`) | Stub |
| `assets` | Namespace Files (`files`) | Implemented (FilesTree) |
| `blueprints` | Blueprints (`blueprints`) | Stub |

### Pane Management Functions

- `createInitialPanes()` — 2 panes: flowCode (50%) + topology (50%)
- `activateTabInPane()` — moves tab between panes, strips from source pane
- `setActiveTabInPane()` — switches active tab within a pane
- `closeTabInPane()` — removes tab, auto-selects next
- `normalizePaneWidths()` — redistributes widths to 100%
- `keepAtLeastOnePane()` — fallback to single flowCode pane
- `finalizeStructure()` — cleans empty panes, resolves active tabs

### Key Differences from Kestra

| Feature | Kestra | Ours |
|---------|--------|------|
| Panel engine | `el-splitter` + custom Vue | Custom React state functions |
| Tab drag/drop | Full drag/drop between panels | Tab activation (move) between panes |
| Persistence | localStorage via composable | Not yet implemented |
| Playground | Bottom panel with SSE streaming | Not yet implemented |
| AI Copilot | Ctrl+Alt+Shift+K, draft mode | Not yet implemented |
| No-code | Schema-driven forms | Stub |
| Documentation | Plugin schema browser | Stub |
| Blueprints | Grid catalog with search/tags | Stub |

### Implementation Priority (Stubs Needing Work)

1. **Documentation** — Plugin/schema browser. Requires: plugin registry API, schema rendering.
2. **No-code** — Schema-driven form generation. Requires: flow schema definitions, field type components, YAML sync.
3. **Blueprints** — Template catalog. Requires: blueprint API, card grid, search/filter, "Use" action.
