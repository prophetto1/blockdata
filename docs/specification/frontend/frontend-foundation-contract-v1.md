# Frontend Foundation Contract

**Version:** 1.0
**Status:** Ratified
**Date:** 2026-04-05
**Scope:** `writing-system/web` shared frontend foundation
**Primary source of truth:** `web/src/tailwind.css` for CSS custom properties; `web/src/lib/*-contract.ts` for TypeScript-accessible design contracts.

**Source inputs:**
- Foundation Audit v2 (2026-04-05) — `foundation-audit-report/`
- Design System Assessment (2026-04-05) — `2026-04-05-frontend-design-system-assessment.md`
- Draft contract (superseded by this document) — `frontend-design-contract.md`

---

## 1. Purpose

This document defines the canonical shared frontend foundation for `writing-system/web`. It:

1. Freezes the approved token, typography, layout, and primitive-level design substrate.
2. Identifies which additions are ratified and must be implemented.
3. Prevents future frontend plans from re-litigating already-audited foundation decisions.
4. Provides a single reuse-first contract for all later frontend-bearing plans.

This contract does not execute migrations. It defines the approved foundation baseline. Follow-on implementation plans must treat this contract as the reuse-first and enforcement baseline.

**Normative boundary:** This contract intentionally excludes file counts, component counts, occurrence totals, and other audit snapshot metrics. Those belong in audit artifacts, not in the contract, because they are operational measurements that can change immediately as the repo evolves.

---

## 2. Source Hierarchy

When artifacts disagree, use this order:

1. **Repo code** — authoritative for all items marked Canonical
2. **This ratified contract** — approval authority for Ratified Additions until code conforms
3. **Foundation audit artifacts** — supporting evidence
4. **Assessment and analysis documents** — supporting evidence
5. **Older design notes and plan-local frontend descriptions** — informational only

---

## 3. Status Vocabulary

This contract uses four status labels:

| Status | Meaning |
|---|---|
| **Canonical** | Present in code and approved as standard. Repo code is the source of truth. |
| **Ratified Addition** | Approved for foundation adoption. May require implementation work to bring code into conformance. |
| **Deferred** | Recognized gap, intentionally excluded from v1.0. Must not be solved through ad hoc implementation. |
| **Forbidden** | Patterns that new shared frontend code must not introduce. |

---

## 4. Color Contract

### 4.1 Core Semantic Tokens — Canonical

Source: `web/src/tailwind.css` `:root` (dark) and `:root[data-theme='light']` (light).

| Token | Dark | Light | Role |
|---|---|---|---|
| --background | #0e0e0e | #faf9f7 | Page background |
| --foreground | #eeeeee | #1c1917 | Primary text |
| --card | #141414 | #ffffff | Card / elevated surface |
| --card-foreground | #eeeeee | #1c1917 | Text on card |
| --popover | #141414 | #ffffff | Dropdown / popover surface |
| --popover-foreground | #eeeeee | #1c1917 | Text on popover |
| --primary | #EB5E41 | #EB5E41 | Brand primary (same both modes) |
| --primary-foreground | #ffffff | #ffffff | Text on primary |
| --secondary | #1a1a1a | #f0eeed | Secondary surface (pills, tags) |
| --secondary-foreground | #eeeeee | #292524 | Text on secondary |
| --muted | #1a1a1a | #e8e6e3 | Muted / disabled surface |
| --muted-foreground | #a0a0a0 | #44403c | Secondary / helper text |
| --accent | #1a1a1a | #f5ebe6 | Accent surface (warm tint) |
| --accent-foreground | #eeeeee | #1c1917 | Text on accent |
| --destructive | #dc2626 | #dc2626 | Error / destructive (same both modes) |
| --destructive-foreground | #ffffff | #ffffff | Text on destructive |
| --border | #2a2a2a | #d6d3d1 | Default border |
| --input | #2a2a2a | #d6d3d1 | Form input border |
| --ring | #EB5E41 | #EB5E41 | Focus ring (same both modes) |
| --chrome | #0e0e0e | #ffffff | Header + sidebar surface |

### 4.2 Sidebar Tokens — Canonical

| Token | Dark | Light |
|---|---|---|
| --sidebar | #0e0e0e | #ffffff |
| --sidebar-foreground | #eeeeee | #1c1917 |
| --sidebar-primary | #EB5E41 | #EB5E41 |
| --sidebar-primary-foreground | #ffffff | #ffffff |
| --sidebar-accent | #1a1a1a | #f5f3f1 |
| --sidebar-accent-foreground | #eeeeee | #1c1917 |
| --sidebar-border | #2a2a2a | #e8e5e3 |
| --sidebar-ring | #eeeeee | #1c1917 |

### 4.3 Gray Scale — Canonical

| Token | Value |
|---|---|
| --app-gray-1 | #f4f4f5 |
| --app-gray-2 | #e4e4e7 |
| --app-gray-3 | #d4d4d8 |
| --app-gray-4 | #a1a1aa |
| --app-gray-5 | #71717a |
| --app-gray-6 | #52525b |
| --app-gray-7 | #3f3f46 |
| --app-gray-8 | #27272a |
| --app-gray-9 | #09090b |

### 4.4 Status Palette — Canonical

| Token | Value |
|---|---|
| --app-blue-5 | #339af0 |
| --app-blue-6 | #228be6 |
| --app-yellow-6 | #fab005 |
| --app-green-6 | #40c057 |
| --app-red-6 | #fa5252 |

### 4.5 Admin Config Colors — Canonical

| Token | Dark | Light | Role |
|---|---|---|---|
| --admin-config-rail-bg | #101113 | #ffffff | Second rail bg |
| --admin-config-rail-border | #2a2a2a | #e8e5e3 | Second rail divider |
| --admin-config-frame-bg | #141414 | #ffffff | Frame/card surface |
| --admin-config-header-bg | #181818 | #f5f3f1 | Section header surface |
| --admin-config-content-bg | #0f0f10 | #faf9f7 | Content area bg |
| --admin-config-status-success-bg | rgba(34,197,94,0.16) | rgba(22,163,74,0.12) | Success banner bg |
| --admin-config-status-success-border | rgba(34,197,94,0.40) | rgba(22,163,74,0.38) | Success banner border |
| --admin-config-status-success-fg | #86efac | #166534 | Success banner text |
| --admin-config-status-error-bg | rgba(220,38,38,0.18) | rgba(220,38,38,0.10) | Error banner bg |
| --admin-config-status-error-border | rgba(248,113,113,0.42) | rgba(220,38,38,0.32) | Error banner border |
| --admin-config-status-error-fg | #fca5a5 | #b91c1c | Error banner text |

### 4.6 Interaction State Tokens — Ratified Addition

These tokens do not yet exist in code. They are ratified as canonical additions because the current shared frontend foundation does not provide semantic equivalents for selected interactive text, intermediate interactive surfaces, and primary-tinted active surfaces.

| Token | Dark | Light | Canonical replacement target | Role |
|---|---|---|---|---|
| --interactive-selected-text | #f47a5c | #c4402a | Existing selected/checked interactive text literals | Checked/selected text in interactive components |
| --interactive-surface | #31312e | #e7e4e2 | Existing intermediate interactive surface literals | Interactive bg between secondary and border |
| --primary-tinted-bg | #55221e | #fce8e2 | Existing primary-tinted active surface literals | Primary-tinted surface for active tab/step states |

The light-mode values are approved as part of v1.0 and are no longer provisional. Their role is to preserve semantic parity across dark and light interactive states.

**Ownership:** Declare these CSS custom properties in `web/src/tailwind.css`. Expose them through the appropriate TypeScript contract layer when consumed outside CSS.

### 4.7 Hex Convergence Dispositions — Ratified Addition

The following hardcoded values are ratified for convergence to existing canonical tokens. They must not remain as parallel palette literals in shared frontend code.

| Hex Value | Disposition | Converge To | Token Value |
|---|---|---|---|
| #3a3a3a | Must converge | --border | #2a2a2a |
| #e2503f | Must converge | --ring | #EB5E41 |
| #222221 | Must converge | --accent | #1a1a1a |
| #111110 | Must converge | --background | #0e0e0e |

These convergence targets are normative. Shared frontend code must not preserve these values as separate semantic colors.

**Ownership:** Convergence must occur at the shared token layer and in shared component usage. Shared frontend code must not preserve these literals once migrated.

### 4.8 Domain-Scoped Extension Registries — Canonical

These groups are canonical but domain-scoped. They are not general shared-foundation tokens unless explicitly promoted by later contract amendment.

| Group | Owner Layer | Scope | Reusable Outside Domain |
|---|---|---|---|
| Grid colors | `web/src/lib/styleTokens.ts` | Data grids | No |
| JSON tree view | JsonTreeView token layer | JSON tree rendering | No |
| Flow surface | Flow/workbench token layer | Flows workbench | No |
| Left rail accents | Shell/navigation token layer | Primary navigation rail | No |
| Marketing | Marketing/public token layer | Marketing/public pages | No |
| Code pane | Code viewer token layer | Code viewer surfaces | No |
| Workbench prose | Document/workbench token layer | MDX editor / prose workspace | No |

---

## 5. Typography Contract — Canonical

Source: `web/src/lib/font-contract.ts`.

### 5.1 Font Families

| Token | CSS Var | Primary | Use |
|---|---|---|---|
| sans | --app-font-sans | Inter | All UI text |
| mono | --app-font-mono | JetBrains Mono | Code, data cells, technical values |

### 5.2 Size Scale

| Token | Rem | Px | Use |
|---|---|---|---|
| 2xs | 0.625rem | 10 | Grid cells, dense badges |
| xs | 0.75rem | 12 | Captions, labels, helper text |
| sm | 0.875rem | 14 | Body small, secondary text |
| base | 1rem | 16 | Body, nav items |
| lg | 1.125rem | 18 | Subheadings, nav strong |
| xl | 1.25rem | 20 | Section headings |
| 2xl | 1.5rem | 24 | Page titles |
| 3xl | 1.875rem | 30 | Marketing headings |
| 4xl | 2.25rem | 36 | Hero headings |

### 5.3 Weight Scale

| Token | Value | Use |
|---|---|---|
| normal | 400 | Body text |
| medium | 500 | Labels, nav items |
| semibold | 600 | Subheadings, card titles |
| bold | 700 | Page headings |

### 5.4 Usage Recipes

| Context | Tailwind Classes | Family |
|---|---|---|
| Page title | text-2xl font-bold | sans |
| Section heading | text-xl font-semibold | sans |
| Card title | text-sm font-semibold | sans |
| Body text | text-sm font-normal | sans |
| Nav item | text-sm font-medium | sans |
| Label / caption | text-xs font-medium text-muted-foreground | sans |
| Section label (uppercase) | text-xs font-semibold uppercase tracking-wide text-muted-foreground | sans |
| Badge / pill | text-xs font-medium | sans |
| Data cell | text-xs | mono |
| Code / JSON key | text-xs | mono |
| Dense grid cell | text-2xs | mono |

---

## 6. Spacing Contract — Canonical

### 6.1 CSS Custom Properties

| Token | Value | Px |
|---|---|---|
| --app-space-xs | 0.5rem | 8 |
| --app-space-sm | 0.75rem | 12 |
| --app-space-md | 1rem | 16 |
| --app-space-lg | 1.5rem | 24 |

### 6.2 Convention

Tailwind's default spacing scale is the primary general spacing system. The custom CSS vars are used in shell layout and component composition. Custom spacing vars are reserved for shell/layout/composition-level usage.

---

## 7. Radius Contract — Canonical

Source: `web/src/tailwind.css` + `@theme inline`.

| Token | Derivation | Value |
|---|---|---|
| --radius | Base | 0.625rem (10px) |
| --radius-sm | --radius - 4px | 0.375rem (6px) |
| --radius-md | --radius - 2px | 0.5rem (8px) |
| --radius-lg | --radius | 0.625rem (10px) |
| --radius-xl | --radius + 4px | 0.875rem (14px) |

---

## 8. Shadow Contract — Ratified Addition

The existing shared foundation does not currently provide a complete shadow scale. The following scale is ratified for shared adoption across shared primitives and shell-bearing surfaces.

**Ownership:** These tokens must be declared in `web/src/tailwind.css`. If runtime access is needed outside CSS, they must also be surfaced through the appropriate TypeScript token layer.

| Token | Dark | Light | Replaces |
|---|---|---|---|
| --shadow-sm | 0 2px 8px rgba(0,0,0,0.15) | 0 2px 8px rgba(28,25,23,0.08) | flow-canvas controls, minimap shadows |
| --shadow-md | 0 3px 10px rgba(15,23,42,0.08) | 0 3px 10px rgba(28,25,23,0.06) | flow node card shadows |
| --shadow-lg | 0 8px 24px rgba(0,0,0,0.12) | 0 8px 24px rgba(28,25,23,0.08) | Existing --app-card-hover-shadow |
| --shadow-xl | 0 14px 40px rgba(0,0,0,0.22) | 0 14px 40px rgba(28,25,23,0.12) | Workspace selector dropdown |
| --shadow-focus-ring | inset 0 0 0 2px color-mix(in oklab, var(--ring) 50%, transparent) | inset 0 0 0 2px color-mix(in oklab, var(--ring) 50%, transparent) | Drag-over pane highlight, focus states |

---

## 9. Z-Index Contract — Ratified Addition

No canonical z-index token layer currently exists. The following stacking contract is ratified for shared adoption.

**Ownership:** These tokens must be declared in `web/src/tailwind.css` and treated as the only shared layering scale for shared primitives and shell-bearing surfaces.

| Token | Value | Use |
|---|---|---|
| --z-base | 0 | Default stacking context |
| --z-raised | 1 | Slightly elevated elements |
| --z-dropdown | 10 | Dropdowns, popovers, menus |
| --z-sticky | 30 | Sticky headers, fixed sidebars |
| --z-tooltip | 50 | Tooltips |
| --z-modal | 60 | Modals, command bar overlays |
| --z-toast | 70 | Toast notifications (above modals) |

---

## 10. Animation Contract — Ratified Addition

No canonical motion token layer currently exists. The following duration and easing contract is ratified for shared adoption.

**Ownership:** These tokens must be declared in `web/src/tailwind.css`. Shared primitives and shell-bearing surfaces must not introduce parallel motion timings when these tokens apply.

### 10.1 Duration Scale

| Token | Value | Use |
|---|---|---|
| --duration-fast | 100ms | Hover color changes, checkbox toggles |
| --duration-default | 120ms | Standard interactive transitions |
| --duration-slow | 180ms | Layout shifts, column resizes |

### 10.2 Easing

| Token | Value | Use |
|---|---|---|
| --ease-default | ease | All standard transitions |
| --ease-out | ease-out | Exit animations, tooltips |

---

## 11. Border Contract — Canonical (color) / Convention (width)

### 11.1 Border Color — Canonical

| Token | Dark | Light |
|---|---|---|
| --border | #2a2a2a | #d6d3d1 |
| --input | #2a2a2a | #d6d3d1 |
| --sidebar-border | #2a2a2a | #e8e5e3 |

### 11.2 Border Width — Convention

No border-width token layer is ratified in v1.0. The shared primitive default remains 1px. Non-1px border widths are deferred exceptions and must not become new shared conventions without contract amendment.

---

## 12. Icon Contract — Canonical (tokens) / Ratified Addition (library direction)

Source: `web/src/lib/icon-contract.ts`.

### 12.1 Size Scale — Canonical

| Token | Px |
|---|---|
| xs | 14 |
| sm | 16 |
| md | 20 |
| lg | 24 |
| xl | 28 |
| xxl | 32 |

### 12.2 Semantic Contexts — Canonical

| Context | Size Token |
|---|---|
| inline | sm (16px) |
| content | md (20px) |
| utility | md (20px) |
| nav | lg (24px) |
| hero | xl (28px) |

### 12.3 Stroke Weights — Canonical

| Token | Value |
|---|---|
| light | 1.6 |
| regular | 1.8 |
| strong | 2.1 |

### 12.4 Tone Classes — Canonical

| Tone | Tailwind Class |
|---|---|
| current | (inherits) |
| default | text-foreground |
| muted | text-muted-foreground |
| accent | text-primary |
| success | text-emerald-600 dark:text-emerald-400 |
| warning | text-amber-600 dark:text-amber-400 |
| danger | text-red-600 dark:text-red-400 |

### 12.5 Library Direction — Ratified Addition

The shared icon abstraction boundary is AppIcon. Once AppIcon is implemented, shared frontend code must not import icon libraries directly outside that abstraction.

Library migration execution is deferred. The full migration from existing icon libraries to Hugeicons must occur through a separate implementation plan.

---

## 13. Toolbar Contract — Canonical

Source: `web/src/lib/toolbar-contract.ts`.

### 13.1 Button Anatomy

| Property | Value |
|---|---|
| Height | h-7 |
| Padding | px-2 |
| Gap | gap-1.5 |
| Font size | text-xs |
| Font weight | font-medium |
| Line height | leading-4 |
| Radius | rounded-md |
| Border | border |
| Transition | transition-colors |
| Press feedback | active:scale-[0.97] |

### 13.2 States

| State | Classes |
|---|---|
| Active | border-border bg-background text-foreground |
| Inactive | border-transparent text-muted-foreground hover:bg-accent hover:text-foreground |

---

## 14. Shell Layout Contract — Canonical

Source: `web/src/tailwind.css`, `web/src/lib/styleTokens.ts`.

### 14.1 Dimensions

| Token | Desktop | Mobile |
|---|---|---|
| --app-shell-header-height | 60px | 44px |
| --app-shell-navbar-width | 220px | 200px |
| --app-shell-navbar-compact-width | 60px | — |
| --app-shell-content-max-width | 1460px | — |
| --app-shell-page-gap | 1rem | 0.75rem |
| --app-shell-page-bottom-padding | 1.5rem | 1rem |

### 14.2 Shell Region Ownership

| Region | Owner | Status |
|---|---|---|
| Top header | TopCommandBar.tsx + HeaderCenterContext.tsx | Canonical |
| Left rail (primary) | LeftRailShadcn.tsx + nav-config.ts | Canonical |
| Right rail | RightRailShell.tsx + RightRailContext.tsx | Canonical |
| Public shells | MarketingLayout, PublicFullBleedLayout, PublicLayout | Canonical |
| Left rail (secondary) | Competing owner set; unresolved | Deferred |
| Content area framing | Competing owner set; unresolved | Deferred |

---

## 15. Token Ownership — Canonical

| Layer | Owner | Role |
|---|---|---|
| CSS custom properties | `web/src/tailwind.css` | Primary source of truth for visual tokens |
| Color contract (TS) | `web/src/lib/color-contract.ts` | TypeScript accessor for shared color tokens |
| Font contract (TS) | `web/src/lib/font-contract.ts` | Typography definitions and usage recipes |
| Icon contract (TS) | `web/src/lib/icon-contract.ts` | Icon sizes, contexts, strokes, tones |
| Toolbar contract (TS) | `web/src/lib/toolbar-contract.ts` | Toolbar button anatomy and states |
| Runtime tokens (TS) | `web/src/lib/styleTokens.ts` | Runtime access to shell and domain-scoped tokens |
| Tailwind bridge | `@theme inline` block in tailwind.css | Maps CSS variables into Tailwind utility tokens |

---

## 16. State Presentation Registry

| State | Component | Universal | Status | Notes |
|---|---|---|---|---|
| Success | Sonner toast via UIProvider | Yes | Canonical | — |
| Permission | AuthGuard + SuperuserGuard | Yes | Canonical | — |
| Loading | Skeleton (components/ui/) | No | Canonical | Usage is not yet universally enforced |
| Error | ErrorAlert (components/common/) | No | Canonical | Usage is not yet universally enforced |
| Empty | Multiple competing implementations | No | Deferred | Requires separate consolidation plan |
| Async | No canonical implementation | No | Deferred | Requires separate design and implementation plan |

---

## 17. Light / Dark Mode Contract — Canonical

| Property | Value |
|---|---|
| Default mode | Dark (color-scheme: dark in :root) |
| Switching mechanism | data-theme attribute on :root |
| Light mode selector | :root[data-theme='light'] |
| Persistence | localStorage, hydrated in main.tsx before React mount |
| Hook | useTheme() from web/src/hooks/useTheme.ts |
| Semantic parity requirement | Light mode must preserve semantic token parity for all canonical shared foundation domains |

---

## 18. Deferred Domains

The following are explicitly excluded from v1.0. They must not be solved through ad hoc implementation inside unrelated plans. Each requires its own architectural plan.

| Domain | Why Deferred |
|---|---|
| Authenticated shell convergence (AppLayout vs AgchainShellLayout) | Architectural — requires ownership decision |
| Secondary rail ownership convergence | Architectural — tied to shell overlap |
| Page-frame unification across AGChain and non-AGChain shells | Architectural — dependent on shell decision |
| Empty state component consolidation | Component — requires visual direction decision |
| Icon library migration execution | Moderate — requires AppIcon abstraction first |
| Grid library standardization | Low leverage — separate plan if needed |
| Broad page-pattern unification | Architectural — downstream of shell decisions |

---

## 19. Forbidden Patterns

New shared frontend code must not introduce:

1. **Raw hardcoded hex values** in shared UI primitives when a canonical or ratified token exists.
2. **Ad hoc transition durations or easing values** in shared primitives when a motion token exists.
3. **Ad hoc shadow values** in shared primitives when a shadow token exists.
4. **Ad hoc z-index values** in shared primitives when a z-index layer token exists.
5. **Direct icon library imports** outside the AppIcon abstraction (once AppIcon is implemented).
6. **Parallel palette values** that approximate but do not reference canonical tokens.
7. **Plan-local reinterpretations** of already-ratified foundation domains.
8. **Silent resolution** of deferred domains inside unrelated feature plans.

---

## 20. Enforcement Rules

All future frontend-bearing plans that touch shared frontend substrate must:

1. Cite this contract.
2. Identify which canonical foundation areas they rely on.
3. State which deferred areas they intentionally avoid.
4. Avoid worsening known conflict bundles from the audit.
5. Treat violations of this contract as blockers unless the contract itself is amended first.

### Compliance checks

| Rule | Scope |
|---|---|
| No new raw hex in shared UI primitives when canonical or ratified tokens apply | Shared primitive and shell-bearing component directories |
| No new hardcoded motion timings when motion tokens apply | Shared primitive and shell-bearing component directories |
| No new ad hoc shadows when shadow tokens apply | Shared primitive and shell-bearing component directories |
| No new ad hoc z-index values when z-index tokens apply | Shared primitive and shell-bearing component directories |
| Shared primitives must consume canonical token layers | All shared component directories |
| Foundation-affecting plans must reference audit + contract | Plan review gate |
| New shared tokens require contract amendment before adoption | Token ownership layer |
| Deferred domains may not be solved inside unrelated feature plans | All plans |

Current file-level compliance inventories and drift measurements are maintained in the audit artifacts and are intentionally excluded from this contract.

---

## 21. Amendment Policy

If implementation reveals that a ratified addition is wrong or incomplete:

1. Amend this contract first.
2. Then implement against the amended contract.
3. Do not allow silent divergence between contract and code.

The contract version number increments with each amendment. The amendment must document what changed and why.

---

The following appendices are informative and non-normative unless explicitly referenced by a contract section.

---

## Appendix A: Tailwind @theme Inline Mappings

| Tailwind Token | CSS Var |
|---|---|
| --font-sans | var(--app-font-sans) |
| --font-mono | var(--app-font-mono) |
| --color-background | var(--background) |
| --color-foreground | var(--foreground) |
| --color-card | var(--card) |
| --color-card-foreground | var(--card-foreground) |
| --color-popover | var(--popover) |
| --color-popover-foreground | var(--popover-foreground) |
| --color-primary | var(--primary) |
| --color-primary-foreground | var(--primary-foreground) |
| --color-secondary | var(--secondary) |
| --color-secondary-foreground | var(--secondary-foreground) |
| --color-muted | var(--muted) |
| --color-muted-foreground | var(--muted-foreground) |
| --color-accent | var(--accent) |
| --color-accent-foreground | var(--accent-foreground) |
| --color-destructive | var(--destructive) |
| --color-destructive-foreground | var(--destructive-foreground) |
| --color-border | var(--border) |
| --color-input | var(--input) |
| --color-ring | var(--ring) |
| --color-sidebar | var(--sidebar) |
| --color-sidebar-foreground | var(--sidebar-foreground) |
| --color-sidebar-primary | var(--sidebar-primary) |
| --color-sidebar-primary-foreground | var(--sidebar-primary-foreground) |
| --color-sidebar-accent | var(--sidebar-accent) |
| --color-sidebar-accent-foreground | var(--sidebar-accent-foreground) |
| --color-sidebar-border | var(--sidebar-border) |
| --color-sidebar-ring | var(--sidebar-ring) |
| --radius-sm | calc(var(--radius) - 4px) |
| --radius-md | calc(var(--radius) - 2px) |
| --radius-lg | var(--radius) |
| --radius-xl | calc(var(--radius) + 4px) |