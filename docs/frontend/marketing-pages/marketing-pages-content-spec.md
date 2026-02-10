# Marketing Pages — Content & Layout Specification

**Platform:** BlockData
**Date:** 2026-02-09
**Audience:** Designer responsible for the redesign of the four public marketing pages
**Scope:** Content structure, section ordering, layout patterns, and cross-page navigation — not visual design

---

## Current State & Assessment

Four non-auth marketing pages exist under `MarketingLayout` (sticky `PublicNav` + full-width content area):

| Page | Route | Current State |
|---|---|---|
| Landing | `/` | Decent structure, but messaging is extraction-only. Misses the revision and combined tracks entirely. Hero right-side panel is too implementation-focused for a first visit. |
| How It Works | `/how-it-works` | Thin. Repeats the 4-step cards from Landing plus 3 generic benefit cards. Doesn't explain the staging/confirm flow, parallel processing, or what differentiates this from "chat with a PDF." |
| Use Cases | `/use-cases` | Good structure but only 2 featured + 2 secondary use cases. No revision-track or combined-track examples. No connection to downstream integration value. |
| Integrations | `/integrations` | Weakest page. A JSONL code block and 3 connector cards. Doesn't explain file-based pipelines, export format options, or the full downstream value story. |

### Content Gaps Across All Pages

These are absent from every current page and must be addressed in the redesign:

1. **The revision track** — Schemas can instruct AI to produce revised content, not just metadata. This is a core use case and the original motivation for the platform.
2. **The combined track** — Schemas can instruct AI to both revise content and add metadata about the revision. Source → revision rules → revised content → metadata on revised content.
3. **The staging/confirm flow** — AI writes to a staging column. Humans review, edit, and confirm before anything reaches the export boundary. This is the quality gate and a key differentiator.
4. **Parallel processing made visceral** — 20 concurrent workers processing 5,000 blocks in minutes, not hours. The user watches the grid fill in real time.
5. **Provenance and traceability** — Every output record traces to its source document, conversion method, and block identity. This matters for compliance, auditing, and dataset trust.
6. **Downstream value** — Fine-tuning datasets, evaluation benchmarks, vector stores, knowledge graphs, analytical exports. The platform produces structured data; everything downstream consumes it.

---

## Page Architecture

The four pages form a natural information funnel. Each page answers a different question, and the visitor can enter at any level:

```
Landing ──→ "What is this? Why should I care?"  (hook, orient, convert)
   ↓
How It Works ──→ "How does it actually work?"  (mechanism, differentiation)
   ↓
Use Cases ──→ "What can I do with it?"  (applications, identification)
   ↓
Integrations ──→ "Where does the output go?"  (downstream value, ecosystem)
```

Every page ends with a conversion CTA. Cross-links between pages are embedded in section footers (not just nav).

---

## Page 1: Landing (`/`)

**Job:** Orient the visitor in 10 seconds. Establish the problem, show the solution shape, create enough interest to explore further or sign up.

### Section 1 — Hero (split layout: text left, visual right)

**Left side:**
- Badge: "Document Intelligence Platform" (keep)
- Headline: Lead with the problem, not the product. Something that names the pain: documents contain structured knowledge trapped in unstructured paragraphs, and existing tools lose quality at scale.
- Subheadline: The solution in one sentence — upload documents, define what you want (metadata, revisions, or both), AI processes every block independently, you review and export.
- Two CTAs: primary "Get started free" → `/register`, secondary "How it works" → `/how-it-works`

**Right side:**
Replace the current "What you'll see" implementation-detail panel with something that shows the transformation visually. Options for the designer:
- A before/after: raw paragraph on the left, structured output (metadata fields filled in, or revised text) on the right
- A simplified pipeline visual: document → blocks → schema columns → export
- An animated or static mock of the grid with overlay columns filling in

**Layout:** `MarketingSplitSection` (existing component, works well for this)

### Section 2 — The Three Tracks (full-width, alternating background)

This is new and critical. Visitors need to understand that BlockData does three things, not one.

**Section header:** Something like "One platform. Three ways to work."

**Three cards or columns, equal weight:**

| Track | Short Name | One-Line Description | Concrete Example |
|---|---|---|---|
| Metadata Enrichment | **Enrich** | AI analyzes each block and adds structured labels without changing the source content. | Classify every paragraph's rhetorical function. Extract cited authorities. Tag topics. |
| Content Revision | **Revise** | AI rewrites each block according to your rules. Reassemble the confirmed blocks into a revised document. | Rewrite a 200-page manual to plain language. Update 77 specs to match a new style guide. |
| Combined | **Revise + Enrich** | AI revises the content and produces metadata about the revision. You get both the revised document and a structured dataset. | Simplify legal text to 6th-grade reading level, then tag each revision with what changed and why. |

**Layout:** 3-column grid (collapses to stack on mobile). Each card should have a short heading, a one-sentence description, and a concrete example. No code. No schema JSON. This is for comprehension, not implementation.

### Section 3 — How It Works (summary) (alternating background)

Keep the 4-step cards, but revise the copy:

| Step | Current Copy | Revised Direction |
|---|---|---|
| 01 Upload | "Drop in any document..." | Fine as-is. Emphasize multi-format and multi-file. |
| 02 Define Your Schema | "Tell the platform what to extract..." | Revise: "Tell the platform what to do — extract metadata, revise content, or both. Your schema defines the fields and instructions." |
| 03 Process | "AI processes every block independently..." | Add: "Concurrent workers process blocks in parallel. A 5,000-block project finishes in minutes, not hours." |
| 04 Review & Export | Current step is "Use the Results" | Rename to "Review & Export." Emphasize the staging/confirm flow: "AI results land in a staging column. You review, edit, and confirm before anything exports." |

**Footer link:** "See the full workflow →" `/how-it-works`

### Section 4 — Use Cases (teaser) (no background)

Keep the current 2-card preview but add a third card for the revision track. Three cards max — this is a teaser, not the full page.

| Card | Track | One-liner |
|---|---|---|
| Long document review | Revision or combined | Work through a 50,000-word document paragraph by paragraph at consistent quality. |
| Corpus → structured knowledge | Enrichment | Turn 77 documents into a structured, searchable dataset with one schema. |
| Contract review + compliance | Combined | Extract obligations and risk flags clause by clause, with full traceability. |

**Footer link:** "Explore all use cases →" `/use-cases`

### Section 5 — Capabilities (alternating background)

Keep the 6-capability grid but revise two items and add one:

| Capability | Current | Revised Direction |
|---|---|---|
| Multi-Format Ingestion | Fine | Keep |
| Schema-First Extraction | Extraction-only framing | Rename to "Schema-Driven Processing" — covers extraction, revision, and combined |
| Block-Level Parallelism | Fine | Keep, but add concrete number: "20 workers, 5,000 blocks, under 15 minutes" |
| Realtime Working Surface | Fine | Keep |
| Deterministic Identity | Fine | Keep |
| Exports + Integrations | Fine | Keep |
| **NEW: Human-in-the-Loop Review** | — | "AI writes to staging. You review, edit, and confirm. Nothing reaches your export without your approval." |

**Footer link:** "See integrations →" `/integrations`

### Section 6 — Final CTA (centered, full-width)

Keep the current bottom CTA section. Revise copy to reference all three tracks: "Extract metadata. Revise content. Build datasets you can trust."

### Section 7 — Footer

Keep the minimal footer. Consider adding links to `/how-it-works`, `/use-cases`, `/integrations` for SEO and navigation redundancy.

---

## Page 2: How It Works (`/how-it-works`)

**Job:** Explain the mechanism in enough detail that a technical evaluator understands the differentiation. This is the page someone reads when they're deciding whether to try it.

### Section 1 — Page Header (centered)

- Headline: Something that names the core insight — documents are processed at block level, not document level, which eliminates context window limits and quality degradation.
- Subheadline: 2-3 sentences expanding on why block-level processing matters.

### Section 2 — The Pipeline (full-width, visual + text)

A linear pipeline visualization with 6 stages. This should be the defining visual of the page — a horizontal or vertical flow that the visitor's eye follows through the entire lifecycle:

```
Upload → Decompose → Define Schema → Process → Review & Confirm → Export
```

Each stage gets a short description (2-3 sentences). The designer should make this visual, not just text cards.

| Stage | Description |
|---|---|
| **Upload** | Drop in documents — Markdown, Word, PDF, plain text. Multiple files at once. The platform handles format conversion. |
| **Decompose** | Every document is split into ordered, typed blocks (paragraphs, headings, tables, code, lists). Each block gets a stable identity hash. Re-upload the same file → same block IDs. |
| **Define Schema** | Write a JSON schema describing what you want per block. Metadata fields, revision instructions, or both. The schema includes prompt configuration that tells the AI exactly how to process each block. |
| **Process** | Concurrent AI workers claim blocks atomically and process them in parallel. Each block is independent — paragraph 1 and paragraph 4,000 get identical treatment. No drift, no "lost in the middle." |
| **Review & Confirm** | AI results land in a staging column. You see them in the grid, edit inline if needed, and confirm per-block or in bulk. Nothing reaches the export boundary without human confirmation. |
| **Export** | Confirmed results export as canonical JSONL (one record per block, full provenance). Also available as CSV or Parquet. Push to Neo4j, webhook, or object storage. For revision schemas, reconstruct the confirmed blocks into a complete revised document. |

### Section 3 — The Three Schema Tracks (alternating background)

Expanded version of what's on the landing page. Each track gets its own subsection with:

1. **What it does** (1-2 sentences)
2. **Example schema fields** (show 3-4 field names, not full JSON — e.g., "rhetorical_function (enum), cited_authorities (array), confidence (number)")
3. **What the output looks like** (1 sentence describing the export artifact)
4. **When to use it** (1-2 sentences)

**Track A: Metadata Enrichment**
- Schema adds structured labels to source content without modifying it.
- Output: JSONL where each block carries the original content plus metadata fields.
- Use when: You need to classify, tag, extract entities, or build analytical datasets from existing documents.

**Track B: Content Revision**
- Schema instructs AI to rewrite each block according to rules. The schema includes a `revised_content` field.
- Output: Confirmed revised blocks → reassembled into a complete revised document. Plus JSONL with both original and revised content for audit.
- Use when: You need to transform documents at scale — plain language rewriting, style guide compliance, translation, simplification.

**Track C: Combined (Revision + Enrichment)**
- Schema instructs AI to both revise and annotate. Source → revision rules → revised content → metadata about the revision.
- Output: Revised document + structured dataset describing every transformation decision.
- Use when: You need the revised document AND you need to understand/audit/analyze the revisions at block level.

### Section 4 — Why Block-Level Processing (alternating background)

This is the differentiation section. Explain the core architectural insight:

**The problem with document-level AI:**
- Context windows have limits. A 200-page document exceeds them.
- Quality degrades over length. Paragraph 400 gets worse treatment than paragraph 4.
- You can't trace outputs back to specific source paragraphs.
- You can't process documents in parallel.

**How BlockData solves this:**
- Each block is processed independently with identical instructions.
- Blocks run in parallel — 20 workers on 5,000 blocks finishes in minutes.
- Every output traces to a specific block with a stable identity.
- The staging/confirm flow means a human reviews every result before export.

Consider a comparison table or side-by-side visual:

| | Document-level AI | BlockData |
|---|---|---|
| 200-page document | One prompt, one pass, quality degrades | 800 blocks, each processed independently |
| Traceability | "The model said..." | Block 247, paragraph 3 of section 4.2 |
| Parallelism | Sequential | 20 concurrent workers |
| Human review | Read the whole output | Per-block staging, inline editing, bulk confirm |
| Scale | 1 document per session | 77 documents, 5,000+ blocks, one project |

### Section 5 — The Grid (screenshot or mock)

Show what the user actually sees. A mock or annotated screenshot of the AG Grid with:
- Immutable columns (block index, type, content)
- Schema overlay columns (filled with metadata or revised content)
- Status indicators (staged vs. confirmed)
- Toolbar (schema selector, export, view toggle)

This is the "aha" moment for a visual thinker. The grid makes the abstraction concrete.

### Section 6 — CTA

"Ready to try it on a real document?" → `/register`

---

## Page 3: Use Cases (`/use-cases`)

**Job:** Help the visitor identify with a specific scenario. "That's exactly my problem." The use cases should span all three tracks and a range of domains.

### Section 1 — Page Header (centered)

- Headline: Frame around the failure mode of existing tools — these are use cases that break normal "chat with a PDF" workflows.
- Subheadline: When you need consistent, schema-constrained output across thousands of paragraphs.

### Section 2 — Featured Use Cases (alternating background, full-width cards)

Expand from 2 to 5-6 featured use cases. Each gets a full card with:

1. **Title** — Problem-first, not feature-first
2. **Track badge** — "Enrichment" / "Revision" / "Combined" (small badge, helps the visitor pattern-match)
3. **Scenario** — 2-3 sentences describing the situation and pain
4. **How BlockData handles it** — 2-3 sentences describing the workflow
5. **Example schema fields** — 3-5 field names (not full JSON), showing what the schema extracts or revises
6. **What you get** — 1 sentence describing the output artifact
7. **Where it goes** — 1 sentence on downstream use (export, integration, reconstruction)

**Featured use cases:**

| # | Title | Track | Domain |
|---|---|---|---|
| 1 | Work through a long document at consistent quality | Revision or Combined | Writing, editing, technical docs |
| 2 | Turn a document collection into structured knowledge | Enrichment | Research, knowledge management |
| 3 | Contract review with compliance metadata | Combined | Legal, procurement |
| 4 | Build training datasets from expert-reviewed annotations | Enrichment | ML/AI, research |
| 5 | Batch document transformation | Revision | Operations, compliance, localization |
| 6 | Legal corpus analysis at scale | Enrichment | Legal research, litigation support |

**Layout:** Full-width stacked cards, each card using a consistent internal layout. The existing card structure (icon + title + scenario + how + examples + result) works — expand it to cover all 6.

### Section 3 — Secondary Use Cases (grid)

Shorter cards for additional use cases that don't need the full treatment:

| Title | Track | One-liner + stat |
|---|---|---|
| Thesis/dissertation review | Revision | 80,000 words. Every paragraph checked against your committee's standards. |
| Policy document harmonization | Combined | 30 policy documents revised to match a unified template, with change tracking. |
| Research paper annotation | Enrichment | Tag methodology, findings, limitations, and cited works across 200 papers. |
| RFP response preparation | Combined | Extract requirements from RFP, draft responses per section, tag compliance status. |

**Layout:** 2-column grid of compact cards (existing pattern works).

### Section 4 — CTA

"Try it on your own documents" → `/register`

---

## Page 4: Integrations (`/integrations`)

**Job:** Show that BlockData's output is useful beyond the platform itself. This is the page for the visitor who's already interested and wants to know how the output fits into their stack.

### Section 1 — Page Header (centered)

- Headline: Integrations start with a stable export contract.
- Subheadline: Once overlays are confirmed, the platform produces canonical JSONL — one record per block, ordered, traceable, schema-conformant. Everything downstream consumes this.

### Section 2 — The Export Contract (alternating background)

Show the canonical JSONL shape. This is the one place where showing a code block is appropriate — it's the API contract.

```json
{
  "immutable": {
    "source_upload": { "source_uid": "...", "filename": "brief.docx" },
    "conversion": { "conv_uid": "...", "conv_parsing_tool": "docling" },
    "block": { "block_uid": "...", "block_type": "paragraph", "block_content": "..." }
  },
  "user_defined": {
    "schema_ref": "scotus_close_reading_v1",
    "data": { "rhetorical_function": "holding", "cited_authorities": ["..."] }
  }
}
```

Below the code block, explain the two sections briefly:
- **Immutable:** The block's identity and provenance. Same block, same hash, every time. This is what makes outputs joinable, auditable, and reproducible.
- **User-defined:** The schema-driven overlay. Whatever fields your schema defines, confirmed by a human, appear here.

### Section 3 — Export Formats (3-column grid)

Three format cards, each explaining when and why:

| Format | When to Use | Details |
|---|---|---|
| **JSONL** | ML pipelines, fine-tuning, evaluation sets, webhooks, inter-system transfer | Canonical format. One record per line. Preserves nested structure. Streaming-friendly. |
| **CSV** | Analyst handoff, spreadsheet review, quick exploration | Flat. Universal. Overlay fields become columns. Loses nesting — best for simple schemas. |
| **Parquet** | Large-scale analytics, data lake storage, warehouse queries | Columnar compression. Schema-embedded. Queryable in place via DuckDB, Trino, Athena. |

### Section 4 — File-Based Pipelines (full-width, 2-column grid of cards)

These are downstream uses that require no running service — just the right export format.

| Pipeline | Description |
|---|---|
| **Fine-Tuning Datasets** | Confirmed overlays are supervised training examples: block content → structured output. Export as JSONL in fine-tuning format. The staging/confirm flow is your quality gate. |
| **Evaluation Benchmarks** | Confirmed overlays become gold-standard test cases. Version by schema + run for reproducible evaluation sets with provenance. |
| **Analytical Datasets** | Flatten overlays to CSV or Parquet. Load into DuckDB, Pandas, or R for statistical analysis across thousands of blocks. |
| **Vector Embedding Stores** | Export block content + metadata as JSONL. Embed and load into a vector store. Overlay metadata becomes filterable attributes for precision retrieval. |
| **Document Reconstruction** | For revision schemas: reassemble confirmed `revised_content` blocks into a complete output document. The platform reconstructs the document from the block inventory. |

### Section 5 — Push Integrations (3-column grid)

Connectors that the platform calls on your behalf.

| Connector | Description |
|---|---|
| **Neo4j** | Map overlay fields to nodes and edges. Push confirmed overlays into a graph database. Schemas can declare graph mappings. A corpus becomes a citation network or concept map automatically. |
| **Webhook** | POST JSONL to any endpoint when a run completes. Feed Airflow, Zapier, Make, or a custom service. Same canonical format as file export. |
| **Object Storage** | Export versioned Parquet to S3 or GCS. Register in a data catalog (Iceberg, Delta Lake). Query via Trino/Athena/BigQuery without additional infrastructure. |

### Section 6 — What People Build (optional, if the page feels too short)

Brief section on derived products — 3-4 short descriptions of what downstream consumers build on BlockData exports:

- **RAG with structured retrieval** — retrieve by block type + metadata, not just semantic similarity
- **Compliance audit trails** — every extraction traces to source hash, model, reviewer, timestamp
- **Multi-schema cross-referencing** — apply two schemas to the same document, join by block_uid, discover correlations
- **Batch document transformation** — upload 77 documents, apply revision schema, export 77 revised documents with full provenance

### Section 7 — CTA

"Build a dataset you can trust" → `/register`

---

## Cross-Page Content Data (`marketing/content.ts`)

The current `content.ts` file defines `STEPS`, `FEATURED_USE_CASES`, `MORE_USE_CASES`, and `CAPABILITIES`. This should be updated to reflect the redesign:

### Additions needed:

1. **`TRACKS`** — The three schema tracks (enrichment, revision, combined) with short and expanded descriptions. Used on Landing (short) and How It Works (expanded).

2. **`FEATURED_USE_CASES` expansion** — From 2 to 5-6 items. Each needs a `track` field ("enrichment" | "revision" | "combined") for badge rendering.

3. **`MORE_USE_CASES` expansion** — From 2 to 4 items covering the secondary use cases.

4. **`CAPABILITIES` expansion** — Add "Human-in-the-Loop Review" and rename "Schema-First Extraction" to "Schema-Driven Processing."

5. **`EXPORT_FORMATS`** — JSONL, CSV, Parquet with descriptions.

6. **`FILE_PIPELINES`** — Fine-tuning, evaluation, analytics, vector stores, reconstruction.

7. **`PUSH_INTEGRATIONS`** — Neo4j, webhook, object storage.

### Removals / revisions:

- `STEPS` step 4: rename from "Use the Results" to "Review & Export"
- `STEPS` step 2: revise copy to include revision, not just extraction
- `STEPS` step 3: add parallel processing language
- All extraction-only framing revised to include revision and combined tracks

---

## Layout Patterns Reference

These are the layout patterns already available in the codebase. The designer can use or replace these — this is just documenting what exists.

| Pattern | Component | Usage |
|---|---|---|
| **Split section** | `MarketingSplitSection` | Two columns, ~60/40 split. Used for hero. |
| **Centered section** | `MarketingSection` | Full-width container with centered content. Used for headers and CTAs. |
| **Card grid** | `SimpleGrid` + `Paper` | 2, 3, or 4 column grid of bordered cards. Used for steps, capabilities, use cases. |
| **Full-width card stack** | `Stack` of `Paper` components | Vertical stack of full-width cards with consistent internal layout. Used for featured use cases. |
| **Alternating background** | `style={{ backgroundColor: 'var(--mantine-color-default-hover)' }}` | Alternating sections for visual rhythm. |
| **Code block** | Mantine `Code block` | For the JSONL contract on Integrations page. |

---

## Navigation & Cross-Links

### PublicNav links (current, keep):
- How it works → `/how-it-works`
- Use cases → `/use-cases`
- Integrations → `/integrations`

### In-page cross-links (add to section footers):
| From | Link Text | To |
|---|---|---|
| Landing § Steps | "See the full workflow →" | `/how-it-works` |
| Landing § Use Cases | "Explore all use cases →" | `/use-cases` |
| Landing § Capabilities | "See integrations →" | `/integrations` |
| How It Works § Pipeline | "See real use cases →" | `/use-cases` |
| How It Works § Grid section | "See where the data goes →" | `/integrations` |
| Use Cases § any card | "How it works →" | `/how-it-works` |
| Integrations § file pipelines | "See use cases →" | `/use-cases` |

### Every page ends with:
Primary CTA button → `/register`
Secondary text link → next page in the funnel

---

## Notes for the Designer

1. **The three tracks are the single most important content addition.** Every page currently talks about "extraction" as if that's the only thing the platform does. The revision track and combined track need equal billing.

2. **The staging/confirm flow is a differentiator, not a detail.** "AI writes to staging, human confirms" should be visible on Landing and explained on How It Works. This is what makes BlockData trustworthy for production use.

3. **Make parallel processing feel real.** "20 workers, 5,000 blocks, 12 minutes" is more compelling than "scalable processing." Use concrete numbers.

4. **The grid is the product.** If there's one visual to invest in, it's a mock or screenshot of the AG Grid with overlay columns filling in. This is what makes the abstraction click.

5. **The Integrations page should feel like a platform page, not an afterthought.** The downstream value story is what turns "interesting tool" into "essential infrastructure." Fine-tuning datasets, evaluation benchmarks, knowledge graphs — these are why someone processes 77 documents through BlockData instead of doing it by hand.

6. **The `concepts/` directory has a `LandingModern.tsx` with a dark hero pattern** that could be adapted. The bento grid feature layout in that concept is stronger than the current uniform card grid on the live landing page.
