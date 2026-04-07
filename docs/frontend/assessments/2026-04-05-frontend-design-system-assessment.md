# Frontend Design System Assessment

**Date:** 2026-04-05
**Scope:** `writing-system/web` frontend codebase
**Method:** Line-by-line source file inspection of all token files, all 34 UI primitives, all shell/layout files, and icon library imports. Validated against W3C Design Tokens Format Module 2025.10 categories.
**Prior artifact:** Foundation Audit v2 (2026-04-05) at `docs/specification/frontend/foundation-audit-report/`

---

## Compliance Scorecard

Measured against the 13 token type categories defined by the W3C Design Tokens Community Group specification (2025.10 stable release).

| W3C Token Category | Status | Coverage | Detail |
|---|---|---|---|
| Color | Tokenized with drift | ~92 CSS vars, 29 TS pairs | 20/34 UI primitives bypass with 80 hardcoded hex occurrences |
| Dimension | Partial | 7 shell layout vars, 4 spacing vars | No general dimension scale; Tailwind defaults fill the gap |
| Font Family | Complete | 2 families (Inter, JetBrains Mono) | Documented in font-contract.ts with CSS var references |
| Font Weight | Complete | 4 weights (400, 500, 600, 700) | Documented in font-contract.ts |
| Duration | Absent | 0 tokens | 5 hardcoded values (90ms, 100ms, 120ms, 150ms, 180ms) in CSS |
| Cubic Bezier | Absent | 0 tokens | Only `ease` and `ease-out` used, not tokenized |
| Number | N/A | - | No applicable use case beyond other categories |
| Stroke Style | Absent | 0 tokens | No stroke style definitions found |
| Border | Partial | Color tokenized, width not | 1px default, 1.5px/2px/4px hardcoded in CSS |
| Transition | Absent | 0 tokens | Transitions hardcoded inline (120ms ease is dominant at 13/22 instances) |
| Shadow | Weak | 1 token of 9 shadows | --app-card-hover-shadow only; 8 other shadows ad-hoc |
| Gradient | N/A | 1 factory function | marketingHeroGradient() in styleTokens.ts; no gradient tokens needed |
| Typography | Complete | 2 families, 9 sizes, 4 weights, 11 recipes | font-contract.ts is the single source with Tailwind class recipes |

**Overall: 4 of 13 categories complete, 3 partial, 4 absent, 2 N/A.**

---

## Token Inventory (Verified from Source)

### CSS Custom Properties (tailwind.css — 317 lines)

| Group | Count | Light Override | Examples |
|---|---|---|---|
| Core semantic surfaces/text | 20 | 18 | --background, --foreground, --card, --primary, --muted, --accent |
| Sidebar | 8 | 8 | --sidebar, --sidebar-foreground, --sidebar-primary |
| Gray scale | 9 | 0 | --app-gray-1 through --app-gray-9 |
| Status palette | 5 | 0 | --app-blue-5, --app-yellow-6, --app-green-6, --app-red-6 |
| Shell layout | 7 | 3 (mobile) | --app-shell-header-height (60px/44px), --app-shell-navbar-width (220px) |
| Font sizes | 6 | 0 | --app-font-size-nav-label (0.75rem) through --app-font-size-brand (1.6875rem) |
| Spacing | 4 | 0 | --app-space-xs (0.5rem) through --app-space-lg (1.5rem) |
| Workbench prose | 13 | 0 | --workbench-prose-font-size through --workbench-prose-code-inline-padding |
| Decorative/accent | 7 | 0 | --app-accent-assistant-glow, --app-window-dot-* |
| Code pane | 3 | 0 | --app-code-pane-bg, --app-code-pane-border, --app-code-pane-fg |
| Grid | 5 | 5 | --app-grid-background through --app-grid-subtle-text |
| Overlays | 3 | 3 | --app-overlay-staged-bg, --app-overlay-confirmed-bg, --app-card-hover-shadow |
| JSON tree view | 18 | 8 | --json-string through --parse-json-preview-text |
| Marketing | 3 | 3 | --app-marketing-demo-row-alt, --app-marketing-demo-footer-bg |
| Flow | 5 | 5 | --flow-accent through --flow-shell-glow |
| Left rail | 4 | 4 | --app-left-rail-track-a, --app-left-rail-link-hover |
| Admin config | 11 | 11 | --admin-config-rail-bg through --admin-config-status-error-fg |
| Radius | 1 | 0 | --radius (0.625rem) |
| Font families | 3 | 0 | --app-font-sans, --app-font-prose, --app-font-mono |
| Heading weight | 1 | 0 | --heading-font-weight (700) |
| Inline code bg | 1 | 1 | --sl-color-bg-inline-code |
| **Total** | **~137** | **~68** | |

### @theme inline Tailwind Mappings (34 entries)

Maps CSS vars to Tailwind utility classes: `--color-background` → `var(--background)`, `--font-sans` → `var(--app-font-sans)`, `--radius-sm/md/lg/xl` derived from `--radius`.

### TypeScript Token Contracts

| Contract File | Exports | Token Count |
|---|---|---|
| color-contract.ts | 5 groups (SURFACE, TEXT, BORDER, BRAND, ADMIN_CONFIG) | 29 token pairs (dark/light hex + cssVar) |
| font-contract.ts | FONT_FAMILIES, FONT_SIZES, FONT_WEIGHTS, FONT_STANDARD, FONT_RECIPES | 2 families + 9 sizes + 4 weights + 11 recipes |
| icon-contract.ts | ICON_SIZES, ICON_CONTEXT_SIZE, ICON_STROKES, ICON_TONE_CLASS, ICON_STANDARD | 6 sizes + 5 contexts + 3 strokes + 7 tones |
| toolbar-contract.ts | TOOLBAR_BUTTON, TOOLBAR_BUTTON_STATES, TOOLBAR_STRIP, TOOLBAR_BUTTON_BASE | 10 button props + 2 states + 6 strip props |
| styleTokens.ts | shell, grid, accents, windowDots, adminConfig, marketing, admin | 11 shell dims + 2x5 grid colors + 6 dots + 6 admin |

---

## Hex Bypass Analysis (Verified File-by-File)

**20 of 34 UI primitive files** in `web/src/components/ui/` contain hardcoded hex values in Tailwind classes.

### Distinct Values and Token Mapping

| Hex Value | Occurrences | Used As | Nearest Token | Token Value | Delta |
|---|---|---|---|---|---|
| #3a3a3a | 31 | border | --border | #2a2a2a | +16 lightness |
| #e2503f | 15 | focus ring | --ring / --primary | #EB5E41 | Shifted hue/sat |
| #222221 | 12 | hover bg | --accent | #1a1a1a | +8 lightness |
| #f47a5c | 10 | selected text | *none* | - | No equivalent |
| #31312e | 5 | muted bg | *none* | - | Between --secondary and --border |
| #111110 | 3 | deep bg | --background | #0e0e0e | +3 lightness |
| #55221e | 4 | primary-tinted bg | *none* | - | No equivalent |

### Files Affected

**With bypasses (20):** accordion, checkbox, collapsible, combobox, dialog, file-upload, menu, number-input, pagination, popover, progress, select, segment-group, splitter, steps, switch, tabs, tags-input, tooltip, tree-view

**Clean (15):** app-icon, badge, button, field, input, native-select, provider, scroll-area, separator, sheet, sidebar, skeleton, toolbar-button, segmented-control, badge.test

---

## Category-Level Findings

### Shadows

1 tokenized, 8 ad-hoc.

| Shadow | Location | Tokenized |
|---|---|---|
| 0 8px 24px rgba(0,0,0,0.12) | tailwind.css | Yes (--app-card-hover-shadow dark) |
| 0 8px 24px rgba(28,25,23,0.08) | tailwind.css | Yes (--app-card-hover-shadow light) |
| 0 3px 10px rgba(15,23,42,0.08) | flow-canvas.css | No |
| 0 2px 8px rgba(0,0,0,0.15) | flow-canvas.css | No |
| 0 8px 24px rgba(0,0,0,0.14) | TopCommandBar.css | No |
| 0 14px 40px rgba(0,0,0,0.22) | TopCommandBar.css | No |
| inset 0 0 0 1px ... | theme.css, SchemaLayout.css | No |
| inset 0 0 0 2px ... | FlowWorkbench.css, Workbench.css | No |
| inset 0 -1px 0 var(--primary) | FlowWorkbench.css, Workbench.css | No |

### Z-Index

0 tokenized. 13 hardcoded values across 5 CSS files.

| Value | Context | Files |
|---|---|---|
| 0 | Shell guide dividers, search positioner | TopCommandBar.css |
| 1 | Marketing hero inner, shell guide children, command bar right | theme.css, TopCommandBar.css |
| 3 | Parse view menu button | SchemaLayout.css |
| 4-10 | AG Grid internal contexts | theme.css |
| 50 | Tooltips (flow workbench, workbench) | FlowWorkbench.css, Workbench.css |
| 60 | Top command bar search positioner | TopCommandBar.css |

### Animation / Transition

0 tokenized. 22 transition instances across 6 CSS files.

| Duration | Count | Dominant Context |
|---|---|---|
| 90ms | 1 | Focus ring transition |
| 100ms | 3 | Background/color hover |
| 120ms | 13 | Border/background/color (standard interactive) |
| 150ms | 2 | Background + transform |
| 180ms | 1 | Grid column resize |

2 custom @keyframes: `flow-tooltip-in` and `workbench-tooltip-in` (identical: 120ms ease-out, opacity + translateY).

### Icon Libraries

| Library | Files | Distinct Icons | Total Imports | Import Pattern |
|---|---|---|---|---|
| @tabler/icons-react | 101 | 48 | 122 | Named imports (IconPlus, IconChevronRight, etc.) |
| @hugeicons/react | 15 | 0 named | 15 | Generic HugeiconsIcon component only |
| lucide-react | 8 | 13 | 16 | Named imports (FileIcon, UploadIcon, etc.) |

Declared migration target: Hugeicons (per icon-contract.ts ICON_STANDARD.migrationStatus).

### UI Primitive Composition

| Category | Count | Examples |
|---|---|---|
| Ark UI wrappers | 22 | accordion, checkbox, combobox, dialog, menu, select, tabs, tree-view |
| Radix UI wrappers | 4 | button (Slot), separator, sheet, sidebar |
| Standalone | 8 | app-icon, badge, input, skeleton, toolbar-button, segmented-control |
| Test files | 1 | badge.test.tsx |
| **Total** | **34** | |

---

## Gaps Requiring Resolution

### Must Create (no tokens exist)

| Gap | Proposed Tokens | Rationale |
|---|---|---|
| Shadow scale | --shadow-sm, --shadow-md, --shadow-lg, --shadow-focus-ring | 9 ad-hoc shadows need consolidation |
| Z-index layers | --z-base, --z-dropdown, --z-sticky, --z-modal, --z-toast | 13 ad-hoc values need a layering contract |
| Transition duration | --duration-fast (100ms), --duration-default (120ms), --duration-slow (180ms) | 120ms is the de facto standard (13/22 instances) |
| Transition easing | --ease-default (ease), --ease-out (ease-out) | Only 2 easing types used |
| Interaction-state colors | --interactive-selected-text, --interactive-surface, --primary-tinted-bg | 3 hex values with no token equivalent |

### Must Resolve (competing values)

| Conflict | Current State | Recommended Direction |
|---|---|---|
| 20 UI files with hex bypasses | 80 occurrences, 7 distinct values | Converge 4 close values to existing tokens; create 3 new tokens for values with no equivalent |
| 3 icon libraries | Tabler 101 files, Hugeicons 15, Lucide 8 | Execute Hugeicons migration per icon-contract.ts |
| 2 data grid libraries | ag-grid (marketing), react-data-grid (app) | Standardize on react-data-grid |
| 2 empty state components | AgchainEmptyState, FlowEmptyState | Extract shared EmptyState to components/common/ |
| 5 secondary nav rails | No shared base component | Extract SecondaryRail primitive |
| 2 overlapping shell layouts | AppLayout, AgchainShellLayout | Evaluate slot-based unification |

---

## Priority Actions

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 1 | Define shadow, z-index, duration, easing tokens in tailwind.css | Quick-win | Fills 4 absent W3C categories |
| 2 | Define 3 new interaction-state color tokens + migrate 20 UI files | Moderate | Resolves 80 hex bypass occurrences |
| 3 | Write the canonical frontend design contract document | Moderate | Provides enforcement reference for all future work |
| 4 | Execute Hugeicons icon migration | Moderate | Consolidates 124 files to 1 library |
| 5 | Extract shared EmptyState component | Quick-win | Resolves component fragmentation |
| 6 | Extract SecondaryRail primitive | Architectural | Resolves 5-way nav fragmentation |
| 7 | Evaluate AppLayout/AgchainShellLayout unification | Architectural | Resolves shell duplication |

---

## Sources

- [W3C Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/drafts/format/) — token type categories used for compliance scoring
- [Design Tokens Community Group](https://www.designtokens.org/) — specification context
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming) — reference for semantic token naming conventions
- [Ark UI](https://ark-ui.com/) — headless component library used by 22 of 34 UI primitives