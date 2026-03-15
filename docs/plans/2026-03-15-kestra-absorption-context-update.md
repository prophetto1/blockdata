---
title: Kestra Absorption Context Update
description: Purpose document capturing the architectural meaning, current reality, and narrowed direction for the service registry, Kestra plugin catalog, and load-focused activation work.
---

# Kestra Absorption Context Update

Updated: 2026-03-15

## Purpose

This document exists to preserve the architectural intent that became clear during the March 15 working conversation.

It is not an implementation plan and not a feature spec. It is a context-and-purpose document for future planning sessions so that:

- the work is judged against the right north star
- short-term delivery pressure does not erase the longer-term platform direction
- future connector and orchestration plans do not accidentally rebuild a parallel system beside the registry/runtime
- the immediate GCS -> Arango load need can be pursued without losing the deeper BlockData execution-plane vision

The main thing worth preserving is that the team was not merely discussing "connectors." It was converging on a more meaningful platform framing: BlockData is building its own execution plane, and Kestra is being absorbed as a capability library and reference model, not adopted as product destiny.

## Executive Summary

The important conclusion from the conversation was this:

- `web-kt` is a reference surface, not the product identity
- `kestra-ct` is a control and discipline layer, not the runtime
- the unified service registry is the real platform core
- the imported Kestra plugin universe is a capability library that should be normalized into BlockData concepts
- connectors, parsing tools, transforms, utilities, and orchestration should all become specializations of the same runtime model

This means the next correct move is not "build connector features off to the side." It is "extend and clean the registry/runtime so connectors become first-class BlockData functions."

At the same time, the work must be narrowed to stay shippable. The right narrowing is not "solve all 174 services." It is "focus on the Load stage first, and activate one real source/destination path through the registry model."

The best proof point remains:

`GCS source -> Arango destination`

That pair is important not because those are the only services that matter, but because they validate the architecture end to end:

`catalog -> categorization -> connection binding -> execution -> run tracking`

## What Became Clear

### 1. The platform was already moving toward a generic runtime

The core service-registry migrations already describe something larger than a one-off integration system.

`supabase/migrations/20260227150000_050_unified_service_registry.sql` establishes:

- `service_type_catalog`
- `service_registry`
- `service_functions`
- `service_runs`
- `service_functions_view`

Its own comments explicitly say the model should support:

- a single registry for all backend services and callable functions
- the Advanced Config page
- the Load tab
- service types such as `dlt`, `dbt`, `docling`, `edge`, `conversion`, and `custom`

`supabase/migrations/20260227180000_054_registry_consolidation_additive.sql` continues that direction by:

- extending function typing
- registering Supabase Edge as a runtime service
- seeding edge functions into `service_functions`
- adding `project_service_config`

This is already a BlockData runtime abstraction. Some labels still reflect earlier implementation phases, but the model itself is broader than Kestra.

### 2. Kestra was being used as reference and input, not as destiny

The conversation clarified an intent that matters a lot:

- the goal was never to "become Kestra"
- the goal was to borrow battle-tested patterns, route shapes, workflow interaction models, and especially connector vocabulary and plugin breadth
- the long-term platform identity remains BlockData-native

This applies at every layer:

- `web-kt` exists because Kestra's UI and route model are mature reference material
- `kestra-ct` exists to keep the compatibility effort disciplined and reversible
- the plugin catalog matters because Kestra already solved a large amount of connector surface area

The phrase that best captures the intended relationship is:

`Kestra as reference and compatibility inspiration, not Kestra as product destiny.`

### 3. The actual move is absorption, not external integration

Another critical clarification: the architecture is not centered on deploying a separate Kestra JVM and forwarding work to it.

The intended trajectory is closer to absorption:

- Kestra plugins become registered services and functions in the BlockData registry
- plugin endpoints and task classes become callable BlockData functions
- core orchestration concepts become BlockData-native runtime capabilities
- the runtime lives in BlockData components such as Supabase edge functions and Python services

In that framing, Kestra's main value is:

- plugin catalog
- task semantics
- flow/workflow reference model
- proven interaction design

Its main value is not "run Kestra somewhere else forever."

## Current Repo Reality

### Registry foundation exists

The registry tables in migration 050 are real and structurally meaningful:

- `service_registry` defines backend services
- `service_functions` defines callable functions per service
- `service_runs` tracks execution history
- `project_service_config` adds project-scoped configuration in migration 054

That is enough foundation to support a unified execution-plane model.

### Kestra catalog ingestion is already materially present

The conversation referenced a UI state showing roughly 174 services, with about 166 flattened into a broad "Integration" grouping. The repo supports that reality:

- `supabase/migrations/20260303130000_067_integration_catalog_seed.sql` seeds 945 Kestra plugin entries into `integration_catalog_items`
- `supabase/migrations/20260303140000_068_kestra_plugin_satellite_seed.sql` seeds provider enrichment and plugin parameter metadata

So the catalog side is not hypothetical. A large imported capability universe already exists.

### The catalog is ahead of execution readiness

The screenshot interpretation and repo evidence point to an important asymmetry:

- a large number of services/functions are cataloged
- categorization is still too flat to support pipeline-stage thinking
- health/executability is not established
- connection binding is not yet clearly expressed

In other words, the platform is far enough along to say "the library exists," but not yet far enough to say "the library is operational."

### Registry naming drift is real

One concrete source of confusion is a schema/code naming mismatch:

- migrations define `service_registry`, `service_functions`, and `service_type_catalog`
- multiple runtime codepaths still query `registry_services`, `registry_service_functions`, and `registry_service_types`

Examples include:

- `supabase/functions/admin-services/index.ts`
- `supabase/functions/admin-integration-catalog/index.ts`
- `web/src/pages/settings/services-panel.api.ts`
- `web/src/pages/marketplace/ServicesCatalog.tsx`
- `web/src/pages/marketplace/ServiceDetailPage.tsx`

This drift matters because it means the conceptual backbone exists, but parts of the codebase still point at the wrong identity. Any new work that builds on the registry should treat this cleanup as a prerequisite, not a nice-to-have.

## Why the Earlier Connector Framing Needed Revision

An earlier plan treated the GCS -> Arango load path as a new connector subsystem built around dedicated job tables like `connector_jobs` and `connector_job_items`.

That approach is understandable from a delivery perspective, but it conflicts with the architecture that is already forming.

The main issue is not that async item tracking is wrong. The main issue is where that tracking belongs.

The wrong pattern is:

- invent a separate connector subsystem beside the service registry
- model load execution outside the existing service/function/run abstraction
- make connectors feel like exceptions rather than first-class runtime citizens

The corrected direction is:

- register source and destination capabilities as service functions
- use the registry/runtime as the system of record for execution
- add item-level tracking only as a subordinate execution detail, not as a separate top-level subsystem

If per-item progress is needed, it should conceptually hang under service execution, not replace it.

## The Real Tension

The tension was real and should be stated plainly.

On one side:

- there is an immediate business need to move CSV files from GCS into Arango
- there is also a related need to later bring documents from Arango into the platform for parse/extract/transform work

On the other side:

- the proper architectural path runs through the registry model and the Kestra-absorption direction
- that direction is not fully operational yet

So the choice was not between "smart" and "dumb." It was between:

- shipping something quickly in a parallel subsystem
- or using the current need to validate the right platform core

The conversation converged on the second option, but with a crucial narrowing: do not try to activate all services at once.

## Why a Load-Focused Slice Changes the Problem

Focusing on the Load step does change the problem in a helpful way.

It turns an overwhelming platform question into a staged execution question:

- not "make all Kestra absorption real now"
- but "make the Load slice real through the same model"

That makes the scope tractable without abandoning the architecture.

A good Load-focused interpretation is:

- keep the registry/runtime as the backbone
- keep the imported Kestra catalog as the capability library
- postpone broad orchestration work
- postpone activation of the other 170+ services
- activate one source path and one destination path

This preserves the right shape while keeping the initial proof point small.

## Which Imported Services Actually Matter for Load

Not all imported integrations belong to the immediate Load concern.

Working estimate from the conversation: roughly half of the imported plugin-function universe is load-capable in some way. In other words, there is a meaningful subset of the catalog that can act as:

- source
- destination
- or both

That matters because it confirms Load is not a tiny edge case inside the imported catalog. It is one of the major slices that deserves its own categorization and activation strategy.

The services most relevant to Load are the ones that move records or files across boundaries:

- cloud/object storage connectors such as GCS, S3, and Azure Blob/Data Lake
- database connectors such as Postgres, MySQL, BigQuery, Redshift, ClickHouse, Cassandra, DB2, and Couchbase
- document/datastore connectors such as MongoDB
- stream or ingestion connectors such as Kafka, AMQP, and Pulsar
- ELT wrappers and ingestion-capable tools such as dlt, Airbyte, and CloudQuery

The services that do not define the immediate Load slice include:

- AI services
- notification services
- parse/conversion tools
- orchestration/control plugins
- internal or administrative runtime helpers

This matters because the current registry heuristics flatten too much of this into generic categories.

MongoDB is useful here as evidence, not as a proposed replacement for Arango. It shows that some document-database integrations already exist in the imported catalog and therefore help define the boundaries of the Load slice. The point is not "use Mongo instead." The point is "the imported catalog already contains real source/destination examples that help scope load-focused activation work."

## Why Current Categorization Is Not Good Enough

The import logic in `supabase/functions/admin-services/index.ts` infers service and function types using a few narrow string heuristics:

- `.dbt.` -> transform
- `.docling.` or parser-like strings -> parse
- `.jdbc.`, `.sql.`, `.dlt.` or `sqlite` -> dlt/source
- `convert` -> conversion
- otherwise -> custom or utility

That logic is too weak for a mature imported plugin universe.

It means many genuinely load-relevant services are likely being flattened into generic "Integration/custom/utility" presentation, even when users need to think in pipeline-stage terms such as:

- Sources
- Destinations
- Transform
- Parse
- Orchestration
- Utility
- Conversion
- Notifications

This also suggests categorization must happen at more than one level:

- service-level grouping for discovery and filtering
- function-level grouping because one service may expose source, destination, utility, and orchestration capabilities at the same time

## Immediate Use Case, Restated Cleanly

The immediate use case should be restated in operational language:

- source CSV files live in GCS
- those files need to become JSON documents in ArangoDB Cloud
- later, documents should also be retrievable from Arango into the platform as source material for parse/extract/transform flows

That means the first activation target is in the Load domain, not the Parse domain and not the full Flow domain.

## GCS, Arango, and MongoDB in This Framing

### GCS

GCS fits the imported connector story well. It belongs naturally in the Load slice as a source-oriented capability.

### Arango

Arango is strategically important because it is the concrete destination in the immediate use case and part of the platform's broader data loop.

But the conversation surfaced a valid caution: Arango may not exist in the imported plugin library in the same clean way as GCS or MongoDB. If so, it may need to begin as a BlockData-native destination adapter while still conforming to the registry model.

That does not violate the architecture. It still supports the same execution plane as long as Arango is expressed as a service/function pair within the registry rather than as a parallel feature subsystem.

### MongoDB

MongoDB is a good reference case for why categorization matters. It clearly belongs to Load:

- it is a source when reading documents or query results
- it is a destination when inserting or updating documents

The plugin satellite seed also shows MongoDB-specific provider metadata in `20260303140000_068_kestra_plugin_satellite_seed.sql`, which reinforces that some imported connectors already have the shape needed for a more mature source/destination classification model.

MongoDB should therefore be treated as a reference integration for the Load slice, not as a platform-direction substitute for Arango. Arango remains required where the product and data model require Arango.

## What the Kestra Source Availability Changes

Another important clarification from the conversation is that the team is not operating from scraped docs alone. The repo context includes:

- Kestra plugin source code
- Kestra handler and invocation code
- Kestra website and documentation source
- imported plugin schemas and metadata already seeded into the local catalog

This changes the nature of the work.

The remaining challenge is not "how do these integrations behave?" or "can we figure out the contract?" The challenge is:

- cleaning the runtime and registry identity
- building the execution bridge that can invoke functions with user-bound credentials
- translating the needed handler logic into the BlockData runtime

That means the first end-to-end integration is still substantial, but it is substantial mostly because of runtime wiring, execution plumbing, and translation effort. It is not substantial because the system lacks source material or because the plugin behavior is mysterious.

## Why One Full Integration Still Matters

The conversation also sharpened an important delivery principle:

- the first fully wired integration is the expensive one
- later integrations become much cheaper once the generic bridge exists

That is because the reusable work sits below the individual provider:

- credential binding
- function invocation contract
- run tracking
- item or batch progress tracking
- UI flow for selecting, configuring, running, and observing a load path

Once those pieces exist, each additional integration becomes mostly:

- register the service and functions cleanly
- bind the credential type
- translate or implement the provider-specific adapter

In that sense, a Load-capable imported integration such as MongoDB is valuable as a reference path for building the generic bridge, while Arango is valuable as proof that the same bridge can support a required BlockData-native destination even when there is no native Kestra plugin.

## The Most Important Architectural Guardrails

Future plans should be evaluated against these guardrails.

### 1. Do not build a parallel connector product

Connector execution should not become its own side system with separate identity, separate lifecycle, and separate mental model from the service registry.

### 2. Do not overfit the platform to Kestra naming

Kestra compatibility is valuable, but the runtime should be expressed in BlockData's own platform language where needed. Preserve compatibility where useful; do not let it dictate the final product identity.

### 3. Treat the registry/runtime as the platform core

The registry is not an accessory admin screen. It is the execution-plane backbone around which connectors, transforms, parses, utilities, and flows should organize.

### 4. Separate service identity, connection identity, and runtime health

These are related but not the same:

- a service can exist in the catalog without a bound credential
- a connection can be valid even when executor availability is unknown
- health should primarily indicate runtime/executor readiness, not just credential presence

### 5. Categorize at function level, not only service level

A single service may expose multiple roles. The UI and planning model should allow that.

## Recommended Near-Term Sequencing

This sequence best preserves both meaning and momentum.

### Step 1. Fix registry identity drift

Clean the mismatch between:

- `service_registry` / `service_functions` / `service_type_catalog`

and:

- `registry_services` / `registry_service_functions` / `registry_service_types`

Nothing built on top of the registry will feel stable until the code and schema agree on what the registry is called.

### Step 2. Define BlockData-native categorization over the imported catalog

Do not rely only on the current import heuristics. Add a BD-facing classification model that lets users think in workflow stages.

Minimum useful categories:

- Source
- Destination
- Load
- Transform
- Parse
- Orchestration
- Utility
- Conversion

### Step 3. Bind connections separately from service definitions

The service catalog should define capabilities.

Credentialed user connections should define who can execute those capabilities against which external systems.

This keeps the registry generic and reusable while still making execution possible.

### Step 4. Activate exactly one source and one destination

Do not attempt broad service activation.

Make one real source function and one real destination function executable:

- GCS source
- Arango destination

If Arango must begin as BD-native, that is acceptable as long as it is modeled through the same registry/function pattern.

### Step 5. Build the smallest useful Load flow

The minimal user experience should allow:

- selecting a source function
- selecting a destination function
- binding the required connections
- configuring parameters
- running the load
- seeing execution and item-level progress

The UI should bias toward function selection rather than only service selection.

## What This Means for Planning

The current connector plan in `docs/plans/2026-03-15-connector-foundation-gcs-arango-load.md` should no longer be treated as the final framing for this effort.

It still contains useful implementation ideas, especially around:

- connection handling
- credential encryption reuse
- GCS auth and download mechanics
- CSV normalization
- Arango write mechanics

But its top-level framing should be revised so that:

- connector execution is not modeled as a separate first-class subsystem
- the registry/runtime becomes the organizing backbone
- naming drift cleanup is an explicit prerequisite
- BD-native categorization and connection binding are treated as first-order work
- the first deliverable is a load-focused activation slice, not a generic connector platform parallel to the registry

## Open Questions That Still Matter

These are not blockers to the context document, but they should shape the next design doc.

- Should item-level tracking live as a new subordinate registry-run table, or should the first slice stay simpler and only add it once the first executable pair is working?
- How much of the imported catalog should be reclassified by deterministic rules versus curated overrides?
- What is the best source of truth for connector capability grouping: service row, function row, imported plugin metadata, or a merged model?
- Is Arango best introduced first as a BD-native destination adapter, then mapped into the imported-catalog mental model later?
- Which exact imported services should be designated as the first Load-ready shortlist after GCS and MongoDB-class connectors are reviewed?

## Product-Direction Insights That Also Crystallized

The connector discussion surfaced several product-direction conclusions that extend beyond Load and the registry. These should not be lost.

### Three-layer processing model

The conversation converged on a clean separation of post-upload processing:

1. **Normalize** (pre-parse): backend auto-converts JSON, YAML, XML, and other non-document formats into parser-friendly representations. This expands parse format support without Docling or Pandoc needing to handle everything natively. The normalization layer sits between ingest and parse.

2. **Parse**: Docling, Pandoc, and normalized inputs produce blocks and artifacts from documents. This is the existing pipeline.

3. **Transform**: a scriptable block-operations workbench. Not format conversion. The user's vision is hundreds of Python scripts in the backend, exposed through toolbars, running batch operations on parsed blocks. Each script declares input type, output type, batch safety, and config UI. Transform operates on blocks, not files.

This separation matters because it prevents Transform from becoming "the place where unsupported formats go" and keeps Parse focused on document-to-block conversion.

### Users choose intent, platform chooses processing path

When discussing JSON and YAML support, a product principle emerged: lack of direct parse support for a format should not be surfaced to users as "go use Transform." Instead, the platform should:

- detect whether an uploaded file is document-like or dataset-like
- offer a guided choice: "Use as document" vs "Use as dataset"
- route to the correct processing path internally

The principle is: users express intent, the platform owns the routing complexity.

### Pre-parse normalization expands parse support

JSON, YAML, and XML files can enter the parse pipeline if the platform auto-converts them into a parser-friendly representation first. For example:

- JSON/YAML -> normalized text/markdown representation -> Docling
- XML -> normalized HTML -> Docling or Pandoc
- CSV -> row-aware textual representation (for document-like treatment) or direct dataset path

This is not Transform. It is a managed ingestion adapter layer: `source file -> normalizer -> parser track`. It should be invisible to the user.

### Pandoc complements Docling for format coverage

Pandoc adds practical new parse support for: rst, org, epub, odt, rtf, typst. There is overlap with Docling on docx, html, md, and latex. The platform's parser routing (see `2026-03-14-parser-routing-capability-workflow.md`) should eventually direct each format to the strongest parser, but Pandoc's primary value-add is the formats Docling cannot handle.

### The second user flow: Arango as source

The GCS -> Arango direction is the immediate load need. But the conversation also established a second flow: Arango -> Platform.

In this flow, a user has documents or data already in ArangoDB and wants to pull them into the platform as `source_documents`, then use Parse, Extract, and Transform on them. ArangoDB becomes a source connector — like Google Drive or Dropbox, but reading from Arango collections.

This means Arango must be modeled as both a destination (for Load) and a source (for Import), which reinforces why it should be expressed through the registry as a service with multiple function types rather than as a one-off connector.

## Practical North Star

The clearest way to carry this work forward is:

`BlockData is building a generic execution plane. Kestra contributes the plugin universe, workflow vocabulary, and reference patterns. The service registry is the backbone. The next proof point is not more catalog breadth; it is making one load-oriented source/destination path executable through that backbone.`

That is the meaningful thing this conversation reached.

## Key File Anchors

- `supabase/migrations/20260227150000_050_unified_service_registry.sql`
- `supabase/migrations/20260227180000_054_registry_consolidation_additive.sql`
- `supabase/migrations/20260303130000_067_integration_catalog_seed.sql`
- `supabase/migrations/20260303140000_068_kestra_plugin_satellite_seed.sql`
- `supabase/functions/admin-services/index.ts`
- `supabase/functions/admin-integration-catalog/index.ts`
- `docs/pipeline/task-inventory.md`
- `docs/pipeline/kestra-ct/README.md`
- `docs/pipeline/kestra-ct/decisions.md`
- `docs/plans/2026-03-15-connector-foundation-gcs-arango-load.md`

## Recommended Follow-Up Artifact

The next document to write after this one should be a revised implementation plan that starts from this reality:

- registry cleanup first
- BD-native categorization next
- connection binding after that
- then one executable Load proof point through the registry model

The plan should explicitly state that imported catalog breadth is already ahead of execution readiness, and that the goal of the next phase is activation, not more ingestion.
