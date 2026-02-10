# Staging vs Confirmed Overlay Data (Design Note)
**Date:** 2026-02-09  
**Status:** Proposed contract (v2 follow-up)  
**Applies to:** Runs / schema overlays (`runs_v2`, `block_overlays_v2`), exports (JSON/JSONL), integrations (Neo4j/webhook), and the future “document editing track”.

---

## Problem
Users should not have to blindly accept AI-filled schema fields. Today, AI-produced overlay values have only one obvious place to live: `block_overlays_v2.overlay_jsonb` (Current repo). That makes it hard to distinguish:

- **Draft/staging** values (volatile, still being produced/edited)
- **Confirmed** values (durable, integration/export-safe)

We need an explicit Postgres-level contract so “confirm” is enforceable and exports have a stable source of truth.

---

## Goals (requirements)
1. AI writes to a **staging area** only.
2. Users can review staging overlays in the grid and **confirm** (per block / selection / whole run).
3. Only confirmed overlays are treated as “final” for exports/integrations by default.
4. Confirmation is auditable: who confirmed, when, and (optionally) what changed.
5. The contract supports:
   - Many documents per project
   - Multiple runs per document (different schemas or re-runs)
   - Future “document editing track” (edited block content derived from AI + user review)

Non-goal (for now): per-field confirmation/approval within a single overlay JSON object.

---

## Recommended DB Contract (two viable options)

### Option A — Two JSONB columns on `block_overlays_v2` (simplest)
Add columns:
- `overlay_jsonb_staging jsonb not null default '{}'`
- `overlay_jsonb_confirmed jsonb not null default '{}'`
- `confirmed_at timestamptz null`
- `confirmed_by uuid null`

Rules:
- Worker/AI pipeline writes only `overlay_jsonb_staging` and staging-related status.
- UI reads staging for “live” progress and editing.
- “Confirm” copies staging → confirmed (and stamps `confirmed_*`).
- Export/integrations read **confirmed** by default; optionally allow “export staging” explicitly.

Pros: minimal plumbing, easiest to query/render in the grid.  
Cons: confirmed and staging live in the same row (requires discipline + strict write paths).

### Option B — Separate staging table (strong separation)
Create:
- `block_overlay_staging_v2 (run_id, block_uid, overlay_jsonb, updated_at, updated_by, ...)`
Keep:
- `block_overlays_v2.overlay_jsonb` as confirmed-only (plus status/attempt/error fields as needed).

Rules:
- Worker/AI writes only to `block_overlay_staging_v2`.
- Confirm action writes into `block_overlays_v2.overlay_jsonb`.

Pros: hard separation between draft vs final, reduces accidental “final” writes.  
Cons: more joins/queries + slightly more UI plumbing.

---

## Confirmation API (DB-level)
Confirmation should be implemented as an RPC (or a small set of RPCs) so:
- It’s atomic (copy + audit + optional validation in one transaction).
- Authorization is enforced (owner can confirm their own run’s overlays only).

Suggested operations:
- Confirm one block overlay
- Confirm selected block overlays (array of `block_uid`)
- Confirm all overlays for a run
- Reset staging from confirmed (optional “discard draft”)

---

## Export + Integrations Contract
Default behavior:
- `export-jsonl` exports **confirmed** overlays only.

Optional advanced export modes:
- export confirmed
- export staging (explicitly marked “draft”)
- export both (confirmed + staging) for debugging

This makes integrations predictable (Neo4j/webhook consumers don’t ingest half-finished values unless explicitly chosen).

---

## Fit with the “Document Editing Track”
Editing track introduces an additional “final artifact”: edited block content intended for reconstruction.

Principle:
- Keep `blocks_v2.block_content` immutable.
- Treat “edited content” as an overlay output that must also follow staging → confirm.

Practical implication:
- The schema/run for editing must include a designated field for edited block content (or a reserved key in the overlay JSON).
- Reconstruction (when supported by the parser/track) should be defined as: “reconstruct using confirmed edited block content where present; otherwise fall back to original immutable block content.”

---

## Decision needed
Pick Option A or Option B.

If the priority is speed + minimal refactor: Option A.  
If the priority is airtight separation for exports/integrations: Option B.

