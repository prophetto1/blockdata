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
  --width 1440 \
  --height 1024 \
  --output-dir <dir> \
  --json-out <file>
```

The script always captures:

- URL, page title, browser, timestamp, viewport, device scale factor
- selected theme state
- viewport screenshot
- full-page screenshot
- app frame or shell measurements
- named component measurements when present
- visible section inventory
- component text/style snapshots for contract-building

## Workflow

1. Choose an explicit viewport.
- Never infer viewport from display resolution.
- If the user says "desktop" without dimensions, pick one explicit viewport and state it.

2. Run `scripts/measure-layout.mjs`.
- Save artifacts under `output/playwright/`.
- Treat the generated JSON as the measured truth.

3. Convert the report into a human-facing output.
- Use [layout-spec-template.md](references/layout-spec-template.md) when the user wants a parity spec or styling specification.
- Separate script output from any later inference.

## Theme State Rule

Default capture is one visible state only.

Run an additional pass when:

- the user explicitly asks for night or dark mode
- the page visibly supports multiple theme states
- the task is a shell, token, or parity audit where theme differences matter

Treat each theme as a separate measured baseline.

- Do not infer dark mode from a light-mode capture.
- Do not merge day/night observations into one report.

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

## Common Mistakes

- Treating monitor resolution as the same thing as browser viewport
- Eyeballing measurements from the screenshot instead of using the report
- Generalizing one viewport into a responsive spec
- Blending inferred behavior into the measured baseline without labeling it
- Treating dark mode as implied instead of captured
- Using landing-page heuristics on app-shell pages
