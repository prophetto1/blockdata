# Post-Auth Intro Page Content

**Date:** 2026-02-09
**Purpose:** Welcome/onboarding content shown after login — either as the empty-state of the Projects page or as a dedicated intro page for new users.
**Tone:** Direct, confident, practical. The user has already signed up. Don't sell — show them what's possible and get them started.

---

## Page Header

### Headline
> What would you like to work on?

### Subline
> Create a project, upload your documents, and let AI extract structured data from every paragraph — consistently, traceably, at any scale.

---

## Use Case Cards (two columns or stacked)

---

### Use Case A: Long-Document Editing & Analysis

**Card Title:** Work through a long document — paragraph by paragraph, at consistent quality.

**Scenario:**

> You have a 50,000-word manuscript, a 200-page thesis, or a lengthy technical report. You need every paragraph reviewed against the same standard — structural edits, style rules, factual checks, terminology consistency — but no AI session can maintain quality across that length.

**How it works here:**

> Upload your document. The platform splits it into its natural structure — paragraphs, headings, sections — each one an independent unit. Define a schema describing what you need from each block: a revised paragraph, revision notes, rules applied, a quality score. AI processes every block independently against your exact specification. Paragraph 1 and paragraph 840 get identical treatment.

> When it's done, you have structured, per-paragraph results you can review in the block viewer — accept, reject, or re-run individual blocks. Export the revised content in reading order, or download the full extraction as JSONL for further processing.

**Example schemas:**
- Prose editing against a style guide (Strunk's rules, house style, AP style)
- Technical accuracy review (flag unsupported claims, check citation consistency)
- Structural assessment (classify each paragraph's rhetorical function, narrative flow)
- Terminology extraction (key terms, definitions, cross-references)

**The result:** A 50,000-word document reviewed at paragraph-level quality in minutes, not days. Every edit traceable to the exact paragraph that produced it.

---

### Use Case B: Multi-Document Knowledge Extraction

**Card Title:** Turn a collection of documents into structured, searchable knowledge.

**Scenario:**

> You have 77 documents — PDFs, Word files, markdown, slide decks — spread across a shared drive. They contain everything your team knows about a subject: specifications, meeting notes, research papers, contracts, policies. You need that knowledge structured, searchable, and connected. But organizing 77 documents manually, reading each one, extracting the important parts — that's weeks of work. So the documents sit there, useful in theory, inaccessible in practice.

**How it works here:**

> Create a project. Upload all 77 files at once — the platform handles every format. PDFs and Word documents go through Docling, an industrial document engine that preserves tables, layout, and structure. Markdown is parsed for precise structural fidelity. Every document is decomposed into ordered, typed blocks. Every block gets a stable identity.

> Define one schema: the fields you want extracted from every paragraph across every document. Entity names, topic classifications, key claims, cross-references, risk flags — whatever your domain requires. Apply it once. AI workers fan out across thousands of blocks in parallel. Watch the project progress bar fill as results come in.

> When it's done, download 77 JSONL files — one per document, every block carrying your extracted fields with full provenance. Upload to Neo4j and you have a knowledge graph where every node traces back to a specific paragraph in a specific document. Load into DuckDB for analytical queries. Push to a webhook for your internal systems.

**Example schemas:**
- Entity and relationship extraction (people, organizations, dates, connections)
- Topic classification per paragraph (what is this paragraph about?)
- Obligation and commitment tracking (who committed to what, in which document?)
- Technical specification extraction (requirements, constraints, dependencies)
- Citation and cross-reference mapping (which documents reference which?)

**The result:** 77 documents, fully structured, fully searchable, fully connected — with every extracted field traceable to its source paragraph. A knowledge graph that would have taken weeks to build manually, assembled in hours.

---

## Bottom Section: Getting Started

### Headline
> Start with one document or one hundred. The process is the same.

### Steps (compact, inline — not a wizard, just orientation)

> **1. Create a project** — give it a name, add a description if you want.
>
> **2. Upload documents** — drag in as many files as you need. Markdown, Word, PDF — mixed formats are fine. Each file is decomposed into blocks automatically.
>
> **3. Define a schema** — describe what you want extracted from each block. Use a template, build one with AI assistance, or write your own in JSON.
>
> **4. Run** — bind your schema to your documents and pick an AI model. The platform processes every block independently. Watch results appear in real time.
>
> **5. Use the results** — review in the block viewer, export as JSONL, push to Neo4j, or download for your own pipeline.

### CTA
> **Create Your First Project**

---

## Design Notes

- This content appears when the user has zero projects (empty state of `/app`), or as a dismissable onboarding card at the top of the Projects page.
- After the user creates their first project, this page is replaced by the standard Projects list. A "Learn more" or "?" icon in the header can resurface it.
- Cards should use the existing Mantine `Card` + `Paper` components with the Slate/Indigo design tokens.
- Keep the layout clean: two use case cards side by side on desktop, stacked on mobile.
- No emojis, no illustrations (yet). The content carries itself. Illustrations can be added later.
- The "Example schemas" lists could become clickable template links once the schema template library is built.

---

## Alternate Empty-State Version (shorter, for inline use)

If the full intro page feels too heavy, here's a compact version for the Projects page empty state:

> **No projects yet.**
>
> A project holds your documents and the structured data you extract from them.
>
> Upload a long manuscript and edit it paragraph by paragraph with consistent AI quality. Or upload an entire document collection and extract searchable, structured knowledge from every page.
>
> **Create Your First Project**
