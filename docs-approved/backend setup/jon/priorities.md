# Spring Break Action Plan

## Purpose

This document organizes the current BlockData priorities into separated concerns so work can move without cross-contaminating unrelated decisions.

The plan is aligned with the current direction of the main repo in `E:\writing-system`:

- `web/` is the active product surface
- Supabase remains the operational system of record
- Python execution services remain the main execution path
- ArangoDB is a projection and graph layer, not the control plane

- `blockdata-ct` should become the communication and approval layer across active branches
-

This is not a detailed implementation plan. It is a strategic action guide for the next 10 days.

## Working rule

Do not treat every priority as one blended stream. Keep work separated by concern:

1. Control tower and governance
2. Kestra and execution architecture
3. Integrations and provider layer
4. Arango and document graph direction
5. AI platform functionality
6. Standards and format mapping

Each concern can move in parallel, but only one or two should be treated as primary build lanes at a time.

## Recommended priority order for the next 10 days

1. Control tower and governance
2. Kestra and execution architecture
3. Standards and format mapping
4. Integrations and provider layer
5. Arango and document graph direction
6. AI platform functionality

Reason:

- The docs/control-tower layer reduces branch confusion immediately.
- Kestra and execution work are closest to active platform architecture in the main repo.
- Standards mapping reduces semantic confusion before deeper AI and graph work expands.
- Nango, Arango, and AI should move after the operating model is clearer.

## 10-day operating frame

### Days 1-2: Establish control

- Turn `blockdata-ct` into the working coordination surface.
- Define document status, freshness, ownership, and approval expectations.
- Separate canonical guidance from rough notes, assessments, and branch artifacts.

### Days 3-5: Lock execution direction

- Clarify how Kestra informs BlockData architecture.
- Separate what we adopt from what we do not adopt.
- Confirm the path from Kestra schema and API patterns to Python execution handlers and Supabase-backed control data.

### Days 6-7: Remove standards confusion

- Build a clean map of the standards and formats in use.
- Define what each format is for, what it is not for, and where it belongs in the system.

### Days 8-9: Expand adjacent lanes

- Place Nango in the architecture properly.
- Clarify ArangoDB scope and graph usage.
- Connect those decisions back to service catalog and document processing.

### Day 10: Reconcile and publish

- Publish the approved direction.
- Mark what is active, proposed, deferred, and discarded.
- Leave the next work cycle with a clean branch communication surface.

## Concern 1: Control Tower and Governance

### Goal

Make `blockdata-ct` the control center for communication between branches, proposal approval, standards publication, and document freshness.

### Why this matters now

Without this layer, work across the main repo, data efforts, and platform efforts will keep producing documents without any durable way to know what is current, approved, stale, or disposable.

### General action guide

1. Define document classes.
   Separate canonical docs, working proposals, branch notes, assessments, and archive material.
2. Define document statuses.
   Use a simple lifecycle such as `draft`, `review`, `approved`, `stale`, `archived`, and `discarded`.
3. Define approval ownership.
   Every important document should have an owner, a review date, and a decision state.
4. Create a branch communication pattern.
   Make it clear where branch-specific updates live and how they get promoted into canonical guidance.
5. Define dissemination rules.
   Standards, accepted proposals, and architecture decisions should move into stable sections that other branches can reference.
6. Define discard rules.
   Rough notes and stale imports should either be rewritten, archived, or discarded explicitly.

### Expected outputs

- A stable control-tower information architecture
- A document approval and freshness model
- Clear separation between branch work and canonical direction

## Concern 2: Kestra and Execution Architecture

### Goal

Use Kestra as a schema, API, and operator-pattern reference while keeping BlockData execution centered on Python services, Supabase control data, and the BlockData web app.

### Why this matters now

The main repo already points toward a Supabase-backed control plane with Python execution services. Kestra is useful as a design and compatibility source, but not as the runtime center of gravity.

### General action guide

1. Separate Kestra reference value from Kestra runtime adoption.
   Be explicit about what BlockData is borrowing: schema patterns, operator UX, plugin catalog shape, API contracts, and SQL ideas.
2. Confirm the backend adoption pattern.
   Decide which Kestra schema patterns are adopted directly, especially JSONB plus generated columns, execution state shape, logs, metrics, and triggers.
3. Confirm the Python execution path.
   Tie Kestra task semantics to Python handler development and service execution contracts.
4. Clarify frontend scope.
   Separate flow UI, non-flow operational features, testing surfaces, blueprints, and admin/runtime configuration.
5. Clarify autogeneration opportunities.
   Evaluate where Kestra Java definitions can help generate handler scaffolds, schemas, or metadata without importing JVM runtime dependence.
6. Define test boundaries.
   Separate schema validation, API compatibility, frontend behavior, and actual execution/runtime verification.

### Expected outputs

- A clear “adopt / adapt / ignore” map for Kestra
- A stable execution architecture note
- A separated list of frontend, backend, and schema work for the execution layer

## Concern 3: Integrations and Provider Layer

### Goal

Understand where Nango fits, how it relates to provider integrations, and how it connects to the existing API catalog, Scalar usage, and service registration model.

### Why this matters now

It is clear that BlockData needs a reliable provider integration layer, but the exact role of Nango relative to existing API and catalog work is not yet fully clear.

### General action guide

1. Define the problem Nango would solve.
   Clarify whether the need is OAuth connection management, sync scheduling, provider normalization, credential lifecycle, or all of the above.
2. Compare Nango to current platform surfaces.
   Place it relative to the existing API menu, Scalar-driven API visibility, provider integration work, and service catalog patterns.
3. Decide where it belongs in the architecture.
   Determine whether it is a provider connectivity layer, a sync execution layer, or a developer-facing integration helper.
4. Decide the integration boundary.
   Clarify which parts belong in BlockData-owned services versus which parts are delegated to Nango.
5. Define the data model impact.
   Identify what provider/account/connection/sync state would need to exist in Supabase and how it would relate to service registry entries.

### Expected outputs

- A clear statement of what Nango is for in BlockData
- A decision on whether to adopt, defer, or replace it
- A connection model between providers, services, and API surfaces

## Concern 4: ArangoDB and Document Graph Direction

### Goal

Define ArangoDB as a graph and projection layer for documents, relationships, citations, structures, and linked metadata without confusing it with the operational control plane.

### Why this matters now

The main repo already points toward Arango as a projection target for `blocks` and `doclingdocument_json`. That direction needs clearer scope so it supports rather than destabilizes current platform work.

### General action guide

1. Define the role of ArangoDB precisely.
   Keep it as projection, relationship traversal, and graph query infrastructure.
2. Define which document objects project into Arango.
   Include Docling-derived documents, extracted entities, citations, structural relationships, and cross-references.
3. Define the sync contract.
   Decide what source data comes from Supabase JSON documents and how graph edges are generated.
4. Define graph use cases first.
   Focus on citation traversal, structural dependency graphs, cross-document relation lookup, and knowledge graph support.
5. Separate graph concerns from execution concerns.
   Do not mix Arango decisions with core execution runtime decisions.

### Expected outputs

- A clear Arango scope statement
- A source-to-projection model for document graphs
- A prioritized list of graph use cases

## Concern 5: AI Platform Functionality

### Goal

Define the next AI-facing surfaces inside the platform: API configuration, chat-pane behavior, and end-user MCP accessibility.

### Why this matters now

The AI lane is important, but it should not expand faster than the execution, document, and standards layers that need to support it.

### General action guide

1. Separate AI infrastructure from AI UX.
   Treat model/provider configuration, chat pane design, and user-facing tools as different concerns.
2. Define the AI API configuration surface.
   Clarify what users or admins need to manage: providers, keys, models, routing, defaults, and guardrails.
3. Define the chat-pane role.
   Decide whether it is contextual assistant, workflow helper, document helper, or a blend of these.
4. Define end-user MCP scope carefully.
   Clarify what user-facing MCP access means in practice and which tools or sources are safe to expose.
5. Tie AI features back to docs and structured content.
   Ensure the control tower and docs corpus remain part of the grounding layer for AI features.

### Expected outputs

- A separated AI work map
- A stable definition of chat-pane purpose
- A clearer boundary around user-facing MCP capability

## Concern 6: Standards and Format Mapping

### Goal

Reduce confusion across the standards, schemas, and intermediate representations already in the system or under consideration.

### Why this matters now

Several standards are being discussed at once, and some are being conflated. This creates planning drift and weakens design conversations.

### General action guide

1. Build a master standards map.
   Create one reference that lists every format, what it is for, what it is not for, and where it belongs.
2. Separate API description from data description.
   Keep OpenAPI and JSON Schema conceptually distinct.
3. Separate document extraction formats from document publication formats.
   Distinguish Docling JSON, Pandoc AST JSON, mdast, reStructuredText/Docutils, Akoma Ntoso, and JSON-LD by role.
4. Define the transformation chain.
   Clarify how extracted documents move through intermediate representations toward UI rendering, storage, export, and graph projection.
5. Define the no-code interface formats.
   Clarify where YAML is required for Kestra compatibility and where JSON can serve as the native internal representation.

### Expected outputs

- A clean format-and-standards reference
- Reduced confusion in architecture discussions
- Stronger handoff between document processing, graph work, APIs, and frontend rendering

## Standards reference guide

### OpenAPI Specification

- Purpose: Describe REST APIs
- Use for: endpoint definitions, parameters, request/response shapes, machine-readable API documentation, import/export of API contracts
- Do not use for: internal document storage models

### JSON Schema

- Purpose: Describe JSON data shape and validation rules
- Use for: payload validation, config objects, structured JSON contracts
- Do not use for: complete API description by itself

### Docling JSON / Pydantic document model

- Purpose: Structured extracted document representation
- Use for: canonical extraction output, nested document storage, structural metadata
- Do not use for: public API description

### Pandoc AST JSON

- Purpose: Universal intermediate representation across document formats
- Use for: format conversion and programmatic document manipulation
- Do not use for: graph relationship storage by itself

### mdast

- Purpose: Markdown abstract syntax tree
- Use for: controlled Markdown transformation and rendering
- Do not use for: full universal document interchange

### Akoma Ntoso

- Purpose: Semantically rigorous legal and regulatory XML
- Use for: statutes, contracts, regulatory structures, high-rigidity legal export/import
- Do not use for: casual document interchange

### JSON-LD

- Purpose: Linked data in JSON form
- Use for: graph-aware metadata, entity relationships, ontology-aligned export, Arango-related relationship work
- Do not use for: basic UI rendering by itself

### Docutils / reStructuredText

- Purpose: Python-native structured text system
- Use for: Python-heavy documentation or tooling workflows where reStructuredText is already a requirement
- Do not use for: the default BlockData content model unless there is a strong reason

### YAML in the Kestra lane

- Purpose: No-code flow representation and operator-facing configuration patterns
- Use for: Kestra-compatible authoring or import/export surfaces
- Do not use for: the only internal system representation when JSON-backed storage is stronger

## Final guidance for the next 10 days

If time and attention are limited, optimize for these three outcomes:

1. `blockdata-ct` becomes a reliable control tower
2. Kestra adoption is clarified into a stable execution direction
3. Standards confusion is reduced with one authoritative reference

If those three outcomes are achieved, the Nango, Arango, and AI lanes will be much easier to expand without drift.
pec perrtaining to desining APIs. For the work we do in pec perrtaining to desining APIs. For the work we do in 