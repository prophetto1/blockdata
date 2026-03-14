# Docling MD Preview — Source-Aligned Rendering

## Context

The Parse workbench's Docling MD tab renders markdown with basic styling (small headings, tight spacing, inherited Inter font). This plan upgrades it to match the web-docs Starlight rendering by porting the exact prose token system.

**Scope boundary:** The current `.parse-markdown-preview` class is shared between:
- Parse Docling MD tab — `useParseWorkbench.tsx:274`
- Generic markdown preview — `PreviewTabPanel.tsx:385` (used by Assets, ELT workbenches)

These are different surfaces. This plan changes **only** the Parse Docling MD tab. The generic markdown preview is untouched.

## Source of Truth

All values are derived from the web-docs token system. No ad hoc values.

| Token | Value | Source file | Line |
|-------|-------|-------------|------|
| `--workbench-prose-font-size` | `1rem` | `web-docs/src/styles/workbench-shell.css` | 5 |
| `--workbench-prose-line-height` | `1.6` | `web-docs/src/styles/workbench-shell.css` | 6 |
| `--workbench-prose-block-gap` | `0.8rem` | `workbench-shell.css` | 7 |
| `--workbench-prose-heading-letter-spacing` | `-0.02em` | `workbench-shell.css` | 8 |
| `--workbench-prose-h1-size` | `clamp(1.8rem, 2.6vw, 2.35rem)` | `workbench-shell.css` | 9 |
| `--workbench-prose-h2-size` | `clamp(1.3rem, 2vw, 1.6rem)` | `workbench-shell.css` | 10 |
| `--workbench-prose-h3-size` | `clamp(1.1rem, 1.6vw, 1.25rem)` | `workbench-shell.css` | 11 |
| `--workbench-prose-h4-size` | `1.05rem` | `workbench-shell.css` | 12 |
| `--workbench-prose-h2-top` | `1.55rem` | `workbench-shell.css` | 13 |
| `--workbench-prose-h3-top` | `1.2rem` | `workbench-shell.css` | 14 |
| `--workbench-prose-h4-top` | `1rem` | `workbench-shell.css` | 15 |
| `--workbench-prose-heading-bottom` | `0.5rem` | `workbench-shell.css` | 16 |
| `--workbench-prose-code-inline-padding` | `0.02rem 0.18rem` | `workbench-shell.css` | 17 |
| Heading weight | `700` | `workbench-shell.css` | 79 |
| Heading line-height | `1.12` | `workbench-shell.css` | 80 |
| List item gap | `0.25rem` | `workbench-shell.css` | 73 |
| Non-heading → heading gap | `1.15rem` | `global.css` | 291 |
| Code block bg | `color-mix(in oklab, var(--card) 88%, var(--background) 12%)` | `workbench-shell.css` | 117 |
| Code block border-radius | `calc(var(--radius) + 0.2rem)` | `workbench-shell.css` | 116 |
| Code block border | `1px solid var(--border)` | `workbench-shell.css` | 115 |
| Link color | `var(--primary)` | `workbench-shell.css` | 121 |
| Blockquote border | `3px solid var(--border)` | `workbench-shell.css` | 125 |
| Table border color | `var(--border)` | `workbench-shell.css` | 131 |
| Content max width | `65rem` | `global.css` | 409 |

### Inline Code Background — Theme-Aware Token Chain

The inline code background in the source system resolves through a CSS custom property that has **different values per theme**:

| Theme | `--sl-color-bg-inline-code` value | Source |
|-------|-----------------------------------|--------|
| Dark | `color-mix(in oklab, var(--card) 80%, var(--foreground) 20%)` | `global.css:85` |
| Light | `color-mix(in oklab, var(--accent) 72%, var(--background) 28%)` | `global.css:156` |

The final inline code rule at `workbench-shell.css:110` and `global.css:342` is:
```css
background: color-mix(in oklab, var(--sl-color-bg-inline-code) 88%, var(--background) 12%);
```

**Implementation:** Introduce `--sl-color-bg-inline-code` as a CSS custom property in the web app's `:root` and `[data-theme='light']` blocks so the inline code rule can reference it directly, preserving theme-aware behavior.

### Font Decision

web-docs uses Plus Jakarta Sans as its `--app-font-sans`. The web app uses Inter as `--app-font-sans`. Changing the app-wide font is out of scope. Instead, a scoped `--app-font-prose` token is introduced for the Docling MD preview only. This is the **one intentional divergence** from the source system — everything else is a direct port.

**Operational tradeoff:** Plus Jakarta Sans is imported via `web/src/main.tsx`, which means the font files (~100KB WOFF2 across 4 weights) are loaded for the entire app, not just the Parse surface. This is acceptable because: (1) the font files are loaded lazily by the browser only when CSS references them, and most pages won't trigger loading; (2) the CSS `font-family` reference is scoped to `.docling-md-preview` so only the Parse Docling MD tab triggers the download; (3) the `@fontsource` CSS imports are <1KB each (just `@font-face` declarations), and the actual WOFF2 files are fetched on demand.

## Files to Modify

| File | Change | Why |
|------|--------|-----|
| `web/src/pages/useParseWorkbench.tsx` | Line 274: replace both `parse-docling-md-preview parse-markdown-preview` with `docling-md-preview` | Scope split + cleanup of dead class |
| `web/src/theme.css` | Add new `.docling-md-preview` block after line 1828 | New styles for Parse-only surface |
| `web/src/tailwind.css` | Add `--app-font-prose`, `--sl-color-bg-inline-code`, and all `--workbench-prose-*` tokens in `:root`; add light-mode `--sl-color-bg-inline-code` override in `[data-theme='light']` | Token definitions |
| `web/src/main.tsx` | Add `@fontsource/plus-jakarta-sans` imports | Font loading |

**Not modified:** `PreviewTabPanel.tsx:385` — keeps `parse-markdown-preview` class and existing styles.

## Implementation Steps

### Step 1: Install font dependency

```
cd web && npm install @fontsource/plus-jakarta-sans
```

Same package already used in web-docs.

### Step 2: Import font weights — `web/src/main.tsx`

Insert after line 6 (after last Inter import):

```ts
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
```

### Step 3: Add token definitions — `web/src/tailwind.css`

**In `:root` block** — insert after line 9 (`--app-font-mono`):

```css
--app-font-prose: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

/* Inline code bg — theme-aware, from web-docs/src/styles/global.css:85 */
--sl-color-bg-inline-code: color-mix(in oklab, var(--card) 80%, var(--foreground) 20%);

/* Workbench prose tokens — mirrored from web-docs/src/styles/workbench-shell.css:5-17 */
--workbench-prose-font-size: 1rem;
--workbench-prose-line-height: 1.6;
--workbench-prose-block-gap: 0.8rem;
--workbench-prose-heading-letter-spacing: -0.02em;
--workbench-prose-h1-size: clamp(1.8rem, 2.6vw, 2.35rem);
--workbench-prose-h2-size: clamp(1.3rem, 2vw, 1.6rem);
--workbench-prose-h3-size: clamp(1.1rem, 1.6vw, 1.25rem);
--workbench-prose-h4-size: 1.05rem;
--workbench-prose-h2-top: 1.55rem;
--workbench-prose-h3-top: 1.2rem;
--workbench-prose-h4-top: 1rem;
--workbench-prose-heading-bottom: 0.5rem;
--workbench-prose-code-inline-padding: 0.02rem 0.18rem;
```

**In `[data-theme='light']` block** — insert after `--accent` (line 160):

```css
/* Inline code bg — light theme override, from web-docs/src/styles/global.css:156 */
--sl-color-bg-inline-code: color-mix(in oklab, var(--accent) 72%, var(--background) 28%);
```

Every token value is a 1:1 copy from the source. No derived or ad hoc values.

### Step 4: Scope split — `web/src/pages/useParseWorkbench.tsx`

Line 274 currently reads:
```tsx
<div className="parse-docling-md-preview parse-markdown-preview px-6 py-4">
```

Change to:
```tsx
<div className="docling-md-preview px-6 py-4">
```

**Class contract after change:**
- `parse-docling-md-preview` — **removed**. It has no CSS rules anywhere in the codebase (verified: zero matches in `theme.css` or any CSS file). It was a dead class.
- `parse-markdown-preview` — **removed from this element**. It remains on `PreviewTabPanel.tsx:385` for the generic markdown preview.
- `docling-md-preview` — **new**. All Starlight-aligned styles target this class.
- `px-6 py-4` — **kept**. Tailwind utility padding, unchanged.

### Step 5: Add CSS rules — `web/src/theme.css`

Insert new block after line 1828 (after `.parse-markdown-preview` section ends). Every rule maps to a specific source line:

```css
/* ── Docling MD preview ──
   Source-aligned with web-docs prose system.
   Tokens:  web-docs/src/styles/workbench-shell.css:5-17
   Rules:   web-docs/src/styles/workbench-shell.css:46-132
   Overlay: web-docs/src/styles/global.css:264-350        */

.docling-md-preview {
  /* workbench-shell.css:47-48, 52-54 */
  color: var(--foreground);
  font-family: var(--app-font-prose);
  font-size: var(--workbench-prose-font-size);
  line-height: var(--workbench-prose-line-height);
  word-break: break-word;
  /* global.css:409 — content width cap */
  width: min(100%, 65rem);
  margin-inline: auto;
}

/* workbench-shell.css:57-64 */
.docling-md-preview > :first-child { margin-top: 0; }
.docling-md-preview > :last-child  { margin-bottom: 0; }

/* workbench-shell.css:67-70 */
.docling-md-preview :is(p, ul, ol, blockquote, pre, table) {
  margin: var(--workbench-prose-block-gap) 0;
}

/* workbench-shell.css:72-74 */
.docling-md-preview li + li { margin-top: 0.25rem; }

/* workbench-shell.css:76-81 */
.docling-md-preview :is(h1, h2, h3, h4) {
  letter-spacing: var(--workbench-prose-heading-letter-spacing);
  font-weight: 700;
  line-height: 1.12;
}

/* workbench-shell.css:83-86 */
.docling-md-preview h1 {
  font-size: var(--workbench-prose-h1-size);
}

/* workbench-shell.css:88-92 */
.docling-md-preview h2 {
  font-size: var(--workbench-prose-h2-size);
  margin-top: var(--workbench-prose-h2-top);
  margin-bottom: var(--workbench-prose-heading-bottom);
}

/* workbench-shell.css:94-98 */
.docling-md-preview h3 {
  font-size: var(--workbench-prose-h3-size);
  margin-top: var(--workbench-prose-h3-top);
  margin-bottom: 0.4rem;
}

/* workbench-shell.css:100-104 */
.docling-md-preview h4 {
  font-size: var(--workbench-prose-h4-size);
  margin-top: var(--workbench-prose-h4-top);
  margin-bottom: 0.35rem;
}

/* global.css:288-292 — non-heading → heading extra gap */
.docling-md-preview
  :not(h1, h2, h3, h4, h5, h6)
  + :is(h1, h2, h3, h4, h5, h6) {
  margin-top: 1.15rem;
}

.docling-md-preview :is(ul, ol) { padding-left: 1.25rem; }

/* workbench-shell.css:120-122 */
.docling-md-preview a {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

/* workbench-shell.css:107-112 — uses theme-aware --sl-color-bg-inline-code */
.docling-md-preview code:not(pre code) {
  border: 0;
  border-radius: 0.2rem;
  background: color-mix(in oklab, var(--sl-color-bg-inline-code) 88%, var(--background) 12%);
  padding: var(--workbench-prose-code-inline-padding);
  font-size: 0.88em;
  font-family: var(--app-font-mono);
}

/* workbench-shell.css:114-118 */
.docling-md-preview pre {
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 0.2rem);
  padding: 0.8rem 1rem;
  background: color-mix(in oklab, var(--card) 88%, var(--background) 12%);
}

.docling-md-preview pre code {
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 0.875rem;
  line-height: 1.55;
}

/* workbench-shell.css:124-127 */
.docling-md-preview blockquote {
  border-inline-start: 3px solid var(--border);
  padding: 0.12rem 0 0.12rem 0.72rem;
  color: var(--muted-foreground);
}

/* workbench-shell.css:129-132 */
.docling-md-preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.docling-md-preview :is(th, td) {
  border: 1px solid var(--border);
  padding: 0.5rem 0.6rem;
  text-align: left;
  vertical-align: top;
}

.docling-md-preview th {
  font-weight: 600;
  background: color-mix(in oklab, var(--card) 92%, var(--foreground) 8%);
}

.docling-md-preview hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 1.5rem 0;
}
```

### Values Not From the Source Token System

These values appear in the CSS but are not token-backed in the source. Each is documented to distinguish from the systematic token port:

| Value | Used for | Rationale |
|-------|----------|-----------|
| `padding-left: 1.25rem` | List indentation | Standard prose indent; not tokenized in source |
| `text-underline-offset: 0.15em` | Link underline | Readability offset; not tokenized in source |
| `font-size: 0.88em` | Inline code | Relative to parent; matches source visual size |
| `font-size: 0.875rem` | Code block / table text | Standard small text; matches source visual |
| `padding: 0.8rem 1rem` | Code block padding | Matches source visual; not tokenized |
| `padding: 0.5rem 0.6rem` | Table cell padding | Matches source visual; not tokenized |
| `th background` | Table header tint | `color-mix(in oklab, var(--card) 92%, var(--foreground) 8%)` — consistent with source color-mix pattern |
| `hr margin: 1.5rem 0` | Horizontal rule | ~2x block gap; not tokenized in source |
| `h3 margin-bottom: 0.4rem` | H3 bottom spacing | Direct from `workbench-shell.css:97` but not a named token |
| `h4 margin-bottom: 0.35rem` | H4 bottom spacing | Direct from `workbench-shell.css:103` but not a named token |

## Step 6: Add regression test — `web/src/pages/useParseWorkbench.test.tsx`

Add a focused test verifying the class contract split. Pattern follows existing `PreviewTabPanel.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Test: Parse Docling MD tab uses docling-md-preview, not parse-markdown-preview
// Test: PreviewTabPanel markdown preview still uses parse-markdown-preview

describe('Docling MD preview class contract', () => {
  it('DoclingMdTab container has docling-md-preview class and not parse-markdown-preview', async () => {
    // Render DoclingMdTab and assert:
    // - container has class 'docling-md-preview'
    // - container does NOT have class 'parse-markdown-preview'
    // - container does NOT have class 'parse-docling-md-preview'
  });
});
```

The exact test implementation depends on how `DoclingMdTab` can be rendered in isolation (it requires mocking `useBlockTypeRegistry`, `resolveSignedUrlForLocators`, and fetch). The test should assert:

1. The container element has class `docling-md-preview`
2. The container element does NOT have class `parse-markdown-preview`
3. The container element does NOT have class `parse-docling-md-preview` (dead class removed)

Additionally, the existing `PreviewTabPanel.test.tsx` already renders the markdown preview path. A complementary assertion can be added there:

```tsx
it('markdown preview uses parse-markdown-preview class', async () => {
  // Render PreviewTabPanel with a .md file
  // Assert container has class 'parse-markdown-preview'
  // Assert container does NOT have class 'docling-md-preview'
});
```

## Scope Boundary

| Surface | Class | Changed? |
|---------|-------|----------|
| Parse Docling MD tab (`useParseWorkbench.tsx:274`) | `docling-md-preview` (was `parse-docling-md-preview parse-markdown-preview`) | Yes — new class, dead class removed, shared class removed |
| Generic markdown preview (`PreviewTabPanel.tsx:385`) | `parse-markdown-preview` | No |
| Assets workbench | via PreviewTabPanel | No |
| ELT workbench | via PreviewTabPanel | No |

## Verification

1. `npm run dev` from `web/`
2. Parse → select document → Docling MD tab → verify each acceptance criteria token value
3. **Dark mode:** inspect `.docling-md-preview code` computed background — should resolve through `--sl-color-bg-inline-code: color-mix(in oklab, var(--card) 80%, var(--foreground) 20%)` then `color-mix(... 88%, var(--background) 12%)`
4. **Light mode:** toggle theme, inspect same element — should resolve through `--sl-color-bg-inline-code: color-mix(in oklab, var(--accent) 72%, var(--background) 28%)` then same outer mix
5. Assets → preview a `.md` file → confirm old `.parse-markdown-preview` styling unchanged
6. Browser DevTools: inspect `.docling-md-preview` computed styles and confirm token values match the source table
7. Run `npx vitest run` to confirm regression tests pass
8. Run `npm run build` to confirm no build errors from the font dependency
