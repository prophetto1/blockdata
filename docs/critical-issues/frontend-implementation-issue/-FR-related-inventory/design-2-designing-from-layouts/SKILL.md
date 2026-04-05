---
name: design-2-designing-from-layouts
description: Use when a measured layout capture needs to become a fixed page reproduction contract. Trigger for requests to turn `report.json` and screenshots into an implementation contract for an identical or near-identical page, while allowing only CI/BI swaps and explicit user-requested changes.
---

# Designing From Layout Contract

## Overview

Generate one output type only: a page reproduction contract. Use the contract script first, then use the resulting contract as the build authority.

**REQUIRED INPUT:** Prefer the frozen artifacts from `measuring-layouts-with-playwright`, especially `report.json`.

## Core Rule

If `scripts/build-layout-contract.mjs` can run, do not write the contract manually.

## Fixed Output

Run:

```bash
node scripts/build-layout-contract.mjs --report-path <report.json> --mode similar --output-path <contract.md>
```

The script always emits one result type:

- `Page Reproduction Contract`

The output format does not change between modes. Mode changes only the allowed-deltas language inside the contract.

## Mode Rule

- `parity`: preserve the reference as directly as possible.
- `similar`: still preserve the reference implementation. CI/BI swaps and explicit user-requested changes are allowed, but all other implementation details must remain identical.

Do not treat `similar` as permission to redesign the page.

## Workflow

1. Start from frozen artifacts.
- Use `report.json` and screenshots as the primary source.
- Use the live reference only if the artifacts leave a factual gap.

2. Run `scripts/build-layout-contract.mjs`.
- Save the contract to a deterministic path.
- Treat the generated contract as the build authority.

3. Build from the contract.
- Preserve structure, spacing, hierarchy, and measured values unless the contract explicitly allows a change.

## Allowed Differences

- CI/BI swaps
- explicit user-requested changes

If a change does not fall into one of those buckets, keep it identical to the reference.

## Live Reference Rule

- Live reference checks are allowed only to resolve missing facts.
- Live reference use must not widen the allowed changes.
- Do not replace frozen measurements with fresh visual guesses unless the frozen artifacts are missing the fact entirely.

## Contract Coverage

The generated contract includes:

- source metadata
- required-result rules
- requested changes
- fixed layout contract
- section inventory
- live-reference rule
- acceptance rule

## Common Mistakes

- Writing a fresh design brief instead of a reproduction contract
- Treating `similar` as creative freedom
- Allowing unrequested spacing, hierarchy, or typography changes
- Using the live reference to justify drift from the frozen capture
- Mixing analysis notes into the final contract instead of emitting the fixed contract format
