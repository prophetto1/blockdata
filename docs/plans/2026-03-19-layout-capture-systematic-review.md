# Layout Capture System — Systematic Review & Fix Plan

## Context

The layout capture tool (`measure-layout.mjs` + `capture-server.mjs` + `DesignLayoutCaptures.tsx`) is meant to gather deterministic design intelligence from target pages. The "phonology" — typography extraction — is shallow: it measures container-level inherited styles but not the actual typographic variety on the page. Beyond that, several correctness bugs and UX gaps exist across the pipeline.

This plan addresses 12 issues in three priority tiers.

---

## Tier 1: Typography (the core "phonology" gap)

The system captures `fontFamily/fontSize/lineHeight/fontWeight/letterSpacing` via `styleSnapshot()` on structural containers (appFrame, toolbar, rails). But containers inherit from ancestors — every element reports the same font stack. There is no walk of text-bearing elements (headings, paragraphs, code blocks) to build a **typographic scale**.

### 1A. New `typographyScale()` function inside `collectReport()`

**File:** [measure-layout.mjs](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs)

Walk visible text-bearing elements (`h1-h6, p, blockquote, pre, code, figcaption, label, legend, dt, dd, li, th, td, span`), extract computed style, deduplicate by `fontSize+fontWeight+fontFamily+lineHeight+letterSpacing+fontStyle+textTransform`, and produce:

```json
{
  "typography": {
    "scale": [
      {
        "fontSize": "48px",
        "fontWeight": "700",
        "fontFamily": "Geist, Inter, ...",
        "lineHeight": "56px",
        "letterSpacing": "-0.02em",
        "fontStyle": "normal",
        "textTransform": "none",
        "color": "rgb(0, 0, 0)",
        "sampleText": "Business Intelligence as Code",
        "sampleTag": "h1",
        "occurrences": 3,
        "tags": ["h1"]
      }
    ],
    "fontFamilies": ["Geist", "Geist Mono"],
    "fontSizeRange": { "min": "12px", "max": "48px", "distinct": 7 }
  }
}
```

### 1B. Expand `componentInventory()` selectors

Add `h1-h6, p, pre, code, blockquote, figcaption` to the selector list at line 566. Add matching `componentKind()` entries (`heading`, `paragraph`, `code`, etc.).

### 1C. Deepen `themeTokens()`

Sample additional elements beyond the 6 structural ones: first visible `<a>` (link color), first `<input>` (field styling), elements with distinct `backgroundColor` from parent (surface elevation). Add `outlineColor` and `textDecorationColor` properties.

---

## Tier 2: Correctness Bugs

### 2A. `theme="both"` falls through to `["system"]` on CLI

**File:** [measure-layout.mjs:803-814](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs#L803-L814)

`determineThemes()` doesn't recognize `"both"` as a theme value. Fix: add `if (requestedTheme === "both") return ["light", "dark"];` before the existing conditional. The server already works around this via `captureBothThemes`, so this only affects direct CLI usage.

### 2B. `pickShellRow` picks wrong sibling

**File:** [measure-layout.mjs:424-433](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs#L424-L433)

`.find(child => child !== topToolbar)` finds the first non-toolbar child, which could be *before* the toolbar. Fix: use `indexOf(topToolbar) + 1` to get the next sibling.

### 2C. `pickSplitChildren` blind positional indexing

**File:** [measure-layout.mjs:435-468](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs#L435-L468)

Assigns left/main/right by child index (0, 1, 2). A decoration div or spacer at index 0 becomes "leftRail." Fix: identify the widest child as mainCanvas, then assign left/right from siblings before/after it, ignoring elements narrower than 40px.

### 2D. `selectorPath` produces non-unique selectors

**File:** [measure-layout.mjs:281-305](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs#L281-L305)

Multiple siblings with the same tag+class get identical selectors (visible in evidence.dev report — "Product" and "Resources" buttons share the same selector). Fix: add `:nth-child()` disambiguation when siblings share the same tag+class combo.

---

## Tier 3: Infrastructure & UX Polish

### 3A. Backslashes in `outputDir` (captures.json)

**File:** [capture-server.mjs:151](scripts/capture-server.mjs#L151)

`path.relative()` produces backslashes on Windows. Add `.replace(/\\/g, '/')` after the relative path calculation.

### 3B. Duplicated `resolvePlaywright()`

**Files:** `measure-layout.mjs:114-134` and `capture-server.mjs:67-77` each have their own copy with different candidate lists. Could extract to shared utility but low priority — not worth the coupling if the scripts need to remain standalone.

### 3C. Blocking `POST /auth-complete` and no UI polling

**Files:** `capture-server.mjs:254-283` and `DesignLayoutCaptures.tsx`

Both `/capture` and `/auth-complete` block until capture finishes (5-30s). The UI has no intermediate polling. Fix: decouple auth-complete response from capture execution; add `useEffect`-based polling of `GET /status/:id` while in `capturing` state.

### 3D. Top-level `report.json` for "both" captures

By design, the top-level report for dual-theme captures is a wrapper with pass references. Per-pass reports have full data. No code fix needed — just add a comment in `runCapture()` for clarity.

---

## Scope Decision

**This pass: measurement engine only** (Tiers 1 + 2 + backslash fix). All changes in [measure-layout.mjs](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs) plus 1-line fix in [capture-server.mjs](scripts/capture-server.mjs). Server async and UI polling deferred.

## Implementation Sequence

| Step | Issue | Scope | Risk |
|------|-------|-------|------|
| 1 | 2A: theme="both" CLI | 1 line in `determineThemes()` | None |
| 2 | 2B: pickShellRow | 5 lines — use indexOf + 1 | Low |
| 3 | 2D: selectorPath | 8 lines — add nth-child disambiguation | Low |
| 4 | 3A: backslash fix | 1 line in capture-server.mjs | None |
| 5 | 2C: pickSplitChildren | ~20 lines — widest-child = mainCanvas | Medium |
| 6 | **1A: typographyScale()** | ~60 lines new function | Medium — core deliverable |
| 7 | 1B: componentInventory expansion | ~10 lines — add heading/paragraph selectors | Low |
| 8 | 1C: themeTokens expansion | ~20 lines — sample links, inputs, surfaces | Low |

## Verification

After implementation:
1. Run check scripts: `node docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.check.mjs` and `node docs/skills/design-1-layouts-spec-with-playwright/scripts/run-layout-capture.check.mjs`
2. Run `node docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs --url https://www.evidence.dev --width 1920 --height 1080 --theme both` — should produce light/ and dark/ subdirectories
3. Inspect `report.json` → `typography.scale` should show multiple distinct font treatments (not just 16px/14px)
4. Verify `selectorPath` produces unique selectors for sibling buttons in the report

## Deferred (separate session)

- 3B: Duplicated `resolvePlaywright()` — low-value refactor
- 3C: Async `POST /auth-complete` + UI polling — server + React changes
- 3D: Documentation comment on dual-theme report structure

## Critical Files

- [measure-layout.mjs](docs/skills/design-1-layouts-spec-with-playwright/scripts/measure-layout.mjs) — all Tier 1 + Tier 2 changes
- [capture-server.mjs](scripts/capture-server.mjs) — Issue 3A only (backslash fix)