# 2026-0213-1810-harden-ingest-artifacts-and-project-ia

filename (UID): `2026-0213-1810-harden-ingest-artifacts-and-project-ia.md`  
problem: Current product flow still reflects legacy layout and ingest assumptions (two-pane docs/runs view, single-artifact conversion assumptions, extension-only routing, file-upload-centric source model), which blocks connector-era scale and downstream integration reliability.  
solution: Implement one integrated hardening slice that refactors project information architecture to document-first execution while upgrading ingest architecture to multi-artifact manifests, source-adapter contracts, content-aware routing, and connector-grade security/ops boundaries.  
scope: project UX flow, run initiation model, multi-artifact ingest contracts, source-adapter abstractions, routing hardening, and connector-era security/verification outputs.

## Included Implementation Rules

1. Integration expansion must remain sequenced after core ingest/pipeline hardening, but integration output contracts must be defined now.
2. Users should interact through project/document status semantics, not internal parser representation terminology.
3. AG Grid remains focused on block/detail view; left-side selection list should stay lightweight.
4. Runs are explicit document actions, not a permanently co-equal side rail in project information architecture.
5. Multi-artifact conversion support is required; single-sidecar assumptions are not acceptable for connector-era pipelines.

| Action | Detailed action description | Tangible output (end condition) |
|---|---|---|
| 1 | Define and publish a precise integration output contract that current pipeline outputs must satisfy before downstream connectors, including canonical fields, provenance guarantees, and destination-shape staging boundaries. | New contract file `dev-todos/specs/0213-integration-output-contract.md` with validation checklist linked to ingest outputs (repo state before action: reflection asks for this contract; no dedicated contract file found). |
| 2 | Refactor project page information architecture to a document-first master/detail layout where left pane is lightweight document selector and right pane hosts detail/grid surface, replacing persistent side-by-side Documents/Runs framing. | Updated project UI components (including `web/src/pages/ProjectDetail.tsx`) implementing master/detail structure and right-pane sticky header/index behavior (repo state before action: `ProjectDetail` remains two-column Documents/Runs layout). |
| 3 | Rework run execution interactions so runs are triggered as explicit actions on selected documents, with stable document metadata columns and first-class row/header selection controls in the document table UX. | Updated project/document action surfaces in web pages/components with document-level run-action controls and metadata columns (repo state before action: runs are presented as dedicated side column and separate list). |
| 4 | Upgrade conversion artifact model from single-artifact assumption to multi-artifact manifest contract by expanding representation persistence constraints, removing single-sidecar callback rejection, and storing parser/intermediate/destination-ready artifacts per conversion. | Updated migration(s), `supabase/functions/_shared/representation.ts`, and `supabase/functions/conversion-complete/index.ts` to support artifact manifests and multi-artifact insert semantics (repo state before action: `conversion_representations_v2.conv_uid` is unique and callback rejects multiple sidecar keys). |
| 5 | Introduce explicit source-adapter contracts (storage + DB + structured source pathways) so ingest is not file-upload-only, and define pluggable source ingestion interfaces for connector classes (storage/db feeds). | New source-adapter contract and implementation scaffolding in ingest modules (`supabase/functions/ingest/*`) with adapter registry docs/code (repo state before action: ingest entry expects `formData` file upload path). |
| 6 | Improve routing from extension-only policy routing to extension + content detection, including fallback behavior for mislabeled files and deterministic route decision logging for verification. | Updated `supabase/functions/ingest/routing.ts` and supporting detection utilities/tests with content-aware fallback logic (repo state before action: routing resolves from extension/policy only). |
| 7 | Implement connector-era security and ops hardening for ingest/adapter pathways, including secret-bearing connection config sanitation and structured log sanitization for adapter execution flows. | New/updated security hardening modules and evidence `dev-todos/_complete/2026-0213-connector-security-hardening.md` (repo state before action: current sanitize layer is filename-oriented). |
| 8 | Publish one closure artifact that verifies pipeline-hardening outcomes and project-IA outcomes together, including regression checks for user-facing upload/status workflows and multi-artifact conversion behavior. | `dev-todos/_complete/2026-0213-ingest-artifacts-project-ia-closure.md` with binary lock outcomes. |

## Completion Logic

This plan is complete only when all conditions below are true:

1. Contract lock: integration output contract is published and applied as ingest compatibility check.
2. IA lock: project page is document-first master/detail with lightweight left selector and right detail/grid surface.
3. Run-model lock: runs are explicit document actions with metadata and selection controls.
4. Multi-artifact lock: conversion pipeline accepts and persists multi-artifact manifests per conversion.
5. Source-adapter lock: ingest path supports explicit source-adapter contract beyond direct file upload.
6. Routing lock: content-aware routing fallback is implemented and tested.
7. Security lock: connector-era secret/log sanitization hardening is in place.
8. Final-output lock: unified closure artifact exists with binary pass/fail outcomes.

