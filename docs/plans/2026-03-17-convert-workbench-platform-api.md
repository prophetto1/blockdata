# Convert Workbench — Feature Spec

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Convert" menu to the platform that lets users convert code between languages (starting with Java → Python) using the scaffold pipeline, with a four-pane workbench for reviewing, configuring, and refining results.

**Architecture:** The Convert page reuses the existing Workbench component and file infrastructure from the Workspace page. The pipeline runs server-side via platform-api. Conversion is iterative — a fast scaffold pass first, then optional deeper passes (deterministic patterns, AI-assisted body translation) the user controls through a toolbar.

**Tech Stack:** React + Workbench component, platform-api (FastAPI), scaffold pipeline (`integrations/javalang/pipeline/`), project file list for source files.

---

## Background

We built a Java → Python translation pipeline that:

1. Parses Java source using tree-sitter (AST extraction)
2. Preprocesses: strips annotations in generics, normalizes `var`, handles Lombok
3. Builds scaffold models: fields, methods, types, imports, overload resolution
4. Emits Python: dataclasses, protocols, enums with correct imports and structure

The pipeline runs as a local script (`scripts/generate_scaffolds.py`) and produces Python scaffolds at ~55% overall fidelity — structure is complete, method bodies are stubs. Each improvement (type table expansion, Lombok pass, getter pruning, overload merging, `with*` body inference) is a small deterministic function added to the pipeline.

This spec turns that pipeline into a user-facing feature.

---

## User Flow

### 1. Entry Point

The user navigates to **Convert** in the left rail (new nav item, between Transform and the Flows divider). The page loads the Convert Workbench — a four-pane layout.

### 2. Select Source Files

The user already has files in their project's asset list (uploaded through the Assets page or Load page). On the Convert page, the **left column** shows their project file list. They select a folder or individual files — these are the source files to convert.

No File System Access API needed. The files are already in the platform.

### 3. Auto-Detection + Configure

Once files are selected, the system:

- **Auto-detects** the source language from file extensions (`.java` → Java, `.cs` → C#, `.go` → Go — initially only Java is supported)
- **Shows available target languages** for that source (Java → Python is the first supported pair)
- **Opens the config toolbar** at the top of the workbench

The config toolbar:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Java → Python  ▾ │ ☑ Lombok │ ☑ Prune getters │ ☑ Merge overloads   │
│                   │ ☑ Type mapping │ ☐ AI body fill │                  │
│ [ Convert ]       │ Depth: [ Scaffold only ▾ ]    │ — / — files done  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Config options** (each maps to a pipeline pass):

| Option | Pipeline pass | Default |
|--------|--------------|---------|
| Lombok interpretation | `_apply_lombok()` — @Value→frozen, @Slf4j→logger | On |
| Prune getters | Skip get*/is* methods when matching field exists | On |
| Merge overloads | Collapse Java overloads into single method with Optional params | On |
| Type mapping | Expand Java→Python type table (Stream→Iterator, etc.) | On |
| AI body fill | Use Claude to translate method bodies after scaffold pass | Off |
| Depth selector | Scaffold only / Deterministic patterns / AI-assisted | Scaffold only |

### 4. Convert

User clicks **Convert**. The pipeline runs on the selected files. Progress bar updates. When done, all four panes populate:

```
┌──────────┬──────────────────┬──────────────────┬──────────┐
│ Java     │ Java source      │ Python output    │ Python   │
│ files    │ (read-only)      │ (editable)       │ files    │
│          │                  │                  │ + status │
│ ✓ Foo.java│ public class Foo │ @dataclass       │ ✓ foo.py │
│ ✓ Bar.java│   private String │ class Foo:       │ ⚠ bar.py │
│   Baz.java│   name;          │   name: str      │ ✗ baz.py │
│          │                  │                  │          │
│          │   public String  │   # 3 stubs      │ 45% ████ │
│          │   getName() {    │                  │          │
│          │     return name; │                  │ 4277 methods│
│          │   }              │                  │ 3572 stubs │
└──────────┴──────────────────┴──────────────────┴──────────┘
```

- **Left column:** Java source file tree (from project files)
- **Center-left pane:** Java source for the active file (read-only)
- **Center-right pane:** Python output for the matching file (editable)
- **Right column:** Python output tree with completion bars and status indicators

### 5. Review + Refine

The user works through the converted files:

- **Click a file** in either rail → both center panes load the Java/Python pair
- **Scroll sync** — scrolling one pane scrolls the other, aligned by class/method position
- **Click a stub** in the Python pane → the Java pane scrolls to the matching method
- **Edit directly** — the Python pane is editable; changes persist
- **Re-convert a single file** — right-click → Re-convert (re-runs pipeline on just that file)
- **AI fill** — select a stub method, click "Fill with AI" in the toolbar. Platform sends the Java body + Python context to Claude, returns translated body, inserts it.

### 6. Deeper Passes

The user can increase conversion depth from the toolbar:

- **Scaffold only** (default) — fast, deterministic, produces structure with stub bodies
- **Deterministic patterns** — additional passes: null checks, stream pipelines, delegation, string/collection operations. Fills ~60-70% of method bodies mechanically.
- **AI-assisted** — sends remaining stubs to Claude for body translation. Fills ~90-95%.

Each depth level re-runs the pipeline with more passes enabled. The completion percentage climbs as depth increases.

### 7. Output

When satisfied, the converted files are already in the project. The user can:

- **Continue working** — files are in the workspace, editable, runnable
- **Download** — zip of the Python output
- **Push to repo** — if git integration is configured

---

## Toolbar Functions

| Button | Action | Maps to |
|--------|--------|---------|
| **Convert** | Run pipeline on selected files | `generate_scaffolds.py` equivalent |
| **Re-convert** | Re-run with current settings | Same, updated config |
| **Convert selected** | Re-convert just the active file | Pipeline on single file |
| **Fill stubs** | AI pass on remaining stubs | Claude API batch translation |
| **Validate** | Try-import all Python files, report errors | `try_import_all()` |
| **Diff** | Show what changed between conversion runs | Diff between runs |
| **Config** | Open full config panel | Pipeline pass toggles |

---

## What We Already Built (Pipeline Status)

All of these are deterministic pipeline passes — each one is a function in `integrations/javalang/pipeline/scaffold_builder.py` that runs during conversion:

| Pass | Function | Status | Effect |
|------|----------|--------|--------|
| Name mangling fix | `_to_snake()` | ✅ Shipped (v3) | UPPER_SNAKE_CASE → lower_snake_case correctly |
| Java initializer cleanup | `_map_default()` | ✅ Shipped (v3) | Drop untranslatable Java expressions |
| Nested generics | `_strip_type_annotations_in_generics()` | ✅ Shipped (v3) | Bracket-depth-aware annotation stripping |
| Context-safe var | `_strip_var_keyword()` | ✅ Shipped (v3) | Only replace `var` at statement positions |
| Lombok pass | `_apply_lombok()` | ✅ Shipped (v3) | @Value→frozen, @Slf4j→logger |
| Getter pruning | `_build_class()` | ✅ Shipped (v3) | Skip redundant get*/is* stubs |
| Type table expansion | `JAVA_TO_PYTHON_TYPES` | ✅ Shipped (v4) | 98 entries: Stream→Iterator, BiFunction→Callable, etc. |
| External type policy | `EXTERNAL_IGNORE_TYPES` | ✅ Shipped (v4) | Suppress warnings for Jackson/Micronaut/Jakarta types |
| Logging import fix | `build_module()` | ✅ Shipped (v4) | `from logging import Logger, getLogger` |
| Overload resolution | `_merge_overloads()` | ✅ Shipped (v4) | Collapse Java overloads into single method + Optional params |
| with* body inference | `_build_class()` | ✅ Shipped (v4) | `withFoo(x)` → `return replace(self, foo=x)` |

**Current metrics (after v4):** 1,276 files, 4,277 methods, 3,572 stubs, 151 translated (4% body completion).

### Still Needed (maps to "Deterministic patterns" depth)

| Pass | Pattern | Est. coverage |
|------|---------|---------------|
| Null checks | `if (x == null)` → `if x is None` | ~400 methods |
| Stream pipelines | `.stream().filter().map().collect()` → comprehensions | ~600 methods |
| String ops | `.equals()` → `==`, `.isEmpty()` → `not x` | ~200 methods |
| Collection ops | `.size()` → `len()`, `.get(i)` → `[i]` | ~200 methods |
| Delegation | one-line returns, method forwarding | ~800 methods |
| Simple getters | `return this.field` → `return self.field` | covered by pruning |

### AI-Assisted Pass

For the remaining ~30% of method bodies (complex business logic, algorithms, framework-specific code), the platform calls Claude API with the Java body + Python context and receives translated bodies.

---

## Technical Architecture

### Frontend

- **Page:** `web/src/pages/ConvertPage.tsx`
- **Hook:** `web/src/pages/useConvertWorkbench.tsx` (mirrors `useWorkspaceEditor` pattern)
- **Nav:** Add `{ label: 'Convert', icon: IconTransform, path: '/app/convert' }` to `TOP_LEVEL_NAV` in `nav-config.ts`
- **Workbench:** Reuse existing `Workbench` component with 4 panes:
  - `source-tree` — file tree of source files
  - `source-editor` — read-only source viewer
  - `target-editor` — editable target viewer
  - `target-tree` — output tree with completion status
- **Toolbar:** `ConvertToolbar.tsx` — config controls, convert button, depth selector, live stats
- **Scroll sync:** Wire both center editors to sync by AST node position

### Backend (platform-api)

- **Converter registry:** `services/platform-api/app/domain/converters/registry.py` — generic registry of available conversion pairs
- **Java→Python converter:** wraps `integrations/javalang/pipeline/` modules
- **Endpoints:**
  - `GET /api/v1/converters` — list available conversion pairs + their options
  - `POST /api/v1/conversion-jobs` — submit files + config, returns job with converted files + work report
  - `POST /api/v1/conversion-jobs/{id}/fill` — AI body fill for specific methods
  - `GET /api/v1/conversion-jobs/{id}` — job status + results
- **Config model:** Pydantic model matching the toolbar toggle options

### Work Report Integration

The `scaffold-work-report.json` format already generated by the pipeline becomes the API response shape. The right column renders it directly — completion bars, stub counts, unresolved types per file.

---

## Supported Conversions (Roadmap)

| Source | Target | Pipeline status |
|--------|--------|----------------|
| Java | Python | **Active** — scaffold + deterministic passes working |
| C# | Python | Planned — tree-sitter-c-sharp exists |
| Go | Python | Planned — tree-sitter-go exists |
| Python | TypeScript | Planned — reverse direction |
| SQL dialects | SQL dialects | Planned — DDL conversion (Postgres ↔ MySQL ↔ BigQuery) |

Each language pair is a separate pipeline using the same architecture: tree-sitter extraction → preprocessing → scaffold building → target emission. The framework is language-agnostic; only the extraction and emission layers change per pair.

---

## What Makes This Different

This is not "paste code, get translation." The user:

1. **Sees both sides** — source and target side by side, linked by structure
2. **Controls the depth** — scaffold first, patterns next, AI last. They choose how much to automate.
3. **Edits the output** — it's a workbench, not a black box. The target is editable.
4. **Iterates** — re-convert individual files, change config, see what improves
5. **Gets a quality report** — not just output, but a structured assessment of what's done and what's left

The conversion is a process, not a one-shot action. The platform helps the user manage that process.
