---
name: design-1-layouts-spec-with-playwright
description: Use when a live webpage needs a deterministic viewport-specific measurement pass, especially for app shells, dashboards, workbenches, or when separate day/night captures may be needed.
---

# Measuring Layouts With Playwright

## Overview

Use the script as the source of truth. Run the deterministic extractor first, then summarize or extend from its JSON output.

**REQUIRED SUB-SKILL:** Use `playwright` for browser automation when running the script.

## Core Rule

If `scripts/measure-layout.mjs` can run, do not hand-measure the page.

## Fixed Capture

Run the script with an explicit viewport:

```bash
node scripts/measure-layout.mjs \
  --url <url-or-file> \
  --width 1920 \
  --height 1080 \
  --output-dir <dir> \
  --json-out <file> \
  [--theme light|dark|both|system] \
  [--browser chromium] \
  [--headless true|false] \
  [--storage-state-path <file>] \
  [--page-mode auto|app-shell|workbench|dashboard|marketing]
```

The script always captures:

- URL, page title, browser, timestamp, viewport, device scale factor
- selected theme state
- viewport screenshot and full-page screenshot
- app frame or shell measurements (toolbar, rails, main canvas)
- named component measurements when present
- visible section inventory
- component text/style snapshots for contract-building
- **typography scale** — deduplicated typographic treatments across all visible text elements
- **theme tokens** — colors from structural elements, links, inputs, and surface elevations

## Output Location

Artifacts save to `docs/design-layouts/<slug>/<width>x<height>/`:

```
docs/design-layouts/<slug>/<width>x<height>/
├── report.json                 (top-level summary)
├── light/
│   ├── report.json            (per-pass measurements)
│   ├── viewport.png
│   └── full-page.png
└── dark/                       (only if --theme both)
    ├── report.json
    ├── viewport.png
    └── full-page.png
```

The capture index lives at `docs/design-layouts/captures.json`.

## Two Workflows

### 1. Direct CLI

Run `scripts/measure-layout.mjs` directly. Use `--storage-state-path` for authenticated pages.

### 2. Capture Server + Admin UI

Start the local server, then use the admin page at `/app/superuser/design-layout-captures`:

```bash
npm run capture-server     # starts on localhost:4488
```

The server handles auth sessions (headed browser for login), orchestrates captures, and serves results. The admin UI provides a table view, add-new modal, and re-capture actions.

## Theme State Rule

Default capture is one visible state only.

Pass `--theme both` to capture light and dark in a single run. Each theme produces a separate pass directory and report.

Run an additional pass when:

- the user explicitly asks for night or dark mode
- the page visibly supports multiple theme states
- the task is a shell, token, or parity audit where theme differences matter

Treat each theme as a separate measured baseline.

- Do not infer dark mode from a light-mode capture.
- Do not merge day/night observations into one report.

## Report Structure

The JSON report contains:

- **capture** — metadata: browser, viewport, theme, page URL/title, runtime info
- **measurements** — structural elements: appFrame, topToolbar, shellRow, leftRail, mainCanvas, rightRail, plus dataset selectors, search inputs, tab strips, action buttons, visible sections
- **typography** — deduplicated scale of font treatments with fontFamily, fontSize, lineHeight, fontWeight, letterSpacing, fontStyle, textTransform, color, sample text, occurrence count, and tags; plus fontFamilies list and fontSizeRange summary
- **components** — inventory of all visible interactive and text elements (buttons, links, inputs, headings, paragraphs, code blocks) with bounding boxes and computed styles
- **theme** — color tokens from structural elements, links, inputs, and distinct surface elevations
- **diagnostics** — raw coordinate data for debugging

## Deterministic Boundaries

- The script measures only visible, rendered state.
- The script does not claim responsive behavior beyond the requested viewport.
- The script does not inspect hidden menus, modals, hover states, or unopened drawers unless the user explicitly asks for another captured state.
- The script does not guess design intent.
- The script does not mix multiple theme states into one baseline.

## When To Extend

Run an additional pass only when the user asks for:

- another viewport
- another page state
- another theme state
- a named component not covered by the baseline

If you add follow-up measurements, label them as additional passes instead of mixing them into the baseline.

## Output Discipline

- Quote exact values from the JSON report.
- Keep units unchanged.
- Mark any statement that did not come from the script as inference.
- Prefer named components over generic buckets like "hero" when the page is an app shell or workbench.
- Use `typography.scale` for font treatments — do not manually extract from `styleSnapshot`.

## Common Mistakes

- Treating monitor resolution as the same thing as browser viewport
- Eyeballing measurements from the screenshot instead of using the report
- Generalizing one viewport into a responsive spec
- Blending inferred behavior into the measured baseline without labeling it
- Treating dark mode as implied instead of captured
- Using landing-page heuristics on app-shell pages
- Extracting typography from container `styleSnapshot` instead of `typography.scale`
