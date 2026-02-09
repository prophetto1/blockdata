Recap: What we have
Backend (complete pipeline, one blocker)
Supabase Edge Functions — all 5 deployed and working:

ingest — file upload, MD parsed inline, non-MD dispatched to conversion service
conversion-complete — webhook callback, handles both mdast and Docling tracks
export-jsonl — canonical { immutable, user_defined } NDJSON export
schemas — JSON schema registration with SHA256 dedup
runs — run creation via create_run_v2 RPC
Database — v2 schema active across 5 tables (documents_v2, blocks_v2, schemas, runs_v2, block_overlays_v2), 6 migrations applied, Realtime enabled on overlays.

Docling conversion service — code complete, Docker image built, deployed to GCP Cloud Run on the agchain project. BLOCKED: the GCP org policy prevents allUsers IAM binding, so the service returns 403 to external callers. Markdown uploads work end-to-end; DOCX/PDF uploads hit this wall. The fix requires one of three options documented in gcp-cloud-run-conversion-service-status.md.

Missing backend piece: The worker/processor edge function — the thing that claims pending overlay rows, sends block content + schema to an LLM, and writes structured results back into overlay_jsonb. Without this, the AI annotation loop doesn't run.

Frontend (functional, needs redesign)
Live at md-annotate.vercel.app. ~2,000 lines of React across 31 files.

What works today:

Auth (login, session persistence, sign-out)
Mantine AppShell (side nav, header, responsive)
Upload wizard (3-step: file → schema → run)
Document list, schema list, runs list (functional stubs)
Block Viewer (AG Grid) — the core product feature: pinned immutable columns, dynamic schema-driven overlay columns, type-aware cell renderers, server-side pagination, Realtime overlay updates, run selector, progress bar
What the storyboard says it should become:

Project-centric model (new projects table as container for documents + schema)
Simplified nav: Projects, Schemas, Integrations (current: Dashboard, Upload, Documents, Schemas, Runs)
4-step wizard: Name → Upload (multi-file + dropzone) → Review Stats → Attach Schema
Project View page with aggregate progress, document table, action bar
Block Grid stays as-is (already matches storyboard Page 4)
Schema Library with field previews and creation paths
Integrations page (Neo4j, webhook, DuckDB — future)
Design decisions made yesterday
Storyboard validated against the PRD, tech spec, and immutable fields spec. Architecturally sound. One tension flagged: project-level schema binding vs multi-schema per document (solvable with UX refinement).
Visual aesthetic: "Linear design" — minimal, dark-friendly, high-density. Similar to AFFiNE (which you have locally at ref-repos/AFFiNE).
Path A confirmed: Stay with Mantine, theme it toward the Linear aesthetic. No framework switch.
What needs doing from here
Tier 1 — Unblock the pipeline
Task	What it is	Effort
Fix Cloud Run 403	Override org policy or deploy to a different GCP project so the conversion service is callable. Without this, DOCX/PDF uploads stall at "converting."	Your action (GCP console)
Build the worker edge function	Claims pending overlays, calls LLM (OpenAI/Anthropic structured output), writes results to overlay_jsonb. This is the AI annotation loop — the reason the product exists.	Significant
Tier 2 — Redesign frontend to match storyboard
Task	What it is	Effort
Create projects table + migration	New DB table, FK on documents_v2, RLS policy	Small
Mantine theme config	Dark default, Inter font, tight spacing, muted palette — the Linear look	Small
Rebuild nav	3 items (Projects, Schemas, Integrations) replacing current 5	Small
Projects List page	Cards with progress bars, badges, timestamps (replaces Dashboard)	Medium
New Project wizard	4-step Stepper: Name → Upload (multi-file dropzone) → Review Stats → Schema	Medium-large
Project View page	Breadcrumb, action bar, document table, aggregate progress	Medium
Update Document Detail	Add breadcrumbs, project context, conversion metadata display	Small
Schema Library upgrade	Field previews, usage counts, creation modal with 3 paths	Medium
Tier 3 — Polish & hardening
Code-splitting, testing, error boundaries, accessibility, CI/CD — all the Phase 12-13 items in the checklist.

The highest-impact next step depends on what you want to prioritize: if you want the AI annotation loop working end-to-end, the worker edge function is the blocker. If you want the frontend to match the storyboard, the Mantine theme + projects table + new wizard is the path. What would you like to tackle?