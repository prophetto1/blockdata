---
title: "Proposals Phase 2 Status"
description: "**Context:** This status note describes what has actually been completed so far in the current proposals Phase 2 work, what is still left, and what \"finished\" means if we continue the feature where it currently lives."
---# Proposals Phase 2 Status

**Context:** This status note describes what has actually been completed so far in the current proposals Phase 2 work, what is still left, and what "finished" means if we continue the feature where it currently lives.

## Current Baseline

- Proposal files live in `src/content/docs/proposals/`.
- Proposal frontmatter metadata is the workflow source of truth.
- Proposal content should be reviewed through a rendered markdown preview.
- The current implementation still lives in the docs-site proposals workspace for now.
- The Blockdata platform framing is the longer-term product direction, but that UI integration has not been built yet.

## What Is Completed

The completed work is backend and workflow plumbing, not final product UI.

- Proposal workflow metadata now has a clearer domain contract.
- Status transitions are validated instead of being loosely implied.
- Proposal parsing and assessment append behavior are centralized.
- Proposal file reads and writes now go through a shared repository layer.
- Proposal normalization now uses the shared repository layer.
- Proposal APIs now support structured JSON responses.
- Review writes support stale-write conflict checks through `expectedUpdatedAt`.

## Files Added Or Updated In The Completed Checkpoint

- `src/lib/proposals/types.ts`
- `src/lib/proposals/workflow.mjs`
- `src/lib/proposals/repository.mjs`
- `src/lib/proposals/api.mjs`
- `src/pages/api/proposals/review.ts`
- `src/pages/api/proposals/list.json.ts`
- `src/pages/api/proposals/[filename].json.ts`
- `scripts/proposals-repository.test.mjs`
- `scripts/proposals-api.test.mjs`
- `scripts/normalize-proposals.mjs`

## Current Commit Checkpoint

- Commit: `216a99c`
- Message: `feat: add proposal repository and structured APIs`

## What Is Not Done

- The proposals workspace page is still a large single page.
- The UI has not been refactored into focused components.
- Search and filtering are not implemented.
- Visible success and error review feedback is still thin.
- Reviewer identity is still not handled through a proper session seam.
- Accepted proposals do not yet have a separate canonical output view.
- Operator documentation for the finished Phase 2 workflow is not written.
- Final phase verification has not been run because later tasks are still incomplete.

## What Is Left To Finish Phase 2 Where It Currently Lives

### Task 4: Componentize the workspace UI

- Split the current proposals page into focused components.
- Keep rendered markdown preview as the core review surface.
- Add search and filtering.
- Add empty states and visible review success and error messaging.

### Task 5: Add reviewer session seam

- Add a proposal session helper.
- Read reviewer identity from env such as `PROPOSALS_REVIEWER`.
- Prefill reviewer identity when available.
- Disable review actions when reviewer identity is absent.
- Let the API prefer session reviewer identity when present.

### Task 6: Add accepted proposals canonical view

- Add a dedicated `/proposals/accepted` route.
- Present accepted proposals as stable canonical decisions.
- Add links from the proposals workspace and related navigation where appropriate.

### Task 7: Add docs and final verification

- Document how the proposals workspace works.
- Document proposal normalization, local write restrictions, reviewer env setup, and conflict behavior.
- Run proposal tests, Astro check, and build.
- Stage and commit the remaining Phase 2 work.

## Definition Of Finished For The Current Phase 2 Scope

Phase 2 is finished, in the current docs-site location, when:

- proposal workflow reads and writes are centralized
- UI concerns are componentized
- reviewers can search and assess proposals through the current workspace
- reviewer identity has a real seam instead of only free-text input
- accepted proposals have a separate canonical view
- operator documentation exists
- verification passes for tests, Astro check, and build

## Plain-English Summary

Completed:
- backend and workflow plumbing

Left:
- UI structure
- reviewer identity seam
- accepted-output view
- docs
- final verification
