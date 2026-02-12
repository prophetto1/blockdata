---
title: Current Ongoing Work
description: Active priority queue, execution gates, and progress tracking.
sidebar:
  label: Overview
  order: 0
---

This section is **living** documentation. It is useful for coordination, but it is not a substitute for canonical contracts/specs.

For rules about what belongs in `docs-site` vs working docs, see:
- [Docs Policy](/docs/docs-policy/)

## Execution Model

All platform work follows a **one-at-a-time priority queue**. Each priority has explicit exit criteria that must be met before the next priority starts. Evidence is written to docs after each completed step.

Internal assistant development (KG, vector, MCP, CLI) is **deferred** until all core workflow gates are complete.

---

## Priority Queue

| # | Priority | Status | Summary |
|--:|----------|--------|---------|
| 1 | Close format reliability gate | **Passed** | Full matrix run `20260211-124133` passed all required formats: `md`, `txt`, `docx`, `pdf`, `pptx`, `xlsx`, `html`, `csv`. |
| 2 | Lock worker/run reliability baseline | In Progress | Claim-release reliability fixed and verified for no-key/cancel/invalid-key paths; happy-path, retry, and rollup parity checks are still pending valid key setup. |
| 3 | Lock config registry and resolve conflicts | Pending | Centralize ~20 hardcoded defaults, resolve temperature drift (`0.2` vs `0.3`), `base_url` migration parity, claim ordering bug. |
| 4 | Implement prompt caching | Pending | Add `cache_control` to worker LLM calls. Trivial change, 86% input cost savings. |
| 5 | Implement adaptive multi-block batching | Pending | Pack multiple blocks per API call. Restructure worker claim/call loop, add overflow handling. |
| 6 | Build admin/superuser optimization controls | Pending | Centralize runtime policy (caching, batching, model defaults) in admin UI with run-level config snapshots. |
| 7 | Complete schema core workflow | Pending | Wizard-first schema creation, advanced editor compatibility, fork-by-default save semantics. |
| 8 | Review/export lifecycle completion | Pending | Close remaining export variants, validate staged/confirmed workflow end-to-end. |
| 9 | Hardening and ops baseline | Pending | Expand test coverage, finalize runbooks, verify RLS/security, establish CI baseline. |

---

## Core Workflow Gates

All gates must pass before internal assistant work begins.

| Gate | Status |
|------|--------|
| Required source formats pass ingest/conversion smoke matrix | Passed (8/8 verified, run `20260211-124133`) |
| Worker pipeline verified live (claim &#8594; ai_complete/failed &#8594; rollup) | In progress (no-key/cancel/invalid-key scenarios verified; happy/retry/rollup still pending) |
| Schema core workflow complete and stable | Not started |
| Review/export workflows complete and tested | Not started |
| Core hardening baseline and runbooks in place | Not started |

---

## Format Reliability Matrix

| Format | Runtime Status | Track | Last Verified |
|--------|---------------|-------|---------------|
| `md` | Verified | mdast | 2026-02-11 |
| `txt` | Verified | mdast | 2026-02-11 |
| `docx` | Verified | docling | 2026-02-11 |
| `pdf` | Verified | docling | 2026-02-11 |
| `pptx` | Verified | docling | 2026-02-11 |
| `xlsx` | Verified | docling | 2026-02-11 |
| `html` | Verified | docling | 2026-02-11 |
| `csv` | Verified | docling | 2026-02-11 |

---

## Known Risks

1. **Temperature mismatch**: Worker fallback `0.2` vs UI/DB default `0.3`.
2. **Worker is Anthropic-only**: Multi-provider UI exists, but worker provider resolution filters for Anthropic.
3. **Claim ordering bug**: `ORDER BY block_uid` is lexicographic, not numeric by `block_index`. Unsafe for batching.
4. **Custom provider `base_url` drift**: App and edge function code reads/writes `base_url`, but migration schema and RPC signatures do not codify it.
5. **Hardcoded policy spread**: ~20 config values scattered across worker, UI, DB migration, and ingest layers with no single source of truth.

---

## Canonical Documents

These are the source-of-truth files in the repo for ongoing work:

| Document | Purpose |
|----------|---------|
| `docs/ongoing-tasks/0211-core-workflows-before-assistant-plan.md` | Master sequencing: workstreams A-E and gate checklist |
| `docs/ongoing-tasks/0211-core-priority-queue-and-optimization-plan.md` | Ordered execution queue with exit criteria per priority |
| `docs/ongoing-tasks/0211-admin-config-registry.md` | Hardcoded config inventory, conflict summary, target admin schema |
| `docs/ongoing-tasks/0211-source-format-reliability-matrix.md` | Format verification matrix and smoke assertions |
| `docs/ongoing-tasks/0211-source-format-smoke-results.md` | Latest smoke run results |
| `docs/ongoing-tasks/0211-worker-token-optimization-patterns.md` | Cost analysis and optimization tier design |
| `docs/ongoing-tasks/0211-session-handoff-resume-guide.md` | Session continuity and startup checklist |
