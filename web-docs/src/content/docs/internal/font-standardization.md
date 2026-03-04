---
title: Font Standardization Brief
description: Design brief for standardizing typography contracts across the platform.
---

## Current State

| Aspect | Status | Detail |
|--------|--------|--------|
| **Font contract** | Exists, unused | `web/src/lib/font-contract.ts` — exports `FONT_SIZES`, `FONT_WEIGHTS`, `FONT_RECIPES` but no component imports them |
| **CSS variables** | Partial | `tailwind.css` defines `--app-font-sans`, `--app-font-mono`, and nav-specific sizes |
| **Design system docs** | Drifted | `docs/design-system.md` says IBM Plex Sans; `font-contract.ts` says Inter |
| **Component usage** | Ad-hoc | Raw Tailwind classes everywhere; custom bracket sizes (`text-[11px]`, `text-[13px]`, `text-[15px]`) scattered across shell and grid |
| **Recipes** | Defined, not consumed | 11 font recipes exist in contract but components compose their own class strings |

### Files involved

- `web/src/lib/font-contract.ts` — TypeScript token definitions
- `web/src/tailwind.css` — CSS custom properties + `@theme inline` bridge
- `web/src/theme.css` — Grid font overrides (`.grid-font-small`, etc.)
- `docs/design-system.md` — Typography specification

---

## Questions to Answer

Fill in your answers below each question. These drive the design.

### 1. What is the primary font problem?

_Pick one or more:_
- [ ] Inconsistent sizes — components use arbitrary `text-[11px]`, `text-[13px]`, `text-[15px]` instead of the defined scale
- [ ] Recipes not enforced — `FONT_RECIPES` exist but nobody uses them
- [ ] Docs vs reality drift — design-system.md and font-contract.ts disagree on the font family
- [ ] All of the above — full standardization pass

**Your answer:**


### 2. Which font family is the real one?

The design system doc says **IBM Plex Sans** but `font-contract.ts` and `tailwind.css` both say **Inter**.

- [ ] Inter (keep what the code actually uses)
- [ ] IBM Plex Sans (keep what the design doc says)
- [ ] Something else

**Your answer:**


### 3. Should the font contract be enforced at runtime?

Right now, `font-contract.ts` is documentation-only (consumed by the Design Standards preview page). Components use raw Tailwind classes. Two approaches:

**A. Keep raw Tailwind (current)** — The contract stays as documentation. Developers just use `text-sm font-semibold` directly. Violations caught in code review.

**B. Enforce via recipes** — Components import `FONT_RECIPES` or a helper and use pre-composed class strings like `FONT_RECIPES.cardTitle`. No raw `text-*` classes on headings/body.

**C. Hybrid** — Recipes exist for common patterns (page title, card title, label, badge). Raw Tailwind still allowed for one-offs. Linting rule warns on bracket notation (`text-[Npx]`).

**Your answer:**


### 4. What about the custom bracket sizes?

These exist in the codebase today:
- `text-[11px]` — sidebar secondary text
- `text-[13px]` — grid tab text
- `text-[15px]` — sidebar nav items (non-compact)

Options:
- [ ] Ban them — map each to the nearest scale size (`text-xs`, `text-sm`, etc.)
- [ ] Keep them — some UI contexts need pixel-perfect sizing outside the scale
- [ ] Add them to the scale — create `2xs` (10px), `nav` (15px) etc. as named tokens

**Your answer:**


### 5. Line-height strategy

Currently line-height is set inline per component (`leading-snug`, `leading-relaxed`, `leading-4`, `leading-5`, `leading-none`). Should line-height be:

- [ ] Part of the recipe — each recipe includes its line-height
- [ ] Separate concern — keep line-height as a per-component decision
- [ ] Mapped to size — each font size token has a default line-height

**Your answer:**


### 6. Data grid typography — special case?

The data grid has its own font system (`--viewer-font-size`, `.grid-font-small/medium/large`, mono multiplier). Should it:

- [ ] Stay separate — grid fonts are a different concern with user-selectable sizing
- [ ] Merge into the contract — grid sizes become named tokens in `font-contract.ts`
- [ ] Partial merge — grid uses the same scale but keeps its own switching logic

**Your answer:**


### 7. What's the scope of this work?

- [ ] **Contract only** — Align docs, fix font-contract.ts, update tailwind.css. Don't touch components.
- [ ] **Contract + key components** — Fix the contract, then migrate shell (nav, header, sidebar) and settings to use it.
- [ ] **Full migration** — Fix contract, migrate every component, ban raw bracket sizes, add lint rule.

**Your answer:**


---

## Design Decisions (filled in after answers)

_This section will be completed after the questions above are answered._

### Chosen font family
### Enforcement strategy
### Custom size handling
### Line-height approach
### Grid typography approach
### Migration scope
