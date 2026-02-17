# New-Site Layout Specification v1

Date: 2026-02-17
Status: Draft for lock-in

## 1. Purpose

One document that locks the shell grid, navigation architecture, pane behavior, and page templates so that implementation stays true to the design across all pages. Any change to this spec requires a version bump.

---

## 2. Shell Grid Contract (Locked)

The shell is a single CSS Grid with 4 rows and 7 columns.

### 2.1 Rows

| Row | Area | Height | Behavior |
|-----|------|--------|----------|
| 1 | devnav | `30px` | Dev-only navigation bar. Removed in production builds. |
| 2 | header | `50px` | Fixed. App title, breadcrumbs, primary actions. |
| 3 | body | `minmax(0, 1fr)` | Fluid. Contains rail, nav, splitters, main, context rail, AI. |
| 4 | footer | `24px` | Fixed. Status strip. |

### 2.2 Columns

| Column | Area | Width | Behavior |
|--------|------|-------|----------|
| 1 | rail | `80px` | Fixed. Icon-only app rail (primary navigation tablist). |
| 2 | nav | `minmax(240px, var(--pane-nav-width))` | Resizable. Explorer panel. Default `280px`, range `240–420px`. |
| 3 | split-nav | `10px` | Fixed. Drag handle between nav and main. |
| 4 | main | `minmax(0, 1fr)` | Fluid. Primary work area. |
| 5 | rrail | `56px` or `0px` | Conditional. Right context rail (icon tablist). |
| 6 | split-ai | `10px` or `0px` | Conditional. Drag handle between main and AI panel. |
| 7 | ai | `minmax(320px, var(--pane-ai-width))` or `0px` | Conditional. AI assistant panel. Default `360px`, range `320–460px`. |

### 2.3 Grid Template (canonical)

```
grid-template-rows: [devnav-h] [header-h] minmax(0, 1fr) [footer-h];
grid-template-columns: [rail] [nav] [split-nav] [main 1fr] [rrail] [split-ai] [ai];
grid-template-areas:
  "devnav  devnav    devnav    devnav  devnav   devnav    devnav"
  "header  header    header    header  header   header    header"
  "rail    nav       split-nav main    rrail    split-ai  ai"
  "footer  footer    footer    footer  footer   footer    footer";
```

### 2.4 Rules

1. Header and footer span all columns. Always visible.
2. Rail is always visible and never collapses (it is the primary nav).
3. Nav pane, right rail, split-ai, and AI panel are conditional per AI mode and viewport.
4. Every grid child sets `min-width: 0` and `min-height: 0` to prevent overflow.

---

## 3. AI Panel Modes (Locked)

Three mutually exclusive modes controlled by `data-ai-mode` on `.pm-shell`.

| Mode | `data-ai-mode` | AI panel | Split-AI | Right rail | AI chip |
|------|----------------|----------|----------|------------|---------|
| Expanded | `expanded` | Visible, resizable | Visible | Hidden (absorbed) | Hidden |
| Collapsed line | `collapsed-line` | Hidden (0px) | Absolute-positioned thin line at right edge | Visible (if `data-right-rail="true"`) | Hidden |
| Floating chip | `floating-chip` | Hidden (0px) | Hidden | Hidden | Visible (absolute, bottom-right of main) |

### 3.1 Mode Transitions

- **Collapsed → Expanded**: Drag the collapsed splitter line leftward past `60px` threshold, OR double-click the splitter, OR keyboard ArrowLeft on focused splitter.
- **Expanded → Collapsed**: Drag AI panel width below `60px` snap threshold, OR double-click the splitter.
- **Floating chip**: Static mode. No drag transition. Click the chip to open AI (future: switches to expanded mode).

### 3.2 Persistence

- Panel widths and collapse state persist to `localStorage` with key prefix `pm-trackb-`.
- On hydration, read stored widths. If stored value is `"collapsed"`, restore collapsed-line mode.

---

## 4. Pane Resize Contract (Locked)

### 4.1 Nav Pane (Explorer)

| Property | Value |
|----------|-------|
| Default width | `280px` |
| Min width | `240px` |
| Max width | `420px` |
| Drag threshold | `3px` pointer movement before resize engages |
| Double-click | Resets to default width |
| Keyboard | Arrow ±8px, Shift+Arrow ±24px |

### 4.2 AI Pane (Assistant)

| Property | Value |
|----------|-------|
| Default width | `360px` |
| Min width | `320px` |
| Max width | `460px` |
| Drag threshold | `3px` |
| Snap-to-collapse | Below `60px` candidate width → collapse |
| Double-click | Toggle between expanded (default width) and collapsed-line |
| Keyboard | Arrow ±8px, Shift+Arrow ±24px |

### 4.3 Splitter Visual States

| State | Line color | Background |
|-------|-----------|------------|
| Idle | `--border-subtle` | Transparent |
| Hover | `--border-strong` | 35% `--surface-tertiary` |
| Dragging | `--focus-ring` | (same as hover) |
| Focus-visible | — | `--focus-ring-shadow` |

### 4.4 Splitter Semantics

- `role="separator"`, `aria-orientation="vertical"`
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow` updated on drag
- Cursor: `col-resize`
- Hit area: `10px` wide (larger than visual line)

---

## 5. Responsive Breakpoints (Locked)

| Breakpoint | Columns removed | What hides |
|------------|----------------|------------|
| `≤ 1279px` | AI + split-ai | AI panel hidden regardless of mode |
| `≤ 1099px` | + right rail | Right context rail also hidden |
| `≤ 899px` | + nav + split-nav | Explorer pane hidden; rail + main only |

At each breakpoint, the grid re-declares `grid-template-columns` and `grid-template-areas` to drop the removed zones.

---

## 6. Navigation Architecture

### 6.1 Left App Rail (Primary Navigation)

The left rail is an 80px-wide vertical strip of icon buttons. It acts as a `role="tablist"` controlling what content appears in the explorer pane (column 2).

**Keyboard**: Roving tabindex. Arrow Up/Down moves focus and activates. Enter/Space activates focused tab.

#### Proposed Tabs (Blockdata Features)

| Position | Key | Icon | Label | Explorer Content |
|----------|-----|------|-------|-----------------|
| 1 | `home` | Home | Home | Recent documents, recent runs, quick-start actions |
| 2 | `projects` | Folder | Projects | Project list with search. Click project → document list within that project |
| 3 | `schemas` | Schema | Schemas | Schema list + template library. Filter by user-created vs curated |
| 4 | `studio` | Canvas | Studio | Active workspace file browser. Documents loaded into the current session |
| 5 | `runs` | Play | Runs | Run queue with status filter (queued, running, success, failed) |
| — | — | — | — | *divider* |
| 6 | `integrations` | Plug | Integrations | Agents, MCP servers, Commands. Feature-flagged sub-sections |
| 7 | `settings` | Gear | Settings | Settings categories: General, API Keys, Models, Admin |

Position 7 (`settings`) is anchored to the bottom of the rail. All others stack from the top.

#### Mapping from Current `web/` Navigation

| web/ nav group | web/ item | new-site rail tab | Explorer section |
|----------------|-----------|-------------------|-----------------|
| Track A | Workspace | `home` | Dashboard |
| Track A | Projects | `projects` | Project list |
| Track A | User Schemas | `schemas` | "My Schemas" filter |
| Track A | Schema Library | `schemas` | "Templates" filter |
| Track B | Workspace | `studio` | Workspace file browser |
| Track B | Pipeline | `runs` | Run queue |
| Automation | Agents | `integrations` | Agents sub-panel |
| Automation | MCP | `integrations` | MCP sub-panel |
| Automation | Commands | `integrations` | Commands sub-panel |
| System | Settings | `settings` | Settings sections |

**Key change**: "Track A" and "Track B" disappear as user-facing labels. The navigation is organized by *what the user does* (manage projects, define schemas, work in studio, monitor runs), not by implementation track.

### 6.2 Explorer Pane (Secondary Navigation)

The resizable panel (column 2) that changes content based on which left rail tab is active.

#### Per-Tab Content Structure

**Home Explorer**
```
[Panel Title: Home]
── Quick Actions ──
   + New Project
   + Upload Documents
   + Create Schema
── Recent Documents ──
   doc-1.pdf  (Project Alpha)
   doc-2.docx (Project Beta)
── Recent Runs ──
   run_001 success 3m ago
   run_002 running
```

**Projects Explorer**
```
[Panel Title: Projects]
[Search input]
── Project Alpha ──────── active
── Project Beta
── Project Gamma
── + Create Project
```
Clicking a project navigates main area to project detail (document list, upload, settings).

**Schemas Explorer**
```
[Panel Title: Schemas]
[Search input]
[Filter: My Schemas | Templates]
── Legal Analysis ──────── active
── Contract Review
── Citation Extraction
── + New Schema
```
Clicking a schema opens it in the main area (editor or detail view).

**Studio Explorer**
```
[Panel Title: Studio]
[Active Project: Project Alpha]
── Documents ──
   jwc_cv_2026.pdf ───── active
   case-1-bba59aa7.pdf
── Processing Steps ──
   Transform ✓
   Extract ◌
   Enrich ◌
```
Shows the working file set for the current studio session.

**Runs Explorer**
```
[Panel Title: Runs]
[Status filter: All | Queued | Running | Done | Failed]
── run_2026_02_17_001 ── running
── run_2026_02_17_000 ── success
── run_2026_02_16_118 ── failed
```

**Integrations Explorer**
```
[Panel Title: Integrations]
── Agents ──
   Claude Sonnet (default)
   + Configure
── MCP Servers ──
   (none configured)
── Commands ──
   (coming soon)
```

**Settings Explorer**
```
[Panel Title: Settings]
── General
── API Keys ──────────── active
── Model Defaults
── Admin (superuser only)
```

### 6.3 Header Bar

| Zone | Content | Behavior |
|------|---------|----------|
| Left | App wordmark ("BlockData") + page title + breadcrumb/subtitle | Wordmark navigates to Home. Title reflects current page. |
| Center | (Reserved for future: tab strip, environment selector) | Empty for now. Slot exists for per-page injection. |
| Right | Search (Ctrl+K) + AI toggle + Theme toggle + primary actions | Search opens command palette. AI toggle switches AI panel mode. Theme toggles dark/light. |

**Primary actions** in the header-right zone are page-specific:
- Studio pages: Transform, Extract, Run
- Schema pages: Save, Validate
- Settings pages: (none — actions are inline)
- Project pages: Upload, New Run

### 6.4 Right Context Rail (Contextual Actions)

The right context rail is a narrow icon column (56px) that provides page-type-specific tool tabs. It is **only visible** when:
- `data-ai-mode` is `collapsed-line` or `floating-chip`
- AND `data-right-rail="true"`

When AI panel is expanded, the right rail hides (the AI panel occupies that space).

#### Context Rail Per Page Type

**Canvas / Studio pages**
| Key | Icon | Label | Opens |
|-----|------|-------|-------|
| `inspector` | Info | Inspector | Node/block property panel |
| `schemas` | Schema | Schemas | Quick schema picker overlay |
| `config` | Gear | Run Config | Model, batch settings |
| `history` | Clock | History | Snapshot/version list |
| `export` | Download | Export | Export options |

**Document Workbench pages**
| Key | Icon | Label | Opens |
|-----|------|-------|-------|
| `preview` | Eye | Preview | Page navigation, zoom controls |
| `blocks` | Grid | Blocks | Block inspector table |
| `schema` | Schema | Schema | Applied schema detail |
| `export` | Download | Export | JSON, CSV, structured export |

**Run Monitor pages**
| Key | Icon | Label | Opens |
|-----|------|-------|-------|
| `actions` | Play | Actions | Cancel, retry, rerun |
| `logs` | Terminal | Logs | Streaming log viewer |
| `artifacts` | Package | Artifacts | Output file browser |

**Settings pages**
Right rail hidden (`data-right-rail="false"`).

### 6.5 Footer Status Strip

| Zone | Content |
|------|---------|
| Left | Contextual status message (page state, processing status, error summary) |
| Right | Tip text, connection status, or mode indicator |

---

## 7. Page Type Templates

Each page declares its shell configuration via props to `LayoutShell`.

### 7.1 Canvas Page

Used for: Flow designer, extraction workflow canvas.

```
canvas: true
aiMode: "floating-chip" or "collapsed-line"
rightRail: true
toolbar: <CanvasToolbar />  (floating pill bar at bottom of canvas)
main: <FlowCanvas />
```

Explorer shows: Studio file browser.
Context rail shows: Inspector, Schemas, Run Config, History, Export.

### 7.2 Document Workbench Page

Used for: Document preview + extraction results side-by-side.

```
canvas: false
aiMode: "collapsed-line"
rightRail: true
main: <SplitPane left={<PdfPreview />} right={<ResultPanel />} />
```

Explorer shows: Studio file browser (document list).
Context rail shows: Preview, Blocks, Schema, Export.

### 7.3 List/Table Page

Used for: Projects list, Schemas list, Runs list.

```
canvas: false
aiMode: "collapsed-line"
rightRail: false
main: <DataTable />
```

Explorer shows: Respective list (projects, schemas, runs) with search/filter.
Context rail: Hidden.

### 7.4 Detail Page

Used for: Project detail, Run detail, Schema editor.

```
canvas: false
aiMode: "collapsed-line"
rightRail: false  (or true for schema editor with field inspector)
main: <DetailView />
```

Explorer shows: Parent list with active item highlighted.

### 7.5 Settings Page

Used for: User settings, API keys, Admin panel.

```
canvas: false
aiMode: "collapsed-line"
rightRail: false
main: <SettingsForm />
```

Explorer shows: Settings section list.

### 7.6 Dashboard Page (Home)

Used for: Workspace home / landing.

```
canvas: false
aiMode: "floating-chip"
rightRail: false
main: <Dashboard />
```

Explorer shows: Quick actions, recent items.

---

## 8. Token Consumption Rules (Locked)

These rules are inherited from the master spec and apply to all new-site code.

1. No direct hex values in feature CSS. Only `var(--token-name)`.
2. No ad hoc `border-radius` values. Only `var(--radius-*)`.
3. No arbitrary `margin`/`padding` values. Only `var(--space-*)`.
4. No magic-number `z-index`. Only `var(--z-*)`.
5. No hard-coded sizing for repeated elements. Only `var(--size-*)`.
6. If a new token is needed, add it to `:root` in `layout-shell.css` first.

---

## 9. Interaction State Matrix (Locked)

Every interactive element must implement all applicable states.

| Element | Default | Hover | Active | Focus-visible | Disabled | Selected |
|---------|---------|-------|--------|---------------|----------|----------|
| `.pm-btn` | yes | border-strong + shadow-1 | translateY(1px) | focus-ring-shadow | text-disabled, no pointer | — |
| `.pm-icon-btn` | yes | border-strong + tertiary bg | — | focus-ring-shadow | text-disabled, no pointer | is-active class |
| `.pm-list-item` | yes | text-primary + tertiary bg | — | focus-ring-shadow | — | is-active + brand-primary left border |
| `.pm-split` | subtle line | strong line + tinted bg | focus-ring line | focus-ring-shadow | — | — |
| `.pm-flow-node` | shadow-2 | border-strong | — | — | opacity 0.7 + text-disabled | is-selected: focus-ring-shadow |
| `.react-flow__edge` | border-default stroke | — | — | — | — | focus-ring stroke |
| `.react-flow__handle` | secondary bg | focus-ring border | — | — | — | connectable: brand-action bg |

---

## 10. Scalability Notes

### Adding a new rail tab
1. Add entry to the rail tab array (e.g., `APP_RAIL_TABS` or page-level equivalent).
2. Implement the explorer pane content component.
3. No grid changes needed — the rail, nav, and main areas are independent.

### Adding a new context rail tab
1. Add entry to the context rail tab array for the relevant page type.
2. Implement the overlay/panel content.
3. No grid changes needed.

### Adding a new page type
1. Choose the closest template from Section 7.
2. Declare shell props (`canvas`, `aiMode`, `rightRail`).
3. Implement the `main` content.
4. Define which explorer content and context rail tabs apply.

### Adding a new token
1. Add to `:root` in `layout-shell.css`.
2. Document in the master spec token pack if it's a new category.
3. Use it via `var(--new-token)` — never raw values.

---

## 11. What This Spec Does NOT Cover

1. **Routing implementation** — URL structure and navigation library are separate concerns.
2. **Data fetching** — How pages load data is outside layout spec scope.
3. **Mantine theme bridge** — Covered in the master frontend spec. This spec assumes Mantine controls inside panels consume the token system.
4. **Marketing / public pages** — These use a different shell (no rail, no AI panel).
5. **Mobile-first responsive** — Current breakpoints collapse gracefully but don't redesign for phone viewports. This is a desktop-first tooling surface.

---

## 12. Freeze Notice

This document is the layout contract for all new-site page work.
Changes require a version bump (`v1` → `v1.1` → `v2`) and migration notes.
Do not silently modify grid geometry, navigation structure, or pane behavior contracts.
