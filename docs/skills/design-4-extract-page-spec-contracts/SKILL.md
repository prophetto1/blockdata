---
name: design-4-extract-page-spec-contracts
description: Use when one live page needs to become a deterministic platform-design package. Trigger for requests to extract app shell contracts, day and night tokens, responsive shell behavior, typography, spacing, and visible component inventory from a single page without crawling other routes.
---

# Extracting Platform Page Contract

## Overview

Build one package from one page. Run the package script first, then treat the generated JSON and markdown contract as the authority.

**REQUIRED INPUT:** One page only. Do not crawl. Do not cluster routes. Do not widen scope beyond the provided page.

## Required Reading

Before assembling captures or running the package script, read:

- `references/platform-page-package-format.md` — the fixed output schema
- `scripts/build-platform-page-package.mjs` — the expected input shape (`page-captures.json`)
- `scripts/fixtures/sample-page-captures.json` — a concrete example of valid input

You must understand the exact schema the script expects before producing input for it.

## Core Rule

If `scripts/build-platform-page-package.mjs` can run, do not assemble the package manually.

## Fixed Package

Run:

```bash
node scripts/build-platform-page-package.mjs --input-path <page-captures.json> --output-dir <dir>
```

Each run emits the same package shape:

- `platform-design-system.json`
- `shell-variant-<page-id>.json`
- `platform-design-contract.md`

## One-Page Boundary

- One URL defines the entire scope.
- One visible page defines the shell variant.
- No crawling, no route discovery, no multi-page shell inference.

## Required Coverage

- desktop, tablet, and mobile viewport captures
- visible shell contract
- typography scale
- spacing scale
- theme tokens
- visible component inventory
- openable page states (dropdowns, modals, drawers) visible on that same page when triggered by a single click

## Theme Rule

- Capture the currently visible theme first.
- If the page supports day and night, both themes are required for a complete package.
- To switch themes, try in order: (1) toggle `prefers-color-scheme` via Playwright emulation, (2) find and click a visible theme toggle, (3) toggle a `data-theme` or class attribute on `html`/`body`.
- If all deterministic switching fails, ask the user for help and continue from the new visible state.

## Workflow

1. Stay on the page.
- The page is the scope.
- Do not branch into site-wide analysis.

2. Collect normalized page captures.
- Use `measuring-layouts-with-playwright` to measure each required viewport and theme combination.
- Transform each measurement report into the capture schema defined in `scripts/fixtures/sample-page-captures.json`.
- Every capture must include: `viewportName`, `width`, `height`, `theme`, `shell`, `typography`, `tokens`, `spacingScale`, `components`.
- Save the assembled captures array as `page-captures.json` for the packaging script.

3. Run `scripts/build-platform-page-package.mjs`.
- Treat the master JSON, variant JSON, and markdown contract as the output of record.

## Allowed Differences

- CI/BI swaps
- explicit user-requested changes

If a difference does not fall into one of those categories, preserve the page package exactly.

## Common Mistakes

- Turning one page into a crawl
- Accepting only one theme when the page supports both
- Treating component inventory as optional
- Emitting a freeform summary instead of the fixed package
- Confusing a single-page shell contract with a whole-platform route map
- Guessing the input schema instead of reading the fixture and script source
- Producing captures missing required fields (`tokens`, `typography`, `spacingScale`, `components`)
