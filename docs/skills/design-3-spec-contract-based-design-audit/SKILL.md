---
name: design-3-spec-contract-based-design-audit
description: Use when one built page needs to be audited against the canonized specs in `web-docs/specs`. Trigger for requests to check component contracts, token contracts, app shell contracts, day and night rules, and typography against one page's source and rendered output, then fix inconsistencies and verify again.
---

# Auditing Pages Against Spec Contracts

## Overview

Audit one page at a time against the canonized specs, fix inconsistencies, then verify the rendered result. Use the deterministic report generator so the audit always leaves the same artifact shape behind.

## Fixed Inputs

- Canonized specs live under `E:\writing-system\web-docs\specs`
- One source page
- One local dev URL for that page

Do not widen scope to multiple pages in one run.

## Core Rule

If `scripts/build-page-audit-report.mjs` can run, use it to record the audit. Do not leave the audit as ad hoc notes.

## Workflow

1. Audit source first.
- Read the relevant contracts from `web-docs/specs`.
- Check component contracts, token contracts, app shell contracts, day and night requirements, and typography.
- If the specs define an Ark UI mapping or preferred component contract, generic HTML or the wrong component choice is a violation.

2. Report and fix.
- Record source findings.
- Fix inconsistencies in the page implementation.

3. Verify rendered output.
- Check the local dev URL for that page.
- Confirm the rendered result now matches the canonized specs.
- If rendered output still violates the contracts, fix and re-verify.

4. Emit the audit artifact.
- Run `scripts/build-page-audit-report.mjs` with the normalized findings and fix summary.
- Keep the JSON and markdown report as the audit record for that page.

## Deterministic Output

Each run should emit:

- `page-contract-audit.json`
- `page-contract-audit.md`

The report shape is fixed. The page and findings change, but the artifact type does not.

## What To Check

- component contracts
- token contracts
- app shell contracts
- day and night rules
- typography contracts
- rendered verification against the local page

## Common Mistakes

- Skipping source audit and only checking the browser
- Treating canonized component mappings as suggestions
- Fixing the code but not re-verifying the rendered output
- Auditing multiple pages at once
- Leaving the audit as freeform notes instead of generating the report artifact
