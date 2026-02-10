# Landing Page Copy — Extracted from Specs, Rewritten for Marketing

**Date:** 2026-02-09
**Source material:** PRD v2.0, Tech Spec v3.0, Use Cases UC1-4, Assessment feedback
**Purpose:** Ready-to-use text/copy blocks for non-auth pages (landing, features, use cases, how it works)

---

## Hero Section

### Headline Options (pick one)

**Option A — Problem → Solution:**
> Turn documents into structured knowledge — paragraph by paragraph, at any scale.

**Option B — Capability:**
> The document intelligence platform that extracts what you need from every paragraph.

**Option C — Speed + Scale (Supabase-style):**
> Structure a contract in minutes. Process a 28,000-document corpus overnight.

**Option D — Frustration + Relief:**
> Your documents have answers buried in paragraphs. We pull them out — structured, traceable, and ready to use.

### Subheadline

> Upload any document. The platform decomposes it into blocks — paragraphs, headings, clauses, tables — each with a stable identity. Define what you want extracted. AI processes every block against your schema independently. Watch structured results fill in, column by column, in real time.

### Primary CTA
> **Get Started Free**

### Secondary CTA
> **See How It Works** *(scrolls to How It Works section)*

---

## Proof Strip (Social Proof / Credibility)

> Designed for legal researchers, academic writers, contract reviewers, and knowledge engineers working with documents from 1 page to 28,000.

*(When real users exist, replace with client logos or a stat like "Processing 2.1M blocks across 5 schemas")*

---

## The Problem (Why This Exists)

### Section Headline
> Documents hold structured knowledge. Existing tools can't reach it.

### Three Pain Points (feature cards or column layout)

**1. AI can't handle long documents consistently**
> A 39,000-word manuscript or 45-page contract exceeds what any AI session can process at consistent quality. The model shortcuts, loses context, skips sections. You've tried pasting the whole thing into ChatGPT. It didn't work.

**2. Document-level metadata misses where the value lives**
> Legal databases classify an entire case as "about judicial review." They can't tell you which paragraph articulates the holding, which paragraphs cite which precedents, or what legal principle is stated in paragraph 12. The gap between document-level labels and paragraph-level understanding is where the real insight lives.

**3. Manual extraction doesn't scale**
> Extracting structured data from 420,000 paragraphs across 28,000 documents is thousands of hours of expert reading. Reviewing a 45-page contract clause-by-clause for obligations, risk flags, and deadlines takes 6-10 hours per contract. The work isn't conceptually hard — it's voluminous.

---

## How It Works (Step-by-step)

### Section Headline
> From raw document to structured output in four steps.

**Step 1 — Upload**
> Drop in any document — Markdown, Word, PDF. The platform accepts it, stores it with a cryptographic identity, and automatically decomposes it into ordered, typed blocks: paragraphs, headings, list items, tables, footnotes. Every block gets a stable ID that never changes.

**Step 2 — Define Your Schema**
> Tell the platform what to extract. Browse the template library, walk through the AI-assisted wizard, or write your own schema in JSON. Define the fields, types, enums, and instructions. The schema is your extraction specification — it applies identically to every block.

**Step 3 — Process**
> Bind your schema to the document and select an AI model. The platform processes every block independently — no context window limits, no quality degradation on paragraph 400. Blocks are parallel units of work. A 28,000-document corpus with 5 schemas produces 2.1 million block evaluations, all running concurrently.

**Step 4 — Use the Results**
> Watch structured data populate your block viewer in real time — columns filling in as each block completes. Filter, sort, inspect. Export as JSONL for downstream pipelines. Or push directly to Neo4j, DuckDB, or a webhook endpoint. Every extracted field traces back to the exact paragraph that produced it.

---

## Core Capabilities (Feature Grid)

### Section Headline
> Everything you need to extract structured knowledge from documents.

**Multi-Format Ingestion**
> Markdown, DOCX, PDF, and more. Markdown is parsed via mdast for precise structural fidelity. Everything else goes through Docling — an industrial document conversion engine that preserves layout, tables, and page structure. Every format produces the same block inventory.

**Automatic Block Decomposition**
> Documents are split into their natural units — paragraphs, headings, list items, tables, footnotes, code blocks. Each block is typed, ordered, and linked back to its exact position in the parsed document. No manual splitting. No arbitrary chunking.

**Custom Extraction Schemas**
> Define exactly what you want extracted from each block — rhetorical classification, entity extraction, risk flags, editorial assessments, citation graphs, anything. Schemas are flexible JSON artifacts. Three creation paths: templates for common tasks, an AI-assisted wizard for guided setup, and direct JSON authoring for power users.

**Integrated AI Processing**
> Select from multiple LLM providers — OpenAI, Anthropic, Google, and others. The platform compiles your schema into a structured output specification with constrained decoding. Every AI response is guaranteed to conform to your field types and enum values. Zero malformed outputs.

**Real-Time Block Viewer**
> Your primary workspace. Blocks as rows, schema fields as columns. Immutable data pinned on the left; extraction results scrolling on the right. Results appear as each block completes — no waiting for the full run to finish. Filter by status, sort by any field, expand rows for detail.

**Multi-Schema Overlay**
> Apply different schemas to the same document without re-uploading or re-processing. Each schema produces its own column set. Compare a structural classification alongside an entity extraction alongside a citation analysis — all on the same blocks, all independent, all composable.

**Corpus-Scale Processing**
> Upload thousands of documents. Bind one schema across all of them. The platform handles decomposition, work distribution, and export assembly. Blocks are independent units of work — processing scales linearly with worker count.

**Deterministic Identity & Provenance**
> Every block has a stable, content-derived identity. Every extracted field traces back to a specific paragraph in a specific document via a provenance chain: block ID → document → source file. Identities are deterministic — re-upload the same file, get the same IDs. Join block-level extractions to existing databases via cryptographic keys.

---

## Use Cases

### Section Headline
> Built for anyone who needs structured data from unstructured documents.

---

### Use Case 1: Legal Research at Scale

**Card headline:** Paragraph-Level Intelligence Across Entire Legal Corpora

**Description:**
> A legal researcher has 28,000 Supreme Court opinions. Existing databases provide 55 case-level metadata columns but zero paragraph-level data. Upload the corpus. Define a schema for rhetorical function, precedents cited, legal principles, key entities, and reasoning type. The platform processes 420,000 paragraphs concurrently. The result: every paragraph in every opinion has structured, queryable metadata — traceable to its exact location. Join to existing case-level databases via deterministic identifiers. Apply additional schemas without re-uploading.

**Stat callout:**
> 28,000 documents. 420,000 blocks. 5 extraction fields per block. One platform.

---

### Use Case 2: Manuscript Editing

**Card headline:** Consistent, Paragraph-Level Editing for Long-Form Writing

**Description:**
> A 39,000-word legal-academic manuscript needs paragraph-level prose editing against Strunk's 18 rules, narrative flow assessment, and keyword extraction. No single AI session maintains quality across that length. Upload the manuscript. Define a schema embedding the full style guide as reference material. The platform processes each paragraph independently at consistent quality. From one run, extract three outputs: a revised manuscript, a narrative flow chain, and a keyword map — all paragraph-aligned and in reading order.

**Stat callout:**
> 39,000 words. 540 blocks. 18 editorial rules applied consistently to every paragraph.

---

### Use Case 3: Knowledge Graph Construction

**Card headline:** From Documents to Knowledge Graphs — Without Writing Graph Queries

**Description:**
> The same legal corpus from Use Case 1 feeds a paragraph-addressable knowledge graph. Define five layered schemas: structural classification, entity extraction, citation graph, rule extraction, topic tagging. Each schema produces its own JSONL export. A downstream connector maps extracted fields to Neo4j nodes and edges — cases, principles, statutes, organizations — all with provenance tracing every node and edge to the specific paragraph that produced it. No Cypher, no SPARQL, no graph modeling expertise required.

**Stat callout:**
> 5 schemas. 2.1 million block evaluations. One knowledge graph with full provenance.

---

### Use Case 4: Contract Review

**Card headline:** Clause-Level Intelligence for Commercial Agreements

**Description:**
> A general counsel receives a 45-page Master Service Agreement as a Word document. Upload the DOCX. The platform routes it through the Docling pipeline and decomposes it into 214 clauses with page-level locators. Apply a contract review schema extracting obligations, risk flags, defined terms, cross-references, and deadlines. Watch the block viewer fill in clause by clause. From one run: an obligation register grouped by party, a risk heat map sorted by severity, a defined terms index, a cross-reference graph, and a deadline tracker — each item linked to its source clause and page.

**Stat callout:**
> 45 pages. 214 clauses. 6 extraction fields. 5 aggregated outputs.

---

## What Makes This Different (Differentiator Section)

### Section Headline
> Not another AI wrapper. A structured extraction engine.

**Block-Level, Not Document-Level**
> Most AI tools process entire documents as a single unit, producing one summary or classification. This platform operates at the paragraph level — every block is processed independently against a consistent standard, then composed back into something more useful than the original document.

**Schema-Driven, Not Prompt-Driven**
> You don't write a prompt and hope for the best. You define a typed schema with field definitions, enums, and instructions. The platform compiles it into a structured output specification with constrained decoding. Every response conforms to your schema's types — guaranteed, not hoped for.

**Deterministic, Not Disposable**
> Every block has a cryptographic identity derived from its content. Re-upload the same file, get the same block IDs. Run a new schema on existing blocks without re-processing. Join block-level extractions to external databases via stable keys. Your data infrastructure is permanent, not session-bound.

**Online-First, Not Export-First**
> Results populate in your browser as each block completes — not as a file download after the run finishes. The block viewer is the primary experience. JSONL export exists for downstream pipelines, but the web interface is where you work.

**Format-Agnostic Output**
> The platform's output shape is controlled entirely by your schema. Design a schema for Neo4j and get graph-ready triples. Design one for compliance and get regulatory form fields. Design one for vector search and get embedding-ready records. Same platform, same blocks, different schemas, different downstream targets.

---

## Integration Section

### Section Headline
> Structured output goes wherever you need it.

**Neo4j**
> Push overlay data directly to a Neo4j graph database. Schemas with a `graph_mapping` section auto-map fields to nodes and edges. Every element carries `block_uid` provenance.

**DuckDB / Parquet**
> Export structured data as Parquet for analytical queries. Block-level extractions become first-class analytical records — filterable, joinable, aggregatable.

**Webhook**
> POST annotated JSONL to any endpoint when a run completes. Trigger downstream workflows, feed custom pipelines, or push to internal systems.

**JSONL Export**
> The canonical export format. One JSON object per block, ordered by reading position. Each record: immutable block envelope + user-defined schema overlay. The formal contract for any downstream consumer.

---

## Closing CTA

### Headline
> Stop reading documents. Start extracting knowledge.

### Subheadline
> Upload your first document, define a schema, and watch structured results appear — block by block.

### CTA Button
> **Get Started Free**

---

## FAQ Candidates

**What document formats are supported?**
> Markdown (.md), Microsoft Word (.docx), PDF (.pdf), and more. Markdown is parsed via mdast for precise structural fidelity. All other formats are processed through Docling, an industrial document conversion engine.

**What does "block" mean?**
> A block is a natural structural unit of a document — a paragraph, heading, list item, table, footnote, or code block. The platform decomposes every document into an ordered inventory of typed blocks, each with a stable identity and a provenance pointer back to its exact location in the source.

**What is a schema?**
> A schema defines what you want extracted from each block. It specifies field names, types (string, boolean, enum, array, number), instructions for the AI, and optional reference material (style guides, taxonomies, defined terms lists). The platform uses your schema to generate a structured output specification that the AI follows exactly.

**How is this different from ChatGPT or Claude?**
> ChatGPT and Claude process your document in a single session. When the document is long, quality degrades — the model loses context, applies standards inconsistently, or skips sections. This platform splits the document into independent blocks and processes each one separately against a consistent schema. The result is uniform quality from paragraph 1 to paragraph 10,000.

**Can I use my own AI model?**
> The platform integrates multiple LLM providers (OpenAI, Anthropic, Google). You select a model when creating a run. You can run the same schema with different models and compare results side by side. Model selection is tracked per block, so you always know which model produced which result.

**Is my data private?**
> Documents are stored in your project with row-level security. Your files, schemas, and extraction results are not shared with other users or used for model training.

**Can I try it without signing up?**
> *(Depends on your auth/freemium strategy — placeholder for now)*

---

## Naming Note

The PRD header says "BlockData v2.0 (name change planned)." If you're considering alternatives, here are naming directions derived from the product's actual identity:

| Direction | Examples | Rationale |
|---|---|---|
| **Block metaphor** | Blockwise, BlockForge, Blocklayer | The block is the universal unit — everything flows through it |
| **Extraction metaphor** | Extracta, Distill, Prism | The core action is extracting structured knowledge from text |
| **Schema metaphor** | SchemaFlow, Schemata, Overlayer | Schemas are the user's primary creative artifact |
| **Document intelligence** | DocParse, Stratum, Substrata | Layers of meaning extracted from document substrate |
| **Graph destination** | GraphSeed, Provenance, Tracepoint | Nods to the KG construction end-state |

The strongest names probably combine the mechanism (blocks, schemas) with the outcome (knowledge, structure, graphs). "BlockData" is accurate but sounds like a Markdown annotation utility — underselling the multi-format, multi-schema, corpus-scale, graph-construction platform it actually is.
