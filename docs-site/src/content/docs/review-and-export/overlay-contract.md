---
title: Overlay Contract
description: The staging/confirmed two-column overlay model and confirmation semantics.
sidebar:
  order: 1
---

**Spec version:** v1.0
**Date:** 2026-02-11
**Source:** `docs/platform/complete/0209-staging-vs-confirmed-overlays.md`
**Status:** Canonical — implemented in migration 009 (Option A chosen), used by grid and export

---

## Scope

This page defines the database-level contract for overlay data: the two-column staging/confirmed model, the overlay status enum, confirmation semantics, and the export boundary rule.

It does **not** cover: schema artifact format, worker processing protocol, or grid UI behavior.

---

<!-- BEGIN VERBATIM COPY from docs/platform/complete/0209-staging-vs-confirmed-overlays.md -->
<!-- Surgical edits: Option B removed (Option A was chosen and implemented); "Decision needed" section removed. -->

## Problem
Users should not have to blindly accept AI-filled schema fields. Today, AI-produced overlay values have only one obvious place to live: `block_overlays_v2.overlay_jsonb` (Current repo). That makes it hard to distinguish:

- **Draft/staging** values (volatile, still being produced/edited)
- **Confirmed** values (durable, integration/export-safe)

We need an explicit Postgres-level contract so "confirm" is enforceable and exports have a stable source of truth.

---

## Goals

These are the requirements for the overlay contract.

1. AI writes to a **staging area** only.
2. Users can review staging overlays in the grid and **confirm** (per block / selection / whole run).
3. Only confirmed overlays are treated as "final" for exports/integrations by default.
4. Confirmation is auditable: who confirmed, when, and (optionally) what changed.
5. The contract supports:
   - Many documents per project
   - Multiple runs per document (different schemas or re-runs)
   - Future "document editing track" (edited block content derived from AI + user review)

Non-goal (for now): per-field confirmation/approval within a single overlay JSON object.

---

## DB Contract: Two JSONB columns on `block_overlays_v2`

Columns:
- `overlay_jsonb_staging jsonb not null default '{}'`
- `overlay_jsonb_confirmed jsonb not null default '{}'`
- `confirmed_at timestamptz null`
- `confirmed_by uuid null`

Rules:
- Worker/AI pipeline writes only `overlay_jsonb_staging` and staging-related status.
- UI reads staging for "live" progress and editing.
- "Confirm" copies staging → confirmed (and stamps `confirmed_*`).
- Export/integrations read **confirmed** by default; optionally allow "export staging" explicitly.

---

## Confirmation API

Implemented at the DB level. Confirmation should be implemented as an RPC (or a small set of RPCs) so:
- It's atomic (copy + audit + optional validation in one transaction).
- Authorization is enforced (owner can confirm their own run's overlays only).

Supported operations:
- Confirm one block overlay
- Confirm selected block overlays (array of `block_uid`)
- Confirm all overlays for a run
- Reset staging from confirmed (optional "discard draft")

---

## Export + Integrations Contract
Default behavior:
- `export-jsonl` exports **confirmed** overlays only.

Optional advanced export modes:
- export confirmed
- export staging (explicitly marked "draft")
- export both (confirmed + staging) for debugging

This makes integrations predictable (Neo4j/webhook consumers don't ingest half-finished values unless explicitly chosen).

---

## Fit with the "Document Editing Track"
Editing track introduces an additional "final artifact": edited block content intended for reconstruction.

Principle:
- Keep `blocks_v2.block_content` immutable.
- Treat "edited content" as an overlay output that must also follow staging → confirm.

Practical implication:
- The schema/run for editing must include a designated field for edited block content (or a reserved key in the overlay JSON).
- Reconstruction (when supported by the parser/track) should be defined as: "reconstruct using confirmed edited block content where present; otherwise fall back to original immutable block content."

<!-- END VERBATIM COPY -->
