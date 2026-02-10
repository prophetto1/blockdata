# PRD — BlockData v2.0 (name change planned)

**Purpose:** The envisioned final product — features, users, value, success criteria
**Time Orientation:** Future (end state)
**Status:** Draft (v2.0). Once finalized, this document is LOCKED and never modified.

Companion documents:
- `docs/product-defining-v2.0/0207-prd-tech-spec-doc2.md` (architecture + canonical output contract)
- `docs/product-defining-v2.0/0207-immutable-fields.md` (immutable field definitions + pairing rules)
- `docs/product-defining-v2.0/0207-blocks.md` (block types + hybrid extraction requirement)
- `docs/product-defining-v2.0/0207-defining-user-defined-schemas.md` (use case illustrations)

---

## Section 1: Product Vision

### 1.1 One-Sentence Definition

> BlockData is a document intelligence platform that decomposes uploaded documents into ordered, typed blocks and lets users apply custom extraction schemas so that AI workers produce structured, per-block metadata at any scale — from a single manuscript to a 28,000-document corpus.

### 1.2 Core Belief

> We believe that extracting structured knowledge from documents should not require custom ML pipelines, manual reading at scale, or forcing an entire document into a single AI session. If the document can be split into independent units with stable identities, then AI can process each unit against a consistent standard — and the results compose back into something more useful than the original document alone.

### 1.3 Success Vision

> When BlockData succeeds, a legal researcher uploads 28,000 Supreme Court opinions, defines five extraction schemas (paragraph classification, entity extraction, citation graph, rule extraction, topic tagging), and has per-paragraph structured data across the entire corpus — with every extracted field traceable to a specific paragraph in a specific opinion. A general counsel uploads a 45-page contract, applies a clause review schema, and gets an obligation register, a risk heat map, and a deadline tracker — each item linked to the clause that created it. A writer uploads a 39,000-word manuscript, applies a prose editing schema embedding Strunk's 18 rules, and gets a revised manuscript, a narrative flow assessment, and a keyword map — produced paragraph by paragraph at consistent quality, then reassembled in reading order.

---

## Design Directive: Web-First Platform

> **This section is normative.** It constrains every design decision, UI priority, and feature sequence in this product.

### Directive

BlockData is a **web application**, not a data pipeline with a web interface bolted on. The block viewer, schema creation wizard, run management dashboard, and result inspection tools are the primary product experience. Users work in the browser. The platform succeeds when users never need to leave it to accomplish their goals.

### What This Means in Practice

1. **The block viewer is the primary output.** When a run completes, the user's first experience is seeing results populate column by column in their browser — not downloading a JSONL file. JSONL export exists for corpus-scale downstream pipelines (DuckDB, Neo4j, custom scripts), not as the default way to see results.

2. **Schema creation happens in the browser.** The template library, AI-assisted wizard, and visual builder are not future extensions — they are the primary schema creation paths. Direct JSON authoring is the power-user escape hatch, not the default.

3. **Result inspection is interactive.** Users expand rows, filter by status, sort by schema fields, and compare runs in the block viewer. Aggregated views (obligation registers, risk heat maps, deadline trackers) are in-platform features, not post-export assembly exercises.

4. **Real-time feedback during processing.** As AI workers complete blocks, the block viewer updates live — rows transition from pending to complete, overlay fields fill in. The user watches their results materialize, not polls a status endpoint.

5. **Export is secondary.** JSONL export serves two audiences: (a) corpus-scale users who need to feed downstream analytical pipelines, and (b) users who want a portable archive. For single-document use cases (manuscript editing, contract review, close reading of individual opinions), the web interface is the complete experience.

### Priority Sequence

The block viewer ships before the export endpoint is polished. The schema wizard ships before the JSON upload form. The run dashboard ships before the CLI. Every feature decision that trades web experience quality for pipeline convenience is wrong.

### Why This Directive Exists

The specification documents that follow describe the canonical output contract, immutable field definitions, and block types in terms of their JSONL serialization — because JSONL is the formal specification language. This can create the false impression that JSONL export is the product. It is not. The JSONL spec defines the *data contract*; the web interface delivers the *user experience*. Both matter, but the web interface is what users see, touch, and judge the product by.

---

## Section 2: Problem

### 2.1 The Pain

- **Long documents exceed AI context windows.** A 39,000-word manuscript cannot be processed consistently in a single AI session. The AI shortcuts, loses context, applies standards inconsistently, or skips sections partway through. The user has tried and failed.

- **Structured metadata exists at the document level but not at the paragraph level.** A legal database tells you *Marbury v. Madison* is about judicial review (issue area code 9), decided 6-0, authored by Marshall. It does not tell you which paragraph articulates the holding, which paragraphs cite which cases, or what legal principle is stated in paragraph 12. The gap between document-level metadata and paragraph-level understanding is where all the analytical value lives — and no existing tool fills it.

- **Manual extraction does not scale.** Extracting five metadata fields from 420,000 paragraphs across 28,000 documents is thousands of hours of expert reading. Reviewing a 45-page contract clause-by-clause for obligations, risk flags, cross-references, and deadlines takes 6–10 hours per contract. The work is not conceptually hard — it is voluminous.

### 2.2 Who Feels It

| Audience | How They Experience the Pain |
|:--|:--|
| Legal researchers | Have large corpora (thousands of cases, statutes, filings) with rich case-level databases but no paragraph-level structured data. Cannot answer "which paragraph states the holding?" or "where is this case cited and for what principle?" at scale. |
| Academic writers | Have long manuscripts (30,000–100,000 words) that need consistent paragraph-level editing, assessment, or metadata extraction. No single AI session can maintain quality across the full document. |
| Legal professionals (general counsel, contract reviewers) | Receive long commercial contracts (30–80 pages) that need clause-level analysis: obligations, risk flags, defined terms, cross-references, deadlines. Manual review is slow and inconsistent across reviewers. |
| Analysts and knowledge engineers | Need to build knowledge graphs, compliance registers, or structured datasets from unstructured document collections. Existing tools provide document-level classification but not paragraph-level entity/relation extraction with provenance. |

### 2.3 Current Workarounds

| Workaround | Limitation |
|:--|:--|
| Single-session AI (paste entire document into ChatGPT/Claude) | Context window limits mean the AI loses coherence partway through. Quality degrades silently. No stable identifiers for cross-referencing results back to source text. |
| Manual reading + spreadsheet | Scales linearly with human hours. Inconsistent across readers. No provenance — hard to trace an extracted field back to the exact paragraph that generated it. |
| Custom NLP/ML pipelines | Require data science expertise to build and maintain. Inflexible — changing the extraction schema means retraining or rewriting code. Not accessible to domain experts (lawyers, writers, researchers) who know what to extract but cannot build pipelines. |
| Document-level AI classification | Produces one label per document (e.g., "this contract is high risk"). Cannot locate *which clause* creates the risk or *which paragraph* states the holding. The granularity is wrong. |

---

## Section 3: Users

### Persona 1: Legal Researcher

**Who they are:** An academic or institutional researcher working with a large legal corpus — hundreds to tens of thousands of judicial opinions, statutes, or regulatory filings.

**Their goal:** Extract paragraph-level structured metadata (rhetorical function, citations with treatment, legal principles, entities, topic classification) from every document in the corpus to build a knowledge graph, run quantitative analysis, or support legal scholarship.

**Their context:** Already has case-level structured databases (e.g., SCDB, Shepard's, Fowler scores) but needs the paragraph layer that connects document-level metadata to specific text. Works with `.md` files or formats convertible to structured blocks. Comfortable defining extraction schemas in JSON. May run multiple schemas over the same corpus iteratively.

**Success for them:** Every paragraph in every document has stable, structured metadata — traceable to a specific `block_uid` — that can be queried, joined to existing databases, and composed into a knowledge graph. A new schema can be applied to the same corpus without re-uploading or re-processing the immutable blocks.

---

### Persona 2: Academic Writer

**Who they are:** A writer or editor working on a long-form document — a legal-academic manuscript, a dissertation, a policy report, or a book chapter — typically 20,000–100,000 words.

**Their goal:** Apply a consistent editorial or analytical standard to every paragraph of the manuscript independently, then reassemble the results in reading order. Tasks include prose editing against a style guide, narrative flow assessment, keyword extraction, or metadata labeling.

**Their context:** The manuscript is already in `.md` format (or convertible). The writer knows the editorial standard they want applied (e.g., Strunk's 18 rules, a house style guide) but cannot get consistent AI application across the full document in one session. Needs the revised text, editorial notes, and analytical summaries to be paragraph-aligned for review.

**Success for them:** The writer reviews results directly in the block viewer as blocks complete — revised text alongside the original, narrative summaries in reading order, key terms per paragraph. They can also export JSONL and extract three outputs by reading different fields in order: (1) a revised manuscript (concatenating `revised_block`), (2) a narrative sentence chain (reading `narrative_summary` in sequence), and (3) a keyword map grouped by section. All from one run, without manually splitting or reassembling anything.

---

### Persona 3: Contract Reviewer

**Who they are:** A general counsel, in-house lawyer, or contract manager who reviews commercial agreements — Master Service Agreements, SaaS agreements, licensing contracts, leases — before signing.

**Their goal:** Extract clause-level metadata from a long contract: obligations (who must do what, by when), risk flags (liability caps, indemnification triggers, auto-renewal traps), defined terms usage, internal cross-references, and deadlines.

**Their context:** Receives contracts as Word documents (`.docx`) or PDFs. The contract is 30–80 pages with 100–300 clauses. Needs to review multiple contracts per week. Each review currently takes 6–10 hours of senior associate time. The reviewer knows what to look for but needs a tool that applies the same checklist to every clause consistently. May not be comfortable writing JSON schemas directly — needs a wizard or template-based path to schema creation.

**Success for them:** The reviewer uploads a DOCX contract, selects a contract review template from the schema library (or creates one via the wizard), and watches the block viewer fill in as clauses are processed — obligations, risk flags, defined terms, cross-references, and deadlines appearing column by column. Each item traces back to the specific clause and page that generated it. The reviewer works entirely online without downloading files. A second, deeper schema (e.g., for indemnification analysis) can be applied to the same blocks without re-uploading.

---

## Section 4: Product Capabilities

### Core Capabilities

1. **Multi-Format Document Upload**
   - Users can upload documents in any supported format — Markdown, DOCX, PDF, PPTX, HTML, XLSX, CSV, images, and others — and the platform accepts and stores them with a deterministic source identity.

2. **Automatic Block Decomposition**
   - Users can upload a document and receive an ordered inventory of typed blocks (paragraphs, headings, list items, tables, footnotes, etc.) without manual splitting. Markdown files are parsed via mdast; all other formats are parsed via Docling. Each block has a stable identity, a normalized type, a provenance pointer back into the parsed representation, and the original text preserved verbatim.

3. **Custom Schema Creation**
   - Users can define extraction schemas specifying what metadata to extract from each block. The platform provides three paths to schema creation:
     - **Template library:** Users can browse a library of frequently used schema templates (contract review, prose editing, entity extraction, citation analysis, etc.), load one, and modify it to fit their document and goals.
     - **AI-assisted wizard:** Users can walk through a guided wizard that asks questions about their document type, extraction goals, and desired output fields — then generates a schema artifact with AI assistance. The wizard can examine uploaded document content and recommend schema structure.
     - **Direct JSON authoring:** Users comfortable with JSON can create or edit schema artifacts directly. Schemas can include field definitions with types and enums, instructions, reference material (e.g., a style guide, a signal taxonomy, a defined terms list), and any other context they want the AI to have.
   - All three paths produce the same underlying artifact: a JSON object with a `schema_ref` string. The platform stores schemas without interpreting their internal structure beyond this minimal validation.

4. **Schema Binding and AI Processing**
   - Users can bind a schema to a document (creating a "run"), select an AI model from the platform's integrated model options, and have the platform process each block independently against that schema. The platform compiles the schema's field definitions into a structured output specification, composes the schema's instructions and reference material into a prompt, and calls the selected model with constrained decoding — guaranteeing that every response conforms to the schema's field types and enum values. Processing scales with worker count — blocks are independent units of work with no collisions.
   - Users can select which AI model to use when creating a run. The platform tracks the model used per overlay, enabling users to compare results from different models on the same blocks and schema. Model selection is a platform-native decision, not an external infrastructure concern.

5. **In-Platform Block Viewer (Online Mode)**
   - Users can view blocks and their schema overlays directly in the web interface as a row-by-row table — without downloading anything. The left columns show immutable block data (index, type, content preview); the right columns show the schema overlay fields, dynamically shaped by the schema applied. A run selector switches which schema's results are displayed. As AI workers process blocks, rows update from pending to complete in real time. This is the primary experience for single-document use cases (contract review, manuscript editing, result inspection before schema refinement).

### Extended Capabilities

6. **Multi-Schema Overlay**
   - Users can apply multiple schemas to the same document without re-uploading or re-processing the immutable blocks. Each schema produces its own overlay and its own column set in the block viewer. The same blocks support N schemas via separate runs — the immutable substrate is stable throughout.

7. **Block Grouping**
   - Users can configure how blocks are grouped for display in the block viewer — viewing 5, 15, 25, or any user-defined number of blocks per visual page. Users can also group blocks by section (using heading blocks as delimiters) for a structural view. Block grouping is a display and navigation concern; it does not change the underlying per-block data model, `block_uid` assignments, or the canonical export shape. Group identity is deterministic: derived from `(conv_uid, grouping_strategy, range)`.

8. **Corpus-Scale Processing**
   - Users can upload thousands of documents, bind a schema to all of them, and process the resulting blocks concurrently. The platform handles the decomposition, work distribution, and export assembly. A 28,000-document corpus with 5 schemas produces ~2.1 million block evaluations — all parallelizable.

9. **Structured JSONL Export (Export Mode)**
   - Users can export results as JSONL (one JSON object per line, one line per block, ordered by reading position). Each exported record contains the immutable block envelope alongside the user-defined schema overlay. The export serializes the same data the block viewer displays — same join, different output format. This is the primary experience for corpus-scale downstream pipelines (DuckDB, Neo4j, custom scripts).

10. **Iterative Schema Refinement**
    - Users can run a broad schema, examine the results in the block viewer, design a deeper or more targeted schema, and run it on the same blocks. Each run produces a new overlay visible in the viewer and exportable as JSONL. The user refines their extraction strategy without re-ingesting anything.

11. **Model Comparison**
    - Users can run the same schema on the same blocks with different AI models, then compare the overlay columns side by side in the block viewer. Because every run tracks its model, users can evaluate which model produces the best results for their schema — and use that evidence to select a model for corpus-scale runs.

---

## Section 5: Use Cases

*(Distilled from the detailed use case illustrations in `docs/product-defining-v2.0/0207-defining-user-defined-schemas.md`. The companion document contains full schema artifacts, concrete JSON exports, and extended discussion for each use case.)*

### Use Case 1: Close Reading of a Legal Corpus

**Scenario:** A legal researcher has 28,000 US Supreme Court majority opinions (~420,000 paragraphs). Existing databases provide 55 case-level metadata columns but zero paragraph-level structured data. The researcher needs five fields extracted from every paragraph: rhetorical function, precedents cited, legal principle, key entities, and reasoning type.

**Journey:**
1. Researcher uploads 28,000 `.md` files (one per opinion).
2. Platform decomposes each into paragraph-level blocks via mdast (~420,000 blocks total).
3. Researcher creates a schema (`scotus_close_reading_v1`) defining the five fields with instructions and enum values.
4. Researcher binds the schema to all documents (28,000 runs).
5. AI workers process 420,000 blocks concurrently.
6. Researcher exports JSONL — each line is one paragraph with immutable metadata + five filled fields.

**Outcome:** Every paragraph in every opinion has stable, structured metadata. The researcher can query across the corpus ("show every paragraph classified as `holding` across all 28,000 opinions") and join block-level extractions to existing case-level databases via deterministic identifiers. A second schema can be applied later without re-uploading.

---

### Use Case 2: Editing a 39,000-Word Manuscript

**Scenario:** A writer has a legal-academic manuscript (~540 blocks) that needs paragraph-level prose editing against Strunk's 18 rules, narrative flow assessment, and keyword extraction. No single AI session can maintain consistent quality across 39,000 words.

**Journey:**
1. Writer uploads the manuscript (`.md`).
2. Platform decomposes into 540 blocks (490 paragraphs, 45 headings, etc.).
3. Writer creates a schema (`prose_edit_and_assess_v1`) with three fields — `revised_block`, `narrative_summary`, `key_terms` — and embeds the full 18-rule Strunk reference as `reference_material`.
4. Writer binds the schema and processes all blocks.
5. Writer exports JSONL.

**Outcome:** From one export, the writer extracts three outputs by reading different fields in order: (1) a revised manuscript (concatenating `revised_block`), (2) a narrative sentence chain for flow assessment (reading `narrative_summary` in sequence), and (3) a keyword map grouped by section. The 39,000-word manuscript is no harder than a 500-word essay — only the number of blocks changes.

---

### Use Case 3: Building a Knowledge Graph from a Legal Corpus

**Scenario:** The same legal researcher from Use Case 1 wants to build a paragraph-addressable knowledge graph with typed nodes (cases, principles, entities, statutes), typed edges (cites, follows, overrules, applies), and full provenance. The researcher already has substantial case-level infrastructure (29K cases in SCDB, 5.7M Shepard's citation edges, Fowler authority scores, Martin-Quinn ideology scores).

**Journey:**
1. Same 420,000 blocks from Use Case 1 (already ingested — no re-upload needed).
2. Researcher creates five layered schemas: structural classification, entity extraction, citation graph, rule/holding extraction, topic tagging.
3. Five schemas bound to 28,000 documents = 140,000 runs = ~2.1 million block evaluations.
4. AI workers process concurrently across all schemas.
5. Researcher exports five JSONL streams per document.
6. Post-export pipeline assembles the knowledge graph: deduplicate entities into nodes, resolve citations into edges, attach topic labels, compute cross-case links.

**Outcome:** A paragraph-addressable citation knowledge graph over the entire SCOTUS corpus — every node and edge traceable to a specific paragraph in a specific opinion. Block-level extractions join back to existing case-level databases via deterministic identifiers (the opinion's SHA-256 hash maps to `source_uid`, case IDs join to SCDB/Fowler/Shepard's). The KG assembly pipeline is downstream of the platform — the platform's job ends at structured JSONL export.

---

### Use Case 4: Reviewing a Commercial Contract (Non-Markdown Format)

**Scenario:** A general counsel receives a 45-page Master Service Agreement as a `.docx` file. The contract has ~214 blocks (headings, clauses, list items, tables). The general counsel needs obligations, risk flags, defined terms, cross-references, and deadlines extracted from every clause.

**Journey:**
1. General counsel uploads the `.docx` file.
2. Platform routes it through the Docling conversion pipeline (not mdast) and decomposes into 214 blocks with `docling_json_pointer` locators (including page numbers).
3. General counsel creates a schema (`contract_clause_review_v1`) with six fields and embeds the MSA's 40 defined terms as `reference_material`.
4. General counsel binds the schema and processes all blocks.
5. General counsel exports JSONL.

**Outcome:** Five aggregated outputs from one export: (1) obligation register grouped by party, (2) risk heat map sorted by severity, (3) defined terms usage index, (4) cross-reference graph between sections, (5) deadline and notice period tracker. Each item traces to a specific clause and page. A second, deeper schema (e.g., for indemnification analysis) can be run on the same blocks.

---

## Section 6: Success Criteria

### 6.1 Quantitative Metrics

| Metric | Target | Rationale |
|:--|:--|:--|
| Supported upload formats | All formats listed in the `source_type` enum (md, docx, pdf, pptx, html, xlsx, csv, image, and others) | The platform must handle the two ingestion tracks: mdast for Markdown, Docling for everything else. |
| Block decomposition accuracy | Every block in the exported inventory has a valid `block_type`, a correct `block_locator` pointing back to the parsed representation, and `block_content` matching the source text at that location | The immutable substrate must be trustworthy — downstream schema work depends on it. |
| Schema processing throughput | Linear scaling with worker count — doubling workers halves wall-clock time | Blocks are independent units of work. The architecture must not introduce bottlenecks that break this property. |
| Export conformance | 100% of exported JSONL records conform to the canonical two-key shape (`immutable` + `user_defined`) with all required fields present and all enum values drawn from the defined lists | The export is the contract. Non-conforming exports are bugs. |
| Multi-schema independence | Applying schema B to a document that already has schema A attached does not modify schema A's overlay or the immutable blocks | Multi-schema is a first-class requirement. Schemas must not interfere with each other. |

### 6.2 Qualitative Signals

- **Schema accessibility:** Non-technical domain experts (lawyers, contract reviewers, writers) can create schemas through template selection or the AI-assisted wizard without writing JSON. Technical users can author schemas directly. Both paths produce the same artifact.
- **Structural correctness guarantee:** Every AI response conforms to the schema's field types and enum values — enforced by the platform's structured output compilation, not by hoping the model follows instructions. Zero malformed responses at the database level.
- **Provenance trust:** Every extracted field in the export traces to a specific block with a stable identity, a locator pointing into the parsed representation, and the original text preserved verbatim. A user can always answer "where did this come from?" by following the provenance chain.
- **Online-first experience:** Users can review, inspect, and act on results directly in the block viewer without downloading files. The block viewer is the primary interface; JSONL export is the secondary interface for downstream pipelines.
- **Iterative refinement:** Users run a broad schema, examine results in the block viewer, create a more targeted schema, and run it on the same blocks — without re-uploading or waiting for re-ingestion. The feedback loop between schema design and result inspection is fast.

### 6.3 Definition of Done

The product is complete when:

- [ ] Users can upload documents in Markdown and at least three non-Markdown formats (DOCX, PDF, and one other) and receive a block inventory with correct types, locators, and content
- [ ] The block inventory conforms to the immutable field contract: deterministic `source_uid`, `conv_uid`, and `block_uid`; correct pairing rules between parsing tool, representation type, and locator type
- [ ] Users can create schemas via template selection, AI-assisted wizard, or direct JSON authoring — all producing valid opaque JSON artifacts with `schema_ref`
- [ ] Users can bind a schema to a document, select an AI model, and create a run that generates pending overlay rows for every block
- [ ] The platform compiles schema field definitions into structured output specifications and processes blocks with constrained decoding — guaranteeing type and enum conformance
- [ ] The platform tracks model identity per overlay row
- [ ] Users can view block results in the block viewer (online mode) with configurable block grouping, real-time status updates, and schema-derived dynamic columns
- [ ] Users can export JSONL conforming to the canonical output contract (two top-level keys, all fields present, ordered by `block_index`)
- [ ] Multiple schemas can be attached to the same document with independent runs and independent exports
- [ ] One schema can be applied across multiple documents in a corpus
- [ ] Users can compare results from different models on the same schema and blocks

---

## Section 7: Platform Boundary

The platform's core responsibility is the block infrastructure: ingest documents, decompose into immutable blocks, bind user-defined schemas, distribute to AI workers, and export structured JSONL. Everything beyond that boundary is achievable through API integrations with external services — not excluded from the product's reach, but not built into the platform itself.

### Platform-Native (What the Platform Builds)

The platform owns the pipeline from upload to structured output — both online and offline:

- Document upload and storage (with deterministic source identity)
- Block decomposition via mdast (Markdown) and Docling (all other formats)
- Schema creation: template library, AI-assisted wizard, and direct JSON authoring
- Schema storage and validation (opaque JSON + `schema_ref`)
- Schema-to-structured-output compilation: the platform reads the schema artifact's field definitions, compiles them into a structured output specification, composes the prompt from the schema's instructions and reference material, and calls the AI model with constrained decoding — guaranteeing that responses conform to the schema's types and enums
- Integrated AI model access: the platform provides access to multiple LLM APIs (OpenAI, Anthropic, Google, and others) as selectable model options. Users choose a model when creating a run. The platform tracks model identity per overlay row
- Run creation, work distribution, and overlay persistence
- Block viewer (online mode): the primary interface for reviewing results — blocks as rows, schema fields as columns, real-time status updates
- Block grouping: user-configurable display grouping (N blocks per page, section-delimited groups)
- Canonical JSONL export (offline mode): the contract for downstream pipelines
- Web interface for all of the above

### Achieved Through API Integration (What External Services Provide)

The platform's structured JSONL export and deterministic identifiers (`source_uid`, `conv_uid`, `block_uid`, `schema_uid`) create clean integration points. Each of the following is a downstream or adjacent service consuming or feeding the platform via API:

1. **Knowledge graph assembly** — Entity deduplication, edge resolution, graph storage, and query APIs are handled by external graph services (Neo4j, Amazon Neptune, or a custom pipeline over DuckDB). The platform provides the structured JSONL; the graph service consumes it. The join keys (`block_uid`, `normalized_us_cite`, `schema_ref`) are stable and deterministic — integration is mechanical.

2. **Advanced schema validation** — The platform validates opaque JSON + `schema_ref` and compiles field definitions for structured output. Richer validation beyond what the platform enforces (custom business rules, cross-field constraints) can be handled by an external validator service called during schema upload.

3. **Analytics and visualization** — Dashboard views, charting, statistical analysis over exported data are handled by external analytics platforms (DuckDB, BigQuery, Tableau, custom frontends). The JSONL export is the interface — structured, ordered, and joinable.

4. **Collaboration and workflow** — Multi-user review workflows (e.g., "assign this schema run to reviewer B for QA"), commenting, and approval chains are handled by external project management or workflow tools. The platform's API exposes runs, exports, and schema metadata for integration.

5. **Document source integrations** — Pulling documents from content management systems, cloud storage (S3, Google Drive, SharePoint), or case management databases for upload. The platform accepts files; the source integration fetches them.

### Knowledge Graph Integration via API

The platform's structured annotation output is architecturally suited to drive automated knowledge graph construction without manual graph modeling or custom ETL. This section describes the integration pattern in detail because knowledge graphs represent the highest-value downstream consumer of block-level structured data — and because the schema system's flexibility makes the platform a natural KG authoring tool even for users who never write a graph query.

#### Why Blocks Map Naturally to Graphs

A knowledge graph consists of three elements: entities (nodes), relationships (edges), and properties on both. The platform's per-block annotation output already produces these elements when the schema is designed with graph structure in mind. A citation extraction schema, for example, produces per block: a source entity (the case being read), a target entity (the case being cited), a relationship type (cites, distinguishes, overrules, follows), and properties on that relationship (treatment signal, legal principle, strength). The `block_uid` rides along as provenance on every node and edge — meaning every element in the resulting graph traces back to a specific paragraph in a specific document.

This is not a post-hoc transformation. The schema *is* the graph definition, expressed as extraction instructions rather than a graph query language. The user defines what to extract; the platform extracts it as structured JSON; the export connector maps the JSON fields to graph elements and pushes them to the graph database. No Cypher, no SPARQL, no graph modeling expertise required from the user.

#### Neo4j as Primary Graph Target

Neo4j implements the Labeled Property Graph (LPG) model: nodes carry one or more labels and key-value properties; relationships are directed, typed, and also carry properties. This model maps directly to the platform's annotation output shape:

- An annotation field designated as an **entity** becomes a Neo4j node. The field value becomes the node's primary property; the schema's field name or an explicit label mapping becomes the node label. Multiple entity fields in one schema produce multiple node types in the same graph.
- An annotation field designated as a **relationship** becomes a Neo4j directed edge. The relationship type comes from the field value (e.g., `"distinguishes"`) or from a fixed type defined in the schema. Source and target are determined by other fields in the same annotation record.
- All remaining annotation fields become **properties** on the relevant node or edge.
- The `block_uid` is attached as a property to every node and edge, preserving full provenance back to the source block.

Neo4j is schema-optional — nodes and edges can be created without predefining a graph schema. This aligns with the platform's opaque schema philosophy: different annotation schemas produce different node and edge types that coexist in the same Neo4j instance without conflicts. A citation schema creates `Case` nodes and `CITES` edges; an entity schema creates `Person`, `Statute`, and `Organization` nodes with `MENTIONS` edges; a topic schema adds labels to existing nodes. All three overlay the same graph, all traceable to specific blocks.

Neo4j also supports RDF ingestion via the Neosemantics (n10s) plugin, enabling integration with semantic web ecosystems and SPARQL endpoints when required. The platform's export connector targets the LPG model natively but does not preclude RDF-based consumers.

#### Graph-Aware Schema Design

To enable automated graph construction, schemas can include an optional `graph_mapping` section that tells the export connector how to interpret annotation fields as graph elements. This mapping is part of the schema artifact — not a separate configuration — so it travels with the schema through the template library, marketplace, and version history.

A graph-aware citation schema might define:
- `source_case` → Node (label: `Case`)
- `target_case` → Node (label: `Case`)
- `relationship_type` → Edge type (value-driven: `CITES`, `DISTINGUISHES`, `OVERRULES`)
- `treatment_signal` → Edge property
- `legal_principle` → Edge property
- `block_uid` → Provenance property on both nodes and edges

The export connector reads this mapping, iterates over the annotation JSONL, and issues Neo4j import API calls (or generates Cypher `MERGE` statements) that create or update the graph incrementally. Entity deduplication happens at the graph layer — `MERGE` on node identity properties ensures that the same case cited in 500 different paragraphs produces one node with 500 inbound edges, not 500 duplicate nodes.

#### Multi-Schema Graph Composition

The platform's multi-schema architecture composes naturally with graph construction. Each schema targeting the same corpus contributes a different layer to the same graph:

- Schema 1 (citation extraction) → `Case` nodes + `CITES`/`DISTINGUISHES`/`OVERRULES` edges
- Schema 2 (entity extraction) → `Person`, `Statute`, `Organization` nodes + `MENTIONS` edges
- Schema 3 (topic tagging) → Topic labels added to existing `Case` nodes
- Schema 4 (holding extraction) → `Principle` nodes + `ESTABLISHES` edges from `Case` nodes

All schemas run independently over the same immutable blocks. All produce independent JSONL exports. All feed the same Neo4j instance through the export connector. The resulting graph is richer than any single schema could produce — and every element traces back to a specific block via `block_uid`.

#### Alternative Graph Targets

While Neo4j is the primary target due to its LPG model alignment and ecosystem maturity, the export connector pattern supports alternative graph databases and formats:

- **Amazon Neptune** — Supports both LPG (via openCypher/Gremlin) and RDF (via SPARQL). The same annotation JSONL can target either model.
- **ArangoDB** — Multi-model database supporting graphs, documents, and key-value. The annotation JSONL maps to ArangoDB's document collections (nodes) and edge collections (relationships).
- **Custom graph pipelines** — Users with existing graph infrastructure can consume the JSONL export directly via the webhook connector or REST API, applying their own mapping logic. The platform's structured output and deterministic identifiers make this integration mechanical.
- **NetworkX / igraph (analytical)** — For users who need graph analytics without a persistent graph database, the JSONL export can be loaded directly into Python graph libraries for centrality analysis, community detection, or path computation.

The platform does not build or host the graph database. It produces the structured, provenance-rich data that graph databases consume. The integration is downstream, API-driven, and format-agnostic at the export layer.

### Schema-Driven Format Flexibility

The platform's annotation output is not limited to any single downstream format or consumer. Because schemas are opaque JSON artifacts whose field definitions are entirely user-controlled, the structured output from any annotation run can be shaped to match whatever format the downstream system requires.

The canonical export is JSONL — one JSON object per block, ordered by reading position. But the content of each JSON object is determined entirely by the schema. A schema designed for Neo4j ingestion produces graph-ready triples. A schema designed for CSV analysis produces flat key-value records that trivially convert to tabular format. A schema designed for vector enrichment produces embedding-ready text with structured metadata. A schema designed for compliance reporting produces fields that map directly to regulatory form fields.

This means the platform integrates with any system that consumes structured data in any common format — JSON, JSONL, CSV, TSV, XML, or any other serialization — because the schema controls what fields exist, what values they contain, and how they relate to each other. The export layer serializes; the schema layer defines the shape. Format conversion (JSONL to CSV, JSONL to XML, JSONL to graph triples) is mechanical once the schema defines the fields.

The implication is that the platform is not a "legal AI tool" or a "document annotation tool" in a narrow sense. It is a general-purpose structured extraction engine whose output shape is determined entirely by the user's schema. The same platform, the same blocks, the same processing pipeline can feed a Neo4j knowledge graph, a Pinecone vector store, a DuckDB analytics table, a compliance form, a reconstructed document, or a custom API — all depending on which schema the user defines and which export connector they activate.

### Architectural Principle

The platform is a pipeline layer, not a monolith. Its value is the block infrastructure — deterministic decomposition, stable identities, opaque schema overlay, integrated AI processing, and structured output (online and offline). External services plug in at well-defined API boundaries:

- **Upstream:** document sources feed the platform
- **Processing:** the platform integrates LLM APIs directly — users select models, the platform handles schema-to-prompt compilation and constrained decoding
- **Downstream:** graph DBs, analytics platforms, visualization tools, and workflow systems consume the export

This is the same architectural pattern as the Learning Commons KG: a data infrastructure (the KG repo with JSONL exports + API) loosely coupled to consuming applications (the evaluator repo with LLM chains). The platform provides the structured data layer; external services build on it.

### Future Platform-Native Extensions (Not This Version)

Future extensions are organized in tiers. Each tier builds on the previous without rearchitecting. The block remains the universal unit, the schema remains the instruction set, and the annotation run remains the execution model.

#### Tier 1 Extensions (Near-Term)

- **Schema marketplace** — A registry where users can browse, share, or fork schemas created by others. The schema system supports this architecturally (schemas are self-contained JSON artifacts with stable `schema_uid` identifiers), but the sharing UX is not in scope for v2.0. Implementation adds `visibility` (private/public/org), `description`, `tags`, `version`, and `author_id` columns to the schema table. Community contributions governed by RLS policies. Schema versioning uses a composite unique constraint on `(schema_ref, version)`.

- **Diff and comparison views** — Side-by-side comparison of two schema runs over the same blocks (e.g., comparing `scotus_structural_v1` vs. `scotus_structural_v2` outputs, or comparing the same schema run across two different models). Useful for schema refinement and model evaluation.

#### Tier 2: Schema Platform

- **Visual schema builder** — A form-based UI for defining schemas without writing JSON. Users define fields by selecting types (text, boolean, array, enum), writing per-field instruction prompts, and previewing the schema against a sample block via a dry-run Edge Function. The visual builder is a frontend that produces the same `schema_jsonb` a power user would upload as raw JSON — it does not create a separate schema format. This is the single biggest accessibility feature for non-technical users.

- **AI-assisted schema creation** — An intelligence layer on the visual builder where AI examines the user's uploaded document content and recommends schema structure — field definitions, instruction prompts, enum values, and reference material. Turns schema creation from a blank-page problem into a guided conversation. Reduces cold-start friction for users who know what they want to extract but not how to express it as a schema.

#### Tier 3: Integration Infrastructure

- **Export connectors** — Four export branches activated by run completion, all using `block_uid` as the universal join key:
  - *JSONL webhook:* POST annotated JSONL to a user-configured endpoint when `annotation_runs.status = 'complete'`.
  - *Document reconstruction:* An Edge Function assembles revised text from annotation overlays, ordered by `block_index`, and converts via Pandoc to `.docx`, `.pdf`, or `.html`.
  - *Knowledge graph ingest:* Reads annotation overlays for KG-oriented schemas, maps extracted fields to graph triples with `block_uid` provenance, and pushes to Neo4j or a graph API endpoint.
  - *Vector indexing:* Embeds `content_original` (optionally enriched with annotation signals) per block and pushes to pgvector, Pinecone, or Qdrant with `block_uid` as the vector ID.

- **Model adapters** — Users can swap the execution backend without changing the annotation contract. A `model_config` JSONB column on annotation runs stores provider, model name, and parameters. The worker reads this config at claim time. Local model support uses the same `FOR UPDATE SKIP LOCKED` work-claiming pattern. Multi-model comparison becomes native: same `doc_uid` + `schema_ref` with different `model_config` values produce separate runs whose results can be toggled in the block viewer.

- **Event system / webhooks** — External systems subscribe to platform events (run complete, block failed, document ingested) via webhook registration. Enables workflow integration — notification, orchestration, and downstream triggering — without requiring users to poll the platform or build against the UI.

- **REST API** — Programmatic access for document upload, run triggering, status polling, and result retrieval. Enables headless integration for users who want to embed the platform's block-and-annotate pipeline into existing workflows without touching the web interface.

- **Template-based generation (reverse flow)** — Users upload a template document structure, the platform decomposes it into a block inventory, the user defines a generation schema specifying what content each block should contain, and AI generates content per block. The user reviews generated blocks in the block viewer, then the platform reconstructs the completed document. Use cases include consulting report generation, compliance form completion, document localization, and technical documentation from specs.

#### Runtime Quality Infrastructure

- **Dynamic Pydantic modeling** — At runtime, when a worker claims a block for processing, the platform dynamically generates a Pydantic model from the user's opaque schema field definitions. This model enforces structured output from the LLM — validating field types, enum constraints, and required fields — without the user ever seeing or interacting with the validation layer. The user uploads an opaque JSON schema; the platform silently converts it to a typed contract at execution time. The Pydantic model serializes into both OpenAI's structured output format and Anthropic's tool-use format, making it provider-agnostic. This is an internal quality mechanism, not a user-facing feature — it ensures that schema flexibility at the authoring layer does not sacrifice output reliability at the execution layer.

#### Blocks as RAG Substrate

- **Vector pipeline integration** — The block architecture provides a superior alternative to arbitrary token-window chunking in retrieval-augmented generation (RAG) pipelines. Traditional RAG chunking produces disposable text fragments with no identity, no provenance, and metadata bolted on after the fact. Block-based RAG produces semantic units (paragraphs, headings, list items) with permanent identity (`block_uid`), hierarchical context (`section_path`), and rich annotation metadata defined *before* embedding — not after. Users can define annotation schemas specifically for retrieval enrichment (topics, entities, content type, complexity, standalone score, summary, keywords), run them over any corpus, and export the enriched blocks to a vector store where every field becomes filterable metadata. Re-embedding is trivial because the blocks are stable — only the embeddings change, not the units. Retrieved blocks carry full provenance back to the source document and location. This pattern positions the platform as the structured data layer upstream of any vector store, not a competitor to one.

---

## Writing Guidelines Compliance Note

This PRD follows the template's writing guidelines:
1. **No implementation language** — Capabilities describe what users can do, not how the system is built internally.
2. **User-centric framing** — Every capability starts with "Users can..."
3. **Concrete examples** — Use cases reference specific documents, schemas, and outputs from the companion illustrations document.
4. **Testable criteria** — Success metrics in Section 6 are observable and verifiable.
5. **Vision, not roadmap** — This document describes the destination. The technical specification (`0207-prd-tech-spec-doc2.md`) describes the architecture. Implementation sequencing is separate.
