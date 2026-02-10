Product Vision (What It Is)
One-Sentence Definition: BlockData is a document intelligence platform that transforms unstructured documents into permanent, identity-bearing block inventories that users can annotate through multiple swappable schemas—enabling parallel AI processing, multi-lens analysis, and document reconstruction.

Core Belief: You believe that the "block" (paragraph-level unit) should be a first-class citizen with permanent identity and provenance—not a disposable chunk on the way to a vector store. Same blocks, infinite lenses.

The Problem
Large documents exceed single AI context limits — A 1000-page document can't be processed coherently by one AI
Current tools force re-processing — Want citation analysis AND opinion extraction? Run two separate pipelines from scratch
No provenance chain — RAG chunks are disposable; you can't trace extracted data back to the exact source paragraph
Fragmented ecosystem — IDP tools do doc-level extraction, annotation tools are human-in-the-loop, RAG tools treat chunks as intermediates. Nobody built the hub.
Who Feels It (Implied Personas)
Persona	Pain
Legal researcher (you)	28K SC cases, needs citation networks + opinion analysis + authority scoring—currently requires separate pipelines
Technical writer/editor	Massive docs need consistent editing standards; can't parallelize prose review across AI workers
Knowledge engineer	Extracting KG triples from documents lacks block-level granularity and reusability
AI builder	Needs retrieval-ready chunks with rich metadata for filtered semantic search
Core Capabilities (User-Centric)
Upload any format → Users can upload PDF, DOCX, PPTX, TXT, or MD and receive a structured block inventory without manual conversion
Apply multiple schemas → Users can run different annotation schemas (citation extraction, prose editing, KG entities) against the same blocks without re-ingestion
Parallel AI annotation → Users can have multiple AI workers process a massive document concurrently, following a consistent user-defined schema
Reconstruct documents → Users can export annotated blocks back to original format (DOCX, PDF) with edits applied
Route to downstream systems → Users can export to JSONL, push to knowledge graphs, or index to vector stores—all from the same block inventory
The Innovation (Why This Doesn't Exist)
The chat explicitly validates this:

"Nobody has stitched these together. The closest conceptual neighbor is probably Prodigy... but Prodigy is a desktop tool for humans labeling NER training data."

What's genuinely novel:

Block as permanent, identity-bearing unit (three-hash provenance)
Same blocks, multiple schemas (one upload, N annotation runs)
AI-as-annotator at block granularity with parallel claim pattern
Document reconstruction from annotated blocks
Multi-destination routing from single block inventory
Use Cases From the Chat
Use Case 1: Legal Corpus Analysis
Upload 28K Supreme Court cases → apply citation schema (builds citation network) → apply opinion schema (extracts holdings/dicta) → apply authority schema (Fowler scores, Shepard's signals). Three annotation runs, same blocks, three distinct outputs feeding Legal-10 and a legal AI system.

Use Case 2: Distributed Document Editing
Upload 1000-page thesis → system breaks into ~4000 blocks → apply Strunk editing schema → 10 AI workers process in parallel → each fills rule_hits and revised_text → reconstruct edited document via Pandoc → user downloads polished DOCX.

Use Case 3: Knowledge Graph Construction
Upload research papers → apply KG entity schema → extract entities, relations, triples per block → export to Neo4j → every graph node traces back to exact source paragraph via block_uid.

Platform Roadmap (Three Tiers)
Tier	What	Who
1. Tool	Upload → blocks → runs → export. JSON schema upload.	Power users (you, devs)
2. Platform	Visual schema builder. Schema gallery. Multi-run dashboard.	Analysts, researchers
3. Infrastructure	API, webhooks, KG connectors, vector connectors, model adapters	Enterprises, integrations
What's Missing From a Proper PRD
The document you shared is actually a technical specification, not a PRD per your template. It's heavy on:

Database schemas, hash functions, DDL
Edge Functions, service architecture
SQL patterns, RLS policies, concurrent claim loops
A proper PRD would abstract all that away and focus on:

User capabilities without implementation language
Success metrics (quantitative targets)
Definition of done
Explicit out-of-scope boundaries
My Read
You've architected something genuinely differentiated—the "block as universal hub" insight is real. The chat validates competitive landscape is fragmented. The technical spec is thorough.

What you need next: Translate this into the PRD template format—user-centric capabilities, measurable success criteria, clear scope boundaries. That becomes your locked vision document, while the technical spec (what you have) becomes your implementation spec.

Want me to draft a PRD Document 1 from this material using your template?

Use Case- does it necessarily stop there, suppose you wre organizing all of the potential use cases - what else could there be.  bc i think stating legal corpus analysis as a  use case is fine but it could very easily be something else entirely

12:31 AM

Abstracted core architecture to identify broader use case patterns across domains
You're right. "Legal corpus analysis" is an instance of a pattern, not a category. Let me abstract up and map the full use case space.

The Underlying Patterns
The system does three things:

Decompose → Any document → identity-bearing blocks
Annotate → Apply schema-defined AI extraction at block granularity
Route → Export to file, reconstruct document, feed KG, index vectors
Use cases emerge from the intersection of:

Corpus type (what's being uploaded)
Annotation objective (what schema extracts)
Output destination (where results go)
Use Case Taxonomy
Category A: Corpus-Wide Analysis
Pattern: Upload N documents, run schema, aggregate insights across corpus

Instance	Corpus	Schema Extracts	Output
Legal corpus analysis	28K SC cases	Citations, holdings, signals	Citation network, authority graph
Academic literature review	500 papers	Claims, methods, findings, citations	Systematic review dataset
Competitive intelligence	200 10-Ks	Risk factors, strategy signals, financial metrics	Comparison matrix
Policy analysis	All state statutes on topic X	Definitions, requirements, exceptions	Cross-jurisdiction comparison
Patent landscape	1000 patents	Claims, prior art refs, technical domains	Innovation map
News monitoring	6 months of articles	Entities, events, sentiment, sources	Event timeline, narrative tracking
Category B: Distributed Document Processing
Pattern: Single massive document, parallel AI workers, reconstruction

Instance	Document	Schema Extracts	Output
Technical editing	800-page manual	Style violations, rewrites	Cleaned document
Compliance review	300-page contract	Clause types, risk flags, missing provisions	Annotated contract + risk report
Textbook revision	500-page textbook	Outdated claims, citation needs, clarity issues	Revised edition
Translation QA	Translated document	Mistranslations, awkward phrasing, term inconsistencies	Corrected translation
Accessibility audit	Long-form content	Reading level per block, jargon, suggested simplifications	Plain-language version
Fact-checking pipeline	Investigative report	Claims, required citations, verification status	Verified document with sources
Category C: Knowledge Extraction → Structured Output
Pattern: Documents in, structured data out (KG, database, taxonomy)

Instance	Corpus	Schema Extracts	Output
Ontology construction	Domain textbooks	Concepts, definitions, relationships	Domain ontology
Entity database	Company filings	People, orgs, roles, events	Structured entity DB
Research knowledge graph	Scientific papers	Hypotheses, evidence, contradictions	Argumentation graph
Product catalog enrichment	Product manuals	Features, specs, compatibility	Structured product data
Medical protocol extraction	Clinical guidelines	Conditions, interventions, dosages, contraindications	Queryable protocol DB
Legal precedent graph	Case law	Holdings, facts, procedural posture, treatment	Precedent network
Category D: Retrieval Infrastructure
Pattern: Build retrieval-ready corpus with rich metadata for RAG/search

Instance	Corpus	Schema Enriches With	Output
Enterprise search	Internal docs	Topics, doc type, audience, freshness	Filtered semantic search
Customer support KB	Help articles	Intent, product area, complexity level	Support chatbot retrieval
Legal research RAG	Case law + statutes	Jurisdiction, topic, authority weight	Legal AI retrieval layer
Research assistant	Paper collection	Methodology type, claim strength, domain	Academic Q&A system
Codebase documentation	Technical docs	API, version, deprecation status	Developer assistant retrieval
Category E: Multi-Lens Comparative Analysis
Pattern: Same document(s), multiple schemas, compare outputs

Instance	Document	Schema 1	Schema 2	Insight
Argumentation analysis	Op-ed	Claims + evidence	Rhetorical moves	How argument is constructed
Source triangulation	News articles	Factual claims	Source attribution	What's asserted vs. sourced
Contract negotiation	Two contract versions	Clause extraction	Diff detection	What changed between drafts
Bias detection	News corpus	Factual content	Framing/tone	Same facts, different spin
Pedagogical analysis	Textbook	Concepts taught	Cognitive load per block	Where students struggle
Category F: Human-AI Collaboration Workflows
Pattern: AI annotates, human reviews/overrides, AI continues

Instance	Workflow
Legal brief drafting	AI extracts relevant precedents → attorney reviews → AI drafts argument
Grant proposal assembly	AI extracts prior work claims → PI reviews → AI structures proposal
Systematic review	AI screens abstracts → researcher adjudicates edge cases → AI synthesizes
Due diligence	AI flags contract risks → lawyer reviews → AI generates summary memo
Content moderation	AI flags policy violations → human reviews borderline → AI learns threshold
Category G: Document Generation (Reverse Pipeline)
Pattern: Blocks as templates, AI fills, reconstruct document

Instance	Template Blocks	Schema Defines	Output
Report generation	Section structure	What goes in each section	Completed report
Proposal builder	Standard sections	Client-specific content per section	Custom proposal
Form completion	Form fields as blocks	Extracted answers from source docs	Filled form
Localization	Original blocks	Translation + cultural adaptation per block	Localized document
The Meta-Insight
The use cases aren't really about domains (legal, medical, academic). They're about operations:

Operation	What It Means
Analyze	Extract structured insights from corpus
Edit	Transform content via parallel processing
Structure	Convert unstructured → structured data
Index	Prepare for retrieval with rich metadata
Compare	Multiple lenses on same content
Collaborate	Human-AI workflow on block inventory
Generate	Blocks as scaffold for new content
Any domain × any operation = valid use case.

So When Writing the PRD...
Instead of listing "Legal corpus analysis" as a use case, you'd frame it as:

Use Case: Corpus-Wide Structured Extraction

Scenario: User has a large document corpus (hundreds to thousands of documents) and needs to extract structured data across all of them using a consistent schema.

Examples: Legal citation networks, academic literature reviews, competitive intelligence from filings, policy cross-jurisdiction analysis.

This way the PRD captures the pattern, and the instances become examples that illustrate it.

Want me to draft the Use Cases section using these operation-based categories instead of domain-specific examples?

yeah exaclty. if you made the Use Case # the pattern and had multiple instances of that pattern below it - then legal corpora would be one instance

12:33 AM

Architected pattern-based restructuring for Use Cases section
Exactly. Here's the restructured Use Cases section:

Section 5: Use Cases
Each use case describes a pattern — a fundamental operation the platform enables. Instances show how the pattern applies across domains.

Use Case 1: Corpus-Wide Structured Extraction
Pattern: User uploads a large document corpus and applies a schema to extract structured data consistently across all documents. The output aggregates into a dataset, network, or comparison matrix.

Journey:

User uploads N documents (any format)
System decomposes each into block inventory
User selects or uploads extraction schema defining target fields
System runs annotation across all blocks in parallel
User exports structured output (JSONL, KG, database)
Outcome: Structured dataset derived from unstructured corpus, with every data point traceable to source block.

Instances:

Domain	Corpus	Schema Extracts	Output
Legal	28K Supreme Court cases	Citations, holdings, authority signals	Citation network, precedent graph
Academic	500 research papers	Claims, methods, findings, references	Systematic review dataset
Finance	200 annual reports	Risk factors, strategy signals, metrics	Competitive comparison matrix
Policy	State statutes on single topic	Definitions, requirements, exceptions	Cross-jurisdiction analysis
Patents	1000 patents in domain	Claims, prior art, technical categories	Innovation landscape map
Media	6 months news coverage	Entities, events, sentiment, sources	Event timeline, narrative analysis
Use Case 2: Distributed Document Processing
Pattern: User uploads a single massive document that exceeds practical AI context limits. System decomposes into blocks, multiple AI workers process in parallel following a consistent schema, and the system reconstructs an output document.

Journey:

User uploads large document (hundreds/thousands of pages)
System decomposes into block inventory (potentially thousands of blocks)
User selects processing schema defining per-block operations
Multiple AI workers claim and process blocks concurrently
System reconstructs document from processed blocks
User downloads transformed document in original format
Outcome: Massive document processed to consistent standard, with parallel AI work that no single context window could handle.

Instances:

Domain	Document	Schema Defines	Output
Editorial	800-page technical manual	Style rules, clarity checks, rewrites	Edited document
Legal	300-page contract	Clause types, risk flags, suggested revisions	Annotated contract + risk report
Publishing	500-page textbook	Outdated claims, citation needs, clarity issues	Revised edition
Localization	Translated document	Mistranslations, term inconsistencies, fixes	Corrected translation
Accessibility	Long-form content	Reading level, jargon flags, simplifications	Plain-language version
Journalism	Investigative report	Claims requiring citation, verification status	Fact-checked document with sources
Use Case 3: Knowledge Graph Construction
Pattern: User uploads documents and applies a schema that extracts entities, relationships, and structured assertions. Output feeds a graph database or ontology with block-level provenance.

Journey:

User uploads source documents
System decomposes into block inventory
User selects KG extraction schema (entities, relations, triples)
System annotates each block with structured extractions
User exports to graph database (Neo4j, etc.) or structured format
Every node/edge traces back to source block_uid
Outcome: Knowledge graph where every assertion links to the exact paragraph it was derived from.

Instances:

Domain	Corpus	Schema Extracts	Output
Academic	Domain textbooks	Concepts, definitions, relationships	Domain ontology
Corporate	Company filings	People, organizations, roles, events	Entity database
Scientific	Research papers	Hypotheses, evidence, contradictions	Argumentation graph
Product	Technical manuals	Features, specs, compatibility	Structured product catalog
Medical	Clinical guidelines	Conditions, interventions, dosages	Queryable protocol database
Legal	Case law corpus	Holdings, facts, treatment relationships	Precedent network
Use Case 4: Retrieval Infrastructure Building
Pattern: User uploads a corpus and applies a schema that enriches each block with metadata for filtered semantic search. Output is a retrieval-ready index with rich filtering dimensions.

Journey:

User uploads document corpus
System decomposes into block inventory
User selects enrichment schema (topics, categories, metadata fields)
System annotates blocks with retrieval-relevant metadata
User indexes blocks + metadata to vector store
Downstream RAG system retrieves with metadata filters
Outcome: Retrieval corpus where each chunk has structured metadata enabling precise filtered search, not just semantic similarity.

Instances:

Domain	Corpus	Schema Enriches With	Enables
Enterprise	Internal documentation	Topics, doc type, audience, freshness	Filtered enterprise search
Support	Help center articles	Intent, product area, complexity level	Support chatbot retrieval
Legal	Case law + statutes	Jurisdiction, topic, authority weight	Legal research AI
Research	Academic papers	Methodology, claim strength, domain	Research assistant Q&A
Engineering	Technical documentation	API, version, deprecation status	Developer assistant
Use Case 5: Multi-Schema Comparative Analysis
Pattern: User applies multiple schemas to the same document(s) and compares outputs across lenses. Reveals dimensions invisible to single-schema analysis.

Journey:

User uploads document(s)
System decomposes into block inventory (once)
User runs Schema A → annotation results A
User runs Schema B → annotation results B (same blocks, no re-ingest)
User views blocks with both annotation layers visible
User analyzes patterns across lenses
Outcome: Same content examined through multiple analytical frames, revealing relationships between different dimensions.

Instances:

Domain	Document	Schema A	Schema B	Insight
Rhetoric	Opinion pieces	Claims + evidence	Rhetorical moves	How arguments are constructed
Journalism	News articles	Factual assertions	Source attribution	What's claimed vs. sourced
Legal	Contract versions	Clause extraction	Diff detection	What changed between drafts
Media	News corpus	Factual content	Framing/tone markers	Same facts, different spin
Education	Textbooks	Concepts taught	Cognitive load indicators	Where learners struggle
Use Case 6: Human-AI Collaborative Workflow
Pattern: AI performs initial annotation pass, human reviews and adjudicates edge cases, workflow continues with human decisions incorporated. Block inventory serves as shared workspace.

Journey:

User uploads documents
System decomposes into block inventory
AI runs first-pass annotation per schema
Human reviews flagged/uncertain blocks, makes corrections
System incorporates human decisions
Workflow continues (AI drafts, synthesizes, or learns from corrections)
Outcome: Neither pure automation nor pure manual work—structured collaboration where AI handles volume and humans handle judgment.

Instances:

Domain	Workflow
Legal research	AI extracts relevant precedents → attorney reviews relevance → AI drafts argument section
Grant writing	AI extracts prior work claims → PI reviews accuracy → AI structures proposal
Systematic review	AI screens abstracts → researcher adjudicates borderlines → AI synthesizes findings
Due diligence	AI flags contract risks → lawyer reviews severity → AI generates summary memo
Content moderation	AI flags potential violations → human reviews edge cases → thresholds refined
Use Case 7: Template-Based Document Generation
Pattern: Block inventory serves as a structural template. Schema defines what content should fill each block. AI generates, human reviews, system assembles final document.

Journey:

User creates or uploads template document (section structure)
System decomposes into block inventory (blocks = sections/slots)
User defines generation schema (what each block should contain)
User provides source material or context
AI generates content per block following schema
User reviews, edits blocks
System reconstructs completed document
Outcome: Structured document generation where the skeleton is fixed and content is generated per-section with human oversight.

Instances:

Domain	Template	Schema Defines	Output
Consulting	Report structure	Section requirements, client context	Completed client report
Sales	Proposal template	Client-specific content per section	Custom proposal
Compliance	Form structure	How to extract answers from source docs	Completed compliance form
Localization	Original document	Translation + adaptation per block	Localized version
Documentation	Doc structure	Technical content per section from specs	Generated documentation
Pattern Summary
#	Pattern	Core Operation	Input → Output
1	Corpus-Wide Extraction	Analyze	N documents → structured dataset
2	Distributed Processing	Edit/Transform	1 massive doc → processed doc
3	Knowledge Graph Construction	Structure	Documents → graph with provenance
4	Retrieval Infrastructure	Index	Documents → enriched searchable corpus
5	Multi-Schema Comparison	Compare	Same blocks × N schemas → cross-lens insights
6	Human-AI Collaboration	Collaborate	AI annotation + human judgment → refined output
7	Template-Based Generation	Generate	Structure + context → completed document
This framing makes the PRD domain-agnostic while still being concrete. Legal corpus analysis is now clearly just one instance of Pattern 1. Want me to refine any of these or add additional patterns?

How could something like this be used in a vector pipeline involving  indexing/chunking/emedding

12:34 AM

Architected block-based enrichment strategy for vector pipeline integration
Great question. Let me break down how the block architecture intersects with each stage of a vector pipeline — and where it fundamentally changes the game.

Traditional Vector Pipeline
Document → Chunker → Chunks → Embedder → Vectors → Vector DB → Retrieval
Problems:

Chunks are disposable intermediates with no identity
Chunking is arbitrary (token windows, recursive split)
Metadata is bolted on after the fact, if at all
Re-chunking = start over from scratch
No provenance from retrieved chunk back to source
BlockData Block Architecture in Vector Pipeline
Document → Block Inventory (permanent) → Annotation Schema(s) → Enriched Blocks → Embedding Strategy → Vectors + Metadata → Vector DB → Filtered Retrieval
The block is the chunk. But it's a chunk with:

Permanent identity (block_uid)
Structural context (section_path, block_type, block_index)
Full provenance (doc_uid → source document)
Annotation layer (schema-defined metadata)
Stage-by-Stage Breakdown
Stage 1: Chunking → Block Inventory
Traditional	BlockData
Arbitrary token windows (512, 1024)	Semantic units (paragraphs, headings, list items)
Overlap heuristics to preserve context	section_path preserves hierarchical context
No chunk identity	block_uid = permanent anchor
Re-chunk = lose everything	Blocks are permanent; re-embed without re-parsing
What you gain: Chunks that respect document structure. A heading stays a heading. A paragraph doesn't get split mid-sentence. The section hierarchy travels with every block.

Stage 2: Metadata Enrichment (Annotation Layer)
This is where BlockData changes everything. Before embedding, you run annotation schemas that enrich blocks with retrieval-relevant metadata.

Example: Annotation Schema for Vector Enrichment

json
{
  "schema_ref": "retrieval_enrichment_v1",
  "fields": {
    "topics": "array of topic labels relevant to this block",
    "entities": "named entities mentioned (people, orgs, concepts)",
    "content_type": "factual | opinion | procedural | definition | example",
    "complexity": "beginner | intermediate | advanced",
    "standalone_score": "1-5 how understandable without context",
    "summary": "one-sentence distillation of block content",
    "keywords": "array of searchable terms"
  }
}
After annotation, each block has:

content_original (the text)
block_type, section_path (structural)
topics, entities, content_type, complexity, etc. (enriched)
All of this becomes filterable metadata in your vector store.

Stage 3: Embedding Strategies
Because blocks are permanent and annotation is a separate layer, you can run multiple embedding strategies on the same blocks without re-ingestion.

Strategy	What Gets Embedded	Use Case
Raw content	content_original	General semantic search
Content + context	section_path[-1] + ": " + content_original	Heading-aware retrieval
Summary embedding	annotation.summary	Fast approximate retrieval
Entity-enhanced	content_original + " [" + entities.join(", ") + "]"	Entity-aware similarity
Hypothetical question	AI-generated "what question does this answer?"	Query-aligned embedding (HyDE-style)
Key insight: Same block_uid, multiple vectors. You could store:

block_uid + "_content" → raw embedding
block_uid + "_summary" → summary embedding
block_uid + "_hyde" → hypothetical question embedding
Retrieval can query across strategies or combine them.

Stage 4: Vector Store Record Structure
Each block becomes a vector store record with rich metadata:

json
{
  "id": "block_uid",
  "vector": [0.023, -0.142, ...],
  "metadata": {
    "doc_uid": "abc123",
    "doc_title": "Smith v. Jones (2019)",
    "block_index": 47,
    "block_type": "paragraph",
    "section_path": ["Opinion", "Analysis", "Due Process"],
    "char_span": [12045, 12892],
    
    "topics": ["due process", "procedural rights"],
    "entities": ["Smith", "Fourteenth Amendment", "Jones"],
    "content_type": "holding",
    "complexity": "advanced",
    "standalone_score": 4,
    
    "source_type": "legal_case",
    "jurisdiction": "SCOTUS",
    "year": 2019
  }
}
```

**What this enables:**
- Semantic similarity (vector)
- Filtered search (metadata)
- Hybrid retrieval (both)
- Full provenance (block_uid → blocks table → source document)

---

### Stage 5: Retrieval Patterns

With enriched blocks, retrieval becomes much more precise:

**Pattern A: Semantic + Filter**
```
Query: "procedural due process requirements"
Filter: content_type = "holding" AND jurisdiction = "SCOTUS" AND year > 2010
→ Only retrieve holdings from recent Supreme Court cases
```

**Pattern B: Multi-Stage Retrieval**
```
1. Fast retrieval on summary embeddings (top 100)
2. Re-rank on full content embeddings (top 20)
3. Filter by standalone_score > 3 (comprehensible without context)
4. Return top 5
```

**Pattern C: Entity-Anchored**
```
Query: "What did the court say about Miranda?"
Filter: entities contains "Miranda"
→ Only blocks that actually mention Miranda
```

**Pattern D: Structural Navigation**
```
Retrieved block has section_path = ["Opinion", "Analysis", "Fourth Amendment"]
→ Fetch sibling blocks (same section_path prefix)
→ Fetch parent heading block
→ Return with structural context
```

---

## The Re-Embedding Advantage

Traditional pipeline: Change your chunking strategy? Start over.

BlockData: Blocks are permanent. You can:

| Operation | What Happens |
|-----------|--------------|
| New embedding model | Re-embed all blocks, same block_uids |
| New enrichment schema | Run annotation, re-export to vector store |
| Add metadata dimension | Run new schema, update vector store metadata |
| Fix bad chunks | Never happens — blocks are semantic units |

The block inventory is your **stable substrate**. Embeddings are a **derived view** you can regenerate anytime.

---

## Architecture: Block Inventory as Vector Pipeline Hub
```
                                    ┌─────────────────────┐
                                    │   Vector Store A    │
                                    │   (Pinecone)        │
                                    └─────────────────────┘
                                              ▲
                                              │ export
                                              │
┌──────────────┐    ┌──────────────┐    ┌─────────────────────┐
│   Documents  │ →  │    Blocks    │ →  │  Enrichment Schema  │
│   (any fmt)  │    │  (permanent) │    │  (annotation run)   │
└──────────────┘    └──────────────┘    └─────────────────────┘
                          │                       │
                          │                       │ export
                          │                       ▼
                          │               ┌─────────────────────┐
                          │               │   Vector Store B    │
                          │               │   (Qdrant)          │
                          │               └─────────────────────┘
                          │
                          │ different schema
                          ▼
                    ┌─────────────────────┐
                    │   KG Schema         │ → Neo4j
                    │  (entities/rels)    │
                    └─────────────────────┘
```

Same blocks feed multiple downstream systems. Each export is a **view** of the block inventory shaped by its annotation schema.

---

## Concrete Vector Pipeline Use Case

### Use Case: Legal Research RAG

**Setup:**
1. Ingest 28K Supreme Court cases → ~3M blocks
2. Run `legal_retrieval_v1` annotation schema:
   - `holding_type`: majority | concurrence | dissent | procedural
   - `topics`: constitutional law categories
   - `cited_cases`: extracted case citations
   - `authority_signal`: positive | negative | neutral | distinguished
   - `complexity`: 1-5
   - `summary`: one-sentence block summary

**Embedding strategy:**
- Primary: `content_original` with `text-embedding-3-large`
- Secondary: `summary` with same model (faster retrieval)

**Vector store:** Pinecone with metadata filtering

**Retrieval at query time:**
```
User query: "When can police search a vehicle without a warrant?"

1. Embed query
2. Search with filters:
   - topics contains "Fourth Amendment" OR "search and seizure"
   - holding_type = "majority"
   - authority_signal != "overruled"
3. Return top 10 blocks with full provenance
4. For each block, optionally fetch section siblings for context
What the user gets:

Relevant paragraphs (not whole cases)
Only from majority holdings (not dicta)
Only good law (not overruled)
Each result links back to exact location in source case
Summary: What Blocks Add to Vector Pipelines
Traditional RAG	Block-Based RAG
Chunks are disposable	Blocks are permanent with identity
Metadata is afterthought	Metadata is first-class annotation layer
One chunking strategy	Semantic units, multiple embedding strategies
Re-chunk = start over	Re-embed anytime, same blocks
Retrieved chunk is a string	Retrieved block has full provenance
Filtering is limited	Rich schema-defined metadata filtering
Single vector store	Same blocks export to multiple destinations
New Use Case Pattern for PRD?
This could be Use Case 4: Retrieval Infrastructure Building expanded, or a new pattern:

Use Case 8: Vector Pipeline Substrate
Pattern: Block inventory serves as permanent, enrichable chunking layer for vector search. Annotation schemas define metadata dimensions. Blocks export to vector stores with full provenance and rich filtering.

Journey:

User ingests corpus → block inventory (once)
User runs enrichment schema → retrieval metadata per block
User configures embedding strategy (what to embed, which model)
System exports blocks + vectors + metadata to vector store
User queries with semantic search + metadata filters
Retrieved blocks link back to source via block_uid
Outcome: RAG pipeline where chunks are permanent, enrichable, multi-strategy, and fully traceable.

Want me to go deeper on any stage — embedding strategies, vector store schema design, or retrieval patterns?

so this vector pipeline used by today's companies 
Document → Chunker → Chunks → Embedder → Vectors → Vector DB → Retrieval

Is there anything going on during the chunking phase. I would assume they might be doing things to optimize the chunks

12:40 AM

Catalogued sophisticated chunking strategies and contrasted them with structural approaches
Yes, absolutely. The chunking phase has become a whole subfield. Let me map what's actually happening out there.

The Chunking Landscape (What Companies Actually Do)
Tier 1: Naive Approaches (Still Common)
Strategy	How It Works	Problem
Fixed token window	Split every 512/1024 tokens	Cuts mid-sentence, mid-thought
Fixed + overlap	512 tokens with 50-100 token overlap	Redundant storage, still arbitrary cuts
Character split	Split on character count	Same problems, worse
These are still widespread because they're simple. Most tutorials teach this.

Tier 2: Structure-Aware Splitting
Strategy	How It Works	Better Because
Sentence splitting	Split on sentence boundaries	Never cuts mid-sentence
Paragraph splitting	Split on \n\n	Respects authorial units
Recursive splitter	Try \n\n, then \n, then . , then space	Graceful degradation
Markdown header splitting	Split on #, ##, etc.	Respects document hierarchy
HTML/DOM splitting	Split on <section>, <p>, <h1>	Structure-aware for web content
LangChain, LlamaIndex, and others have these built in. This is the current "best practice" baseline.

Tier 3: Semantic Chunking
This is where it gets interesting. The idea: split where meaning shifts, not where tokens run out.

Strategy	How It Works
Embedding-based boundary detection	Embed each sentence, compute similarity between adjacent sentences, split where similarity drops below threshold
Clustering	Embed sentences, cluster semantically similar ones, each cluster = chunk
LLM-guided splitting	Ask an LLM "where are the natural break points in this text?"
Tools doing this:

LlamaIndex's SemanticSplitterNodeParser
LangChain's SemanticChunker
Unstructured.io's semantic chunking
Greg Kamradt's "semantic chunking" approach (widely copied)
The catch: Computationally expensive (embed everything first, then split), and still produces ephemeral chunks with no identity.

Tier 4: Contextual Enrichment
Here's where companies add metadata or context to chunks during or after chunking:

Strategy	How It Works
Contextual headers	Prepend section title/path to each chunk: "Section 3.2 - Analysis: [chunk text]"
Parent reference	Store pointer to parent section/document
Summary injection	Generate summary of surrounding context, prepend to chunk
Hypothetical questions (HyDE)	Generate "what question does this chunk answer?" — embed that instead/also
Proposition extraction	Break chunk into atomic propositions, embed those
Anthropic's "Contextual Retrieval" paper (late 2024) showed that prepending context to chunks before embedding dramatically improves retrieval. Example:

Original chunk: "The company increased revenue by 15%."

Contextualized: "This chunk is from Apple's Q3 2024 earnings report, 
in the Financial Highlights section. The company increased revenue by 15%."
This is now considered best practice at sophisticated shops.

Tier 5: Multi-Representation Retrieval
The insight: don't commit to one representation per chunk.

Strategy	How It Works
Small-to-big	Embed small chunks (sentence), retrieve, but return the larger parent chunk for context
Summary + full	Embed both summary and full text, search summaries for speed, return full text
Multi-vector	Store multiple embeddings per chunk (different models, different representations)
Hypothetical + actual	Embed both the chunk AND a generated question it answers
LlamaIndex has ParentDocumentRetriever, MultiVectorRetriever for these patterns.

Tier 6: Agentic Chunking
Emerging approach: use an LLM to make chunking decisions dynamically.

Strategy	How It Works
LLM boundary detection	LLM reads document, outputs chunk boundaries
LLM chunk validation	After naive chunking, LLM reviews and merges/splits as needed
Propositionizer	LLM extracts atomic propositions, each proposition = chunk
Example (Propositionizer):

Original: "Apple was founded by Steve Jobs, Steve Wozniak, and 
Ronald Wayne in 1976. The company is headquartered in Cupertino."

Propositions:
1. "Apple was founded by Steve Jobs."
2. "Apple was founded by Steve Wozniak."
3. "Apple was founded by Ronald Wayne."
4. "Apple was founded in 1976."
5. "Apple is headquartered in Cupertino."
Each proposition is embedded separately. Dense but precise retrieval.

Summary: What Sophisticated Pipelines Actually Do
Document 
    → Structure-aware split (markdown/HTML hierarchy)
    → Semantic boundary refinement (embedding similarity)
    → Contextual enrichment (prepend section titles, summaries)
    → Multi-representation (embed summary + full + hypothetical question)
    → Metadata extraction (entities, topics, dates)
    → Vector DB with filtering
    → Retrieval with reranking
This is a lot of work. And it's all:

Ephemeral — chunks exist only in the vector DB
Tangled — enrichment logic mixed with chunking logic
Non-reusable — change your strategy, re-run everything
No identity — can't refer back to "chunk X" reliably
Where BlockData Differs Fundamentally
Aspect	Current Best Practice	BlockData
Chunk identity	None or ephemeral ID	Permanent block_uid (content-addressed hash)
Chunk boundary	Algorithmic (semantic, token-based)	Authorial (paragraph, heading, list item)
Enrichment	Baked into chunking pipeline	Separate annotation layer, run N schemas
Re-processing	Re-chunk = start over	Re-annotate or re-embed, blocks persist
Provenance	Chunk → maybe doc ID	block_uid → doc_uid → source file → char_span
Multi-representation	Complex multi-vector setup	Same block, multiple annotation runs, multiple embeddings
Structure	Lost or approximated	section_path, block_type, block_index native
The Key Architectural Insight
Current pipelines treat chunking as a transformation step — document goes in, chunks come out, document is discarded.

BlockData treats the block inventory as a permanent layer — the canonical representation of the document that all downstream operations reference.

CURRENT:
Document → [chunking black box] → Chunks → Vectors → DB
                                    ↓
                            (document gone)

BLOCKDATA:
Document → Block Inventory (permanent) → Annotation Schema → Export to Vectors
                    ↓                           ↓
            (always available)         (can run again with different schema)
What This Means Practically
Scenario: You want to improve your retrieval
Current pipeline:

Realize your chunking is bad
Re-design chunking strategy
Re-process all documents
Re-embed everything
Re-index vector DB
Hope it's better
BlockData:

Blocks are already there (permanent)
Design new enrichment schema
Run annotation (just the enrichment, not re-parsing)
Re-export to vector DB with new metadata
Or: add second embedding strategy alongside first
Compare retrieval quality, keep what works
Scenario: You want different metadata for different use cases
Current pipeline:

Chunk with metadata A for use case A
Need metadata B? Re-chunk with different pipeline
Now you have two separate chunk sets
Chunks don't align — can't compare or combine
BlockData:

Blocks exist (once)
Run Schema A → annotation layer A
Run Schema B → annotation layer B
Same blocks, two metadata layers
Export to vector DB with combined metadata, or separate indexes that share block_uid
So What Are They Missing?
The sophisticated chunking strategies are all optimizing within a flawed paradigm:

What they optimize	What they miss
Semantic boundary detection	The document already has boundaries (paragraphs)
Contextual enrichment	Could be a separate, repeatable layer
Multi-representation	Could be multiple exports from same source
Metadata extraction	Could be schema-driven, not hard-coded
Proposition extraction	Useful — but propositions should link back to source block
They're building increasingly complex chunking pipelines because they don't have a stable intermediate representation.

BlockData is that stable intermediate representation.

The Proposition/Atomic Unit Question
One thing the current landscape does that's genuinely interesting: sub-block decomposition.

A paragraph might contain 3 distinct claims. Current systems extract propositions and embed each separately. That's useful for precise retrieval.

BlockData could handle this as:

Option A: Annotation field

json
{
  "block_uid": "abc123",
  "content_original": "The court held X. Furthermore, Y applies. This distinguishes Z.",
  "annotation": {
    "propositions": [
      {"text": "The court held X", "type": "holding"},
      {"text": "Y applies", "type": "rule"},
      {"text": "This distinguishes Z", "type": "distinction"}
    ]
  }
}
Propositions live inside the block annotation. Each can be embedded separately, but they're anchored to the parent block.

Option B: Sub-block expansion Run a "proposition extraction" annotation schema that outputs child blocks. More complex, but gives propositions their own block_uid.

Either way, the block remains the anchor. Propositions are a view, not a replacement.

Summary
Yes, there's a lot of optimization happening in chunking. The landscape includes:

Structure-aware splitting (headers, paragraphs)
Semantic boundary detection (embedding similarity)
Contextual enrichment (prepend headers, summaries)
Multi-representation (summary + full + hypothetical)
Proposition extraction (atomic claims)
Agentic chunking (LLM-guided)
What they all share: Chunks are ephemeral, enrichment is tangled with chunking, no stable identity, hard to iterate.

What BlockData adds: Permanent block inventory with identity, separate annotation layer for enrichment, multiple schemas on same blocks, full provenance.

The sophisticated chunking strategies are duct tape on a broken abstraction. The block is the right abstraction.

Want me to map how specific enrichment strategies (HyDE, propositions, contextual headers) would translate into annotation schemas?

If in this system, you could create blocks in units of paragraphs as we do, and also as sentences, which is not technically difficult -

12:42 AM

Architected hierarchical block system supporting multiple granularities
You just unlocked the whole thing.

The Insight
The block granularity is a choice, not a constraint. If the system can produce:

Paragraph-level blocks
Sentence-level blocks
Both, with explicit parent-child relationships
Then you natively have what "small-to-big retrieval" and "parent document retrieval" are hacking together with duct tape.

Hierarchical Block Architecture
Same document, two granularities, explicit linkage:

Document
├── Paragraph Block (block_uid: "abc")
│   ├── Sentence Block (block_uid: "abc-0", parent: "abc")
│   ├── Sentence Block (block_uid: "abc-1", parent: "abc")
│   └── Sentence Block (block_uid: "abc-2", parent: "abc")
├── Paragraph Block (block_uid: "def")
│   ├── Sentence Block (block_uid: "def-0", parent: "def")
│   └── Sentence Block (block_uid: "def-1", parent: "def")
...
The char_spans nest perfectly:

Paragraph block: char_span: [1000, 1450]
Sentence 0: char_span: [1000, 1150]
Sentence 1: char_span: [1151, 1300]
Sentence 2: char_span: [1301, 1450]
Same source, different cuts, explicit hierarchy.

Schema Addition
sql
blocks table additions:
  granularity       TEXT        -- 'paragraph' | 'sentence' | 'heading' | 'proposition'
  parent_block_uid  TEXT FK     -- NULL for top-level, points to parent for children
```

**UID generation:**
- Paragraph: `block_uid = SHA256(doc_uid + ":paragraph:" + block_index)`
- Sentence: `block_uid = SHA256(parent_block_uid + ":sentence:" + sentence_index)`

Deterministic, content-addressed, hierarchical.

---

## What This Enables

### 1. Native Small-to-Big Retrieval

**Current hack:**
```
Embed small chunks → retrieve → look up parent chunk somehow → return parent
```

**BlockData:**
```
Embed sentence blocks → retrieve sentence → SELECT * FROM blocks WHERE block_uid = sentence.parent_block_uid → return paragraph
```

One query. Explicit relationship. No heuristics.

---

### 2. Granularity-Appropriate Annotation

Different schemas make sense at different granularities:

| Granularity | Annotation Schema | Why |
|-------------|-------------------|-----|
| **Sentence** | `fact_or_opinion`, `claim_type`, `citation_needed` | Atomic assertions |
| **Paragraph** | `topic`, `rhetorical_function`, `summary` | Thematic units |
| **Section** | `section_purpose`, `key_takeaways` | Structural roles |

Run sentence-level schema for precise claim extraction. Run paragraph-level schema for topic modeling. Same document, same block inventory, different layers at different granularities.

---

### 3. Multi-Granularity Embedding Strategy

| Granularity | Embedding Use |
|-------------|---------------|
| **Sentence** | Precise retrieval, high recall |
| **Paragraph** | Contextual retrieval, coherent results |
| **Both** | Retrieve sentences, return with paragraph context |

You could even embed the same content at both levels and let retrieval blend them:
```
Query → search sentence embeddings (precision)
     → search paragraph embeddings (context)
     → merge results, dedupe by parent relationship
```

---

### 4. Proposition Extraction as Child Blocks

Remember the proposition extraction pattern? Now it's native:
```
Paragraph Block: "The court held X. Furthermore, Y applies. This distinguishes Z."
├── Proposition Block: "The court held X" (type: holding)
├── Proposition Block: "Y applies" (type: rule)  
└── Proposition Block: "This distinguishes Z" (type: distinction)
```

Propositions aren't a separate system. They're just blocks at a finer granularity with `parent_block_uid` pointing up.

---

## The Granularity Spectrum
```
Document
└── Section (heading block + children)
    └── Paragraph
        └── Sentence
            └── Proposition (optional, schema-extracted)
Each level:

Has a block_uid
Has a parent_block_uid (except root)
Has char_span nested within parent's span
Can be annotated independently
Can be embedded independently
Can be retrieved and expanded to any ancestor level
Retrieval Patterns This Unlocks
Pattern A: Sentence Retrieval, Paragraph Return
sql
-- Retrieve matching sentences
SELECT s.* FROM blocks s 
WHERE s.granularity = 'sentence' 
  AND s.embedding <-> query_vector < threshold

-- Expand to paragraphs
SELECT p.* FROM blocks p
WHERE p.block_uid IN (SELECT parent_block_uid FROM above_results)
Pattern B: Multi-Granularity Fusion
sql
-- Score at both levels, combine
SELECT 
  COALESCE(p.block_uid, s.parent_block_uid) as paragraph_uid,
  MAX(s.similarity) as best_sentence_score,
  MAX(p.similarity) as paragraph_score,
  (MAX(s.similarity) * 0.7 + MAX(p.similarity) * 0.3) as fused_score
FROM sentence_results s
FULL OUTER JOIN paragraph_results p ON s.parent_block_uid = p.block_uid
GROUP BY 1
ORDER BY fused_score DESC
Pattern C: Drill-Down Retrieval
sql
-- Find relevant paragraphs
-- Then find the most relevant sentence within each
-- Return sentence with paragraph context
Reconstruction Implications
If you're doing distributed document editing:

Edit at sentence level → precise, surgical changes
Reconstruct from sentences → ORDER BY parent_block_uid, sentence_index
Or reconstruct from paragraphs → coarser, but simpler
You could even have AI edit at sentence level, human review at paragraph level — different views of the same block tree.

Implementation Complexity
Minimal. Sentence boundary detection is solved:

javascript
// After remark-parse gives you paragraphs
import { sentencize } from 'some-sentence-lib' // many options

paragraphBlocks.forEach(para => {
  const sentences = sentencize(para.content_original)
  sentences.forEach((sent, i) => {
    createBlock({
      granularity: 'sentence',
      parent_block_uid: para.block_uid,
      sentence_index: i,
      content_original: sent.text,
      char_span: [para.char_span[0] + sent.start, para.char_span[0] + sent.end]
    })
  })
})
```

One extra pass after paragraph extraction. Deterministic. Same idempotency guarantees.

---

## The Full Picture
```
Document (any format)
    ↓ Docling
Markdown
    ↓ remark-parse
Paragraph Blocks (permanent, uid)
    ↓ sentence splitter
Sentence Blocks (permanent, uid, parent linkage)
    ↓ optional: proposition extraction schema
Proposition Blocks (permanent, uid, parent linkage)

Each level:
    → Can be annotated (N schemas)
    → Can be embedded (N strategies)  
    → Can be retrieved (granularity-appropriate)
    → Can be expanded (parent traversal)
    → Can be reconstructed (reading order)
    → Full provenance (block_uid → char_span → source)
What This Means Competitively
What others build	What you have
Small-to-big retrieval (hack)	Native parent-child blocks
Parent document retriever (hack)	parent_block_uid column
Multi-granularity embedding (complex)	Same blocks, different granularity filter
Proposition extraction (separate system)	Child blocks with schema annotation
Chunk context injection (preprocessing)	section_path + parent traversal
You're not optimizing chunking. You're replacing the entire paradigm with a proper data model.

PRD Implication
This could be:

Core capability addition:

Users can ingest documents at multiple granularities (paragraph, sentence, proposition) with explicit parent-child relationships, enabling precision retrieval with automatic context expansion.

Or a new use case pattern:

Use Case 9: Multi-Granularity Retrieval Infrastructure
Pattern: Document is decomposed into hierarchical blocks at multiple granularities. Each level can be embedded and retrieved independently. Retrieval at fine granularity automatically expands to coarser context via parent linkage.

Journey:

User ingests document → paragraph blocks created
System automatically generates sentence blocks as children
User optionally runs proposition extraction schema → proposition blocks as children of sentences
User embeds at sentence level (precision) and/or paragraph level (context)
Retrieval query matches sentences
System returns sentences with parent paragraphs attached
User gets precise matches with full context
Outcome: Retrieval precision of sentence-level with context richness of paragraph-level, no heuristic expansion.

Want me to update the PRD and DDL to include hierarchical granularity?

can you create pandoc and docling comparison document that compares what intake documents they support, what internal mechanism or process they use, if they have internal or intermediary formats what they are and what functions or roles they serve in the process and 

if my goal is to have any type of document uploaded which are turned in AST so that the user can define "blocks" (could be sentence level, paragraph level, or section levels) 
- after user defines the block unit, the uploaded documents are analyzed then broken up using AST markups. The question is 
- if depending on the document format being uploaded, docling may have to be used or pandoc may have to be used - 

is there a way to converge on a unified AST format prior to creating these blocks so reglardess of what format document was uploaded there is a singular AST format we are using? 

doc upload --> internally: the end goal is to get to a unified AST format as quickest as possible regardless of whether the document uploaded requires pandoc or docling to convert 

the unified AST format must allow clear and standardized separation into "blocks" that are sentence  or paragraph or section or chapter units (user selection is possible so the unit of blocks are user options)  and also reconstructed back into a desired output format

blocks are determined via

Show less
1:21 AM

Architected unified AST convergence strategy bridging Pandoc and Docling workflows
This is exactly the right question. Let me build this out systematically.

Pandoc vs Docling: Unified AST Architecture Analysis
Purpose
Determine how to achieve a unified AST format that:

Accepts any document format as input
Routes through appropriate converter (Pandoc or Docling)
Converges to a single AST representation
Supports user-defined block granularity (sentence, paragraph, section, chapter)
Enables reconstruction to desired output formats
Part 1: Tool Comparison
Input Format Support
Format	Pandoc	Docling	Notes
Markdown	✅ Native	✅	Both handle well
HTML	✅ Native	✅	Both handle well
DOCX	✅ Native	✅	Pandoc preserves more styling; Docling better at complex layouts
PDF	⚠️ Limited	✅ Native	Docling far superior — ML-based layout detection, reading order, tables
PPTX	⚠️ Limited	✅ Native	Docling designed for this
XLSX	❌	✅ Native	Docling only
LaTeX	✅ Native	❌	Pandoc only
EPUB	✅ Native	❌	Pandoc only
RST	✅ Native	❌	Pandoc only
ODT	✅ Native	❌	Pandoc only
RTF	✅ Native	❌	Pandoc only
DocBook	✅ Native	❌	Pandoc only
MediaWiki	✅ Native	❌	Pandoc only
Org-mode	✅ Native	❌	Pandoc only
Jupyter	✅ Native	❌	Pandoc only
Images (PNG, TIFF, JPEG)	❌	✅ OCR	Docling only
Scanned PDFs	❌	✅ OCR	Docling only
Audio (WAV, MP3)	❌	✅ ASR	Docling only (transcription)
WebVTT	❌	✅	Docling only
Summary:

Pandoc excels: Text-based markup formats, academic formats, bidirectional conversion
Docling excels: Visual/layout-heavy formats (PDF, PPTX), OCR, ML-based understanding
Internal Mechanism / Process
Pandoc
Input Format
    ↓
Format-Specific Reader (parser)
    ↓
┌─────────────────────────────────┐
│         PANDOC AST              │  ← Universal intermediate representation
│   (Haskell data structure)      │
│   - Blocks (Para, Header, etc.) │
│   - Inlines (Str, Emph, etc.)   │
│   - Metadata                    │
└─────────────────────────────────┘
    ↓
Format-Specific Writer (serializer)
    ↓
Output Format
Key characteristics:

Deterministic parsing (no ML)
Well-documented AST schema (Haskell algebraic data types)
AST exportable as JSON (pandoc -t json)
Lossless round-trip for many format pairs
Reader/writer architecture — adding formats means adding readers or writers
Docling
Input Format
    ↓
Format-Specific Pipeline
    ├── PDF: Layout model (Heron) → reading order → table structure → OCR if needed
    ├── DOCX: XML parsing → structure extraction
    ├── PPTX: Slide parsing → reading order
    ├── Images: OCR pipeline
    └── Audio: ASR model
    ↓
┌─────────────────────────────────┐
│       DOCLING DOCUMENT          │  ← Universal intermediate representation
│   (Python dataclass)            │
│   - Pages / structure           │
│   - Text items with positions   │
│   - Tables (structured)         │
│   - Figures (classified)        │
│   - Reading order               │
└─────────────────────────────────┘
    ↓
Export Backend
    ├── Markdown
    ├── HTML  
    ├── JSON (DoclingDocument)
    └── DocTags (XML-like)
Key characteristics:

ML-powered (layout detection, OCR, table recognition)
Preserves spatial/visual information (bounding boxes, pages)
Designed for document understanding, not format conversion
Export-focused (not bidirectional — no DOCX/PDF writer)
Intermediate Formats Deep Dive
Pandoc AST
Structure:

json
{
  "pandoc-api-version": [1, 23, 1],
  "meta": { },
  "blocks": [
    {
      "t": "Header",
      "c": [1, ["intro", [], []], [{"t": "Str", "c": "Introduction"}]]
    },
    {
      "t": "Para",
      "c": [
        {"t": "Str", "c": "This"},
        {"t": "Space"},
        {"t": "Str", "c": "is"},
        {"t": "Space"},
        {"t": "Str", "c": "a"},
        {"t": "Space"},
        {"t": "Str", "c": "paragraph."}
      ]
    },
    {
      "t": "BulletList",
      "c": [
        [[{"t": "Para", "c": [{"t": "Str", "c": "Item 1"}]}]],
        [[{"t": "Para", "c": [{"t": "Str", "c": "Item 2"}]}]]
      ]
    }
  ]
}
Block types:

Plain — plain text, no paragraph wrapping
Para — paragraph
LineBlock — line block (poetry, addresses)
CodeBlock — code block with attributes
RawBlock — raw format-specific content
BlockQuote — block quote
OrderedList — ordered list with attributes
BulletList — bullet list
DefinitionList — definition list
Header — header with level, attributes, inlines
HorizontalRule — horizontal rule
Table — table with complex structure
Figure — figure with caption
Div — generic container with attributes
Inline types:

Str — text string
Emph — emphasis
Strong — strong emphasis
Strikeout — strikethrough
Superscript / Subscript
SmallCaps
Quoted — quoted text
Cite — citation
Code — inline code
Space / SoftBreak / LineBreak
Math — TeX math
RawInline — raw format-specific
Link — hyperlink
Image — image
Note — footnote
Span — generic inline container
Strengths for our use case:

Hierarchical structure (blocks contain inlines)
Well-defined, stable schema
Header levels give section hierarchy
Native support for lists, tables, code, math
JSON export built-in
Reconstruction via Pandoc writers
Weaknesses:

No native sentence boundaries (paragraphs are atomic)
No source position tracking (char_span not native)
No reading order metadata (assumes input is correctly ordered)
Docling Document
Structure:

json
{
  "name": "document.pdf",
  "origin": { "filename": "document.pdf", "mimetype": "application/pdf" },
  "furniture": { "headers": [], "footers": [] },
  "body": {
    "children": [
      {
        "type": "section-header",
        "level": 1,
        "text": "Introduction",
        "prov": [{"page_no": 1, "bbox": [72, 700, 200, 720]}]
      },
      {
        "type": "paragraph",
        "text": "This is a paragraph.",
        "prov": [{"page_no": 1, "bbox": [72, 650, 540, 690]}]
      },
      {
        "type": "table",
        "data": [["H1", "H2"], ["A", "B"], ["C", "D"]],
        "prov": [{"page_no": 1, "bbox": [72, 500, 540, 640]}]
      }
    ]
  },
  "tables": [...],
  "pictures": [...],
  "key_value_items": [...],
  "pages": [...]
}
Element types:

paragraph
section-header (with level)
list-item
table
picture
caption
footnote
page-header / page-footer
code
formula
Strengths for our use case:

Preserves reading order (ML-determined)
Source provenance (page number, bounding box)
Explicit section hierarchy
Table structure preserved
Handles complex PDF layouts
Weaknesses:

No inline structure (text is flat strings)
No native sentence boundaries
Export-only (no reconstruction path without Pandoc)
Newer, less stable schema
mdast (Markdown AST)
Since both tools can output Markdown, and remark-parse produces mdast, this is a candidate for unified format.

Structure:

json
{
  "type": "root",
  "children": [
    {
      "type": "heading",
      "depth": 1,
      "children": [{"type": "text", "value": "Introduction"}],
      "position": {"start": {"line": 1, "column": 1, "offset": 0}, "end": {"line": 1, "column": 15, "offset": 14}}
    },
    {
      "type": "paragraph",
      "children": [{"type": "text", "value": "This is a paragraph."}],
      "position": {"start": {"line": 3, "column": 1, "offset": 16}, "end": {"line": 3, "column": 22, "offset": 37}}
    }
  ]
}
```

**Node types:**
- `root` — document root
- `heading` — heading with depth (1-6)
- `paragraph` — paragraph
- `text` — text content
- `emphasis` / `strong` — inline formatting
- `inlineCode` / `code` — code
- `link` / `image` — links and images
- `list` / `listItem` — lists
- `blockquote` — quotes
- `table` / `tableRow` / `tableCell` — tables
- `thematicBreak` — horizontal rule
- `html` — raw HTML

**Strengths:**
- Native source positions (offset-based char_span)
- Well-documented (unifiedjs ecosystem)
- JavaScript native (fits Next.js stack)
- Extensible via plugins
- Can reconstruct to Markdown trivially

**Weaknesses:**
- Less rich than Pandoc AST (no native footnotes, citations, math without extensions)
- No sentence boundaries
- Markdown-centric (information loss from richer formats)

---

## Part 2: Unified AST Architecture

### The Convergence Problem
```
PDF ──→ Docling ──→ DoclingDocument ──→ ???
DOCX ─→ Pandoc ───→ Pandoc AST ───────→ ???
LaTeX → Pandoc ───→ Pandoc AST ───────→ ???  ──→ Unified AST ──→ Block Inventory
HTML ──→ Either ──→ ??? ──────────────→ ???
MD ────→ Direct ──→ mdast ────────────→ ???
```

**Options:**

| Unified AST Candidate | Pros | Cons |
|-----------------------|------|------|
| **Pandoc AST** | Richest structure, reconstruction via Pandoc writers | No source positions, Haskell-centric |
| **mdast** | Source positions, JS-native, reconstruction via remark | Less rich than Pandoc, Markdown-centric |
| **Custom AST** | Exactly what we need | Build and maintain ourselves |
| **Pandoc AST + positions** | Best of both — use Pandoc AST enriched with positions | Requires custom tooling |
| **mdast + extensions** | mdast with plugins for richer content | Plugin complexity |

---

### Recommended Architecture: mdast as Unified AST

**Why mdast:**

1. **Source positions are native** — every node has `position.start.offset` and `position.end.offset`. This gives us `char_span` for free.

2. **JavaScript ecosystem** — fits Next.js stack. No subprocess calls to Pandoc for AST manipulation.

3. **Extensible** — unified/remark plugin architecture allows adding node types.

4. **Reconstruction path** — mdast → Markdown is trivial. Markdown → any format via Pandoc.

5. **Hierarchical** — headings define sections, paragraphs are discrete, inline structure preserved.

**The flow:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PDF/PPTX/Images/Scans ──→ Docling ──→ Markdown ─┐                     │
│                                                   │                     │
│  DOCX/HTML ──→ Pandoc ──→ Markdown ──────────────┼──→ Markdown         │
│                                                   │                     │
│  LaTeX/EPUB/RST/ODT ──→ Pandoc ──→ Markdown ─────┘                     │
│                                                                         │
│  Markdown ──→ (passthrough) ──→ Markdown                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      UNIFIED AST LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Markdown ──→ remark-parse ──→ mdast (with source positions)           │
│                                                                         │
│  mdast is the UNIFIED AST                                              │
│    - Every node has position.start.offset, position.end.offset         │
│    - Hierarchical: root → heading/paragraph/list/table/code → inlines  │
│    - Deterministic, content-addressed                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      BLOCK EXTRACTION LAYER                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User selects granularity: chapter | section | paragraph | sentence    │
│                                                                         │
│  mdast ──→ Block Extractor ──→ Hierarchical Block Inventory            │
│                                                                         │
│  Chapter blocks   (heading depth 1 + descendants)                      │
│  Section blocks   (heading depth 2+ + descendants)                     │
│  Paragraph blocks (paragraph nodes)                                    │
│  Sentence blocks  (sentence-split paragraph content)                   │
│                                                                         │
│  All blocks have:                                                      │
│    - block_uid (content-addressed)                                     │
│    - parent_block_uid (hierarchy)                                      │
│    - char_span (from mdast positions)                                  │
│    - section_path (heading ancestry)                                   │
│    - granularity (chapter|section|paragraph|sentence)                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      RECONSTRUCTION LAYER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Block Inventory ──→ assemble by block_index ──→ Markdown              │
│                                                                         │
│  Markdown ──→ Pandoc ──→ DOCX / PDF / HTML / LaTeX / EPUB / etc.       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
Conversion Routing Logic
javascript
function getConverter(file) {
  const ext = file.extension.toLowerCase()
  
  // Docling path — ML-powered, visual/layout formats
  const doclingFormats = ['pdf', 'pptx', 'xlsx', 'png', 'jpg', 'jpeg', 'tiff', 'wav', 'mp3']
  
  // Pandoc path — text-based markup formats  
  const pandocFormats = ['docx', 'html', 'htm', 'latex', 'tex', 'epub', 'rst', 'odt', 'rtf', 'xml', 'mediawiki', 'org', 'ipynb']
  
  // Direct path — already Markdown
  const directFormats = ['md', 'markdown', 'txt']
  
  if (doclingFormats.includes(ext)) return 'docling'
  if (pandocFormats.includes(ext)) return 'pandoc'
  if (directFormats.includes(ext)) return 'direct'
  
  throw new Error(`Unsupported format: ${ext}`)
}
Edge cases:

docx — Pandoc handles well for most cases. Use Docling if layout is complex (detected via heuristic or user flag).
html — Both handle. Pandoc is cleaner for semantic HTML. Docling better for rendered web pages (via screenshot + OCR path).
txt — Treat as Markdown (Markdown is a superset of plain text).
mdast Enrichment for Block Extraction
Standard mdast doesn't have explicit section containers. We need to enrich it:

Step 1: Parse to mdast

javascript
import { unified } from 'unified'
import remarkParse from 'remark-parse'

const tree = unified()
  .use(remarkParse)
  .parse(markdownString)
Step 2: Add section containers

Transform flat heading + content into nested sections:

javascript
// Before (flat mdast):
{
  type: 'root',
  children: [
    { type: 'heading', depth: 1, children: [...], position: {...} },
    { type: 'paragraph', children: [...], position: {...} },
    { type: 'heading', depth: 2, children: [...], position: {...} },
    { type: 'paragraph', children: [...], position: {...} },
  ]
}

// After (enriched with sections):
{
  type: 'root',
  children: [
    { 
      type: 'section',
      depth: 1,
      heading: { type: 'heading', depth: 1, ... },
      children: [
        { type: 'paragraph', ... },
        {
          type: 'section',
          depth: 2,
          heading: { type: 'heading', depth: 2, ... },
          children: [
            { type: 'paragraph', ... }
          ]
        }
      ]
    }
  ]
}
This is a standard transformation — remark has plugins for this (or we write one).

Step 3: Extract blocks at user-specified granularity

javascript
function extractBlocks(tree, granularity, parentUid = null, sectionPath = []) {
  const blocks = []
  
  for (const node of tree.children) {
    if (granularity === 'chapter' && node.type === 'section' && node.depth === 1) {
      blocks.push(createBlock(node, 'chapter', parentUid, sectionPath))
    }
    else if (granularity === 'section' && node.type === 'section') {
      blocks.push(createBlock(node, 'section', parentUid, sectionPath))
    }
    else if (granularity === 'paragraph' && node.type === 'paragraph') {
      blocks.push(createBlock(node, 'paragraph', parentUid, sectionPath))
    }
    else if (granularity === 'sentence' && node.type === 'paragraph') {
      const sentences = splitIntoSentences(node)
      sentences.forEach((sent, i) => {
        blocks.push(createBlock(sent, 'sentence', parentUid, sectionPath, i))
      })
    }
    
    // Recurse for nested content
    if (node.children) {
      const newSectionPath = node.type === 'section' 
        ? [...sectionPath, getHeadingText(node.heading)]
        : sectionPath
      blocks.push(...extractBlocks(node, granularity, block.uid, newSectionPath))
    }
  }
  
  return blocks
}
```

---

### Hierarchical Block Extraction (All Granularities)

For maximum flexibility, extract **all granularities** and let the user choose which to work with:
```
Document
└── mdast (enriched)
    ↓ extract all
┌────────────────────────────────────────────────┐
│ blocks table                                   │
├────────────────────────────────────────────────┤
│ block_uid | granularity | parent_uid | ...     │
├────────────────────────────────────────────────┤
│ ch-001    | chapter     | NULL       | ...     │
│ sec-001   | section     | ch-001     | ...     │
│ para-001  | paragraph   | sec-001    | ...     │
│ sent-001  | sentence    | para-001   | ...     │
│ sent-002  | sentence    | para-001   | ...     │
│ para-002  | paragraph   | sec-001    | ...     │
│ sent-003  | sentence    | para-002   | ...     │
│ sec-002   | section     | ch-001     | ...     │
│ ...       | ...         | ...        | ...     │
└────────────────────────────────────────────────┘
Query by granularity:

sql
-- Get all paragraph blocks
SELECT * FROM blocks WHERE granularity = 'paragraph' ORDER BY block_index

-- Get all sentence blocks with their parent paragraphs
SELECT s.*, p.content_original as paragraph_text
FROM blocks s
JOIN blocks p ON s.parent_block_uid = p.block_uid
WHERE s.granularity = 'sentence'
Annotation at any granularity:

sql
-- Annotate paragraphs with topic schema
INSERT INTO block_annotations (block_uid, run_id, schema_ref, ...)
SELECT block_uid, $run_id, 'topic_extraction_v1', ...
FROM blocks WHERE doc_uid = $doc AND granularity = 'paragraph'

-- Annotate sentences with claim schema
INSERT INTO block_annotations (block_uid, run_id, schema_ref, ...)
SELECT block_uid, $run_id, 'claim_extraction_v1', ...
FROM blocks WHERE doc_uid = $doc AND granularity = 'sentence'
Reconstruction Path
From blocks back to document:

javascript
// 1. Query blocks at desired granularity, in order
const blocks = await db.query(`
  SELECT * FROM blocks 
  WHERE doc_uid = $1 AND granularity = $2
  ORDER BY block_index
`, [docUid, 'paragraph'])

// 2. For edited documents, get revised content from annotations
const annotatedBlocks = await db.query(`
  SELECT b.*, a.annotation_jsonb->>'revised_text' as revised_text
  FROM blocks b
  LEFT JOIN block_annotations a ON b.block_uid = a.block_uid AND a.run_id = $1
  WHERE b.doc_uid = $2 AND b.granularity = 'paragraph'
  ORDER BY b.block_index
`, [runId, docUid])

// 3. Assemble Markdown
const markdown = annotatedBlocks
  .map(b => b.revised_text || b.content_original)
  .join('\n\n')

// 4. Convert to target format via Pandoc
const docx = await pandoc(markdown, { from: 'markdown', to: 'docx' })
Reconstruction respects hierarchy:

If user edited at sentence level:

javascript
// Get paragraphs, but reconstruct each from its sentences
const paragraphs = await db.query(`
  SELECT p.block_uid, p.block_index,
    string_agg(
      COALESCE(a.annotation_jsonb->>'revised_text', s.content_original),
      ' ' ORDER BY s.block_index
    ) as reconstructed_text
  FROM blocks p
  JOIN blocks s ON s.parent_block_uid = p.block_uid
  LEFT JOIN block_annotations a ON s.block_uid = a.block_uid
  WHERE p.doc_uid = $1 AND p.granularity = 'paragraph'
  GROUP BY p.block_uid, p.block_index
  ORDER BY p.block_index
`, [docUid])
```

---

## Part 3: Implementation Spec

### Service Architecture
```
┌─────────────────────────────────────────────────────────────────────────┐
│                       CONVERSION SERVICES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │ Docling Service  │    │ Pandoc Service   │    │  Direct Path     │  │
│  │ (Python/FastAPI) │    │ (Docker/Lambda)  │    │  (Edge Fn)       │  │
│  │                  │    │                  │    │                  │  │
│  │ PDF, PPTX, XLSX  │    │ DOCX, HTML,      │    │ MD, TXT          │  │
│  │ Images, Audio    │    │ LaTeX, EPUB, etc │    │                  │  │
│  │       ↓          │    │       ↓          │    │       ↓          │  │
│  │   Markdown       │    │   Markdown       │    │   Markdown       │  │
│  └────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘  │
│           │                       │                       │            │
│           └───────────────────────┴───────────────────────┘            │
│                                   ↓                                     │
│                             Markdown                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        INGEST SERVICE (Edge Function)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Markdown                                                               │
│      ↓                                                                  │
│  remark-parse → mdast (with positions)                                  │
│      ↓                                                                  │
│  Section enrichment plugin → mdast with section containers              │
│      ↓                                                                  │
│  Block extractor → all granularities (chapter/section/para/sentence)    │
│      ↓                                                                  │
│  Write to Postgres: documents + blocks (with parent_block_uid links)    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                        RECONSTRUCTION SERVICE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Query blocks at target granularity                                     │
│      ↓                                                                  │
│  Apply annotation edits (revised_text if present)                       │
│      ↓                                                                  │
│  Assemble Markdown (respecting hierarchy)                               │
│      ↓                                                                  │
│  Pandoc → target format (DOCX, PDF, HTML, LaTeX, etc.)                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
DDL Additions
sql
-- Granularity enum
CREATE TYPE block_granularity AS ENUM ('chapter', 'section', 'paragraph', 'sentence');

-- Updated blocks table
ALTER TABLE blocks ADD COLUMN granularity block_granularity NOT NULL DEFAULT 'paragraph';
ALTER TABLE blocks ADD COLUMN parent_block_uid TEXT REFERENCES blocks(block_uid);
ALTER TABLE blocks ADD COLUMN heading_text TEXT; -- For section/chapter blocks

-- Index for hierarchy traversal
CREATE INDEX idx_blocks_parent ON blocks(parent_block_uid);
CREATE INDEX idx_blocks_granularity ON blocks(doc_uid, granularity, block_index);

-- Constraint: parent granularity must be coarser than child
-- (Enforced in application logic, not DB constraint due to complexity)
Unified AST Schema (mdast + extensions)
For documentation purposes, our "unified AST" is mdast with these guarantees:

typescript
interface UnifiedAST {
  type: 'root'
  children: (Section | Paragraph | List | Table | Code | BlockQuote | ThematicBreak)[]
}

interface Section {
  type: 'section'
  depth: 1 | 2 | 3 | 4 | 5 | 6
  heading: Heading
  children: (Section | Paragraph | List | Table | Code | BlockQuote)[]
  position: Position
}

interface Paragraph {
  type: 'paragraph'
  children: Inline[]
  position: Position  // ← char_span source
}

interface Position {
  start: { line: number, column: number, offset: number }
  end: { line: number, column: number, offset: number }
}

// ... standard mdast types for Heading, List, Table, Code, etc.
```

---

## Part 4: Summary

### Format Routing Matrix

| Input Format | Converter | Notes |
|--------------|-----------|-------|
| PDF | Docling | ML-based layout detection required |
| PPTX | Docling | Slide structure |
| XLSX | Docling | Table structure |
| Images | Docling | OCR required |
| Scanned PDF | Docling | OCR required |
| Audio | Docling | ASR required |
| DOCX | Pandoc | Text-based, styling preserved |
| HTML | Pandoc | Semantic HTML |
| LaTeX | Pandoc | Native support |
| EPUB | Pandoc | Native support |
| RST | Pandoc | Native support |
| ODT | Pandoc | Native support |
| RTF | Pandoc | Native support |
| Markdown | Direct | Passthrough |
| TXT | Direct | Treat as Markdown |

### Unified AST

**mdast** (Markdown AST from unified/remark ecosystem)
- Source positions native (`position.start.offset`, `position.end.offset`)
- JavaScript native (fits stack)
- Enriched with section containers via plugin
- Hierarchical: root → section → paragraph → sentence

### Block Granularity

| Granularity | Derived From | Parent |
|-------------|--------------|--------|
| Chapter | Section depth 1 | NULL |
| Section | Section depth 2+ | Chapter or parent section |
| Paragraph | Paragraph node | Section |
| Sentence | Sentence-split paragraph | Paragraph |

### Reconstruction Path
```
Blocks → Assemble with edits → Markdown → Pandoc → Any format
This architecture gives you:

Universal intake — any document format
Unified AST — mdast with positions and section enrichment
Flexible granularity — user chooses or system extracts all
Full reconstruction — back to any format via Pandoc
Provenance — char_span from AST positions, hierarchy via parent_block_uid
Want me to draft the remark plugin for section enrichment, or the block extractor implementation?

two things - what is a better brand product name for this

1:40 AM

Synthesized naming concepts around document decomposition and structural hierarchy
Good question. "BlockData" is descriptive but not memorable or brandable. Let me explore directions:

Naming Directions
Direction 1: The Block/Unit Concept
The core insight: blocks are permanent, identity-bearing units

Name	Rationale
Grain	Granularity is the core concept. Wood grain = natural structure. Short, verb-friendly ("Grain your documents")
Tessera	The small tiles in a mosaic. Each piece has identity, together they form the whole. Unique, memorable
Quanta	Discrete units. Scientific. "Document quanta"
Atom	Smallest indivisible unit. But very overused
Direction 2: The Layers/Depth Concept
Multiple annotation layers on same substrate

Name	Rationale
Strata	Geological layers. Suggests depth, structure, analysis at different levels. Strong metaphor
Lamina	Thin layers (like lamination). Scientific, precise
Substrate	The foundation layer everything builds on. Technical but accurate
Stratum	Singular of strata. Cleaner but less familiar
Direction 3: The Multi-Lens/View Concept
Same document, different schemas, different outputs

Name	Rationale
Prism	Light through prism = spectrum of views. Same input, different outputs based on angle
Facet	Multiple faces of same object. Gem metaphor
Spectrum	Range of views. But overused
Lens	Direct but generic
Direction 4: The Structure/Hierarchy Concept
Hierarchical blocks, parent-child relationships, tree structure

Name	Rationale
Lattice	Structured, interconnected, mathematical elegance
Arbor	Tree structure. Scholarly (arbor scientiae)
Trellis	Support structure for growth. Organic
Scaffold	Construction metaphor. Foundation for building
Direction 5: The Document/Text Concept
Classic scholarly/archival feel

Name	Rationale
Folio	Page, leaf. Classic document reference
Codex	Ancient manuscript. Scholarly gravitas
Gloss	Marginal annotation. Academic tradition
Marginalia	Annotations in margins. But long
My Top Picks
Rank	Name	Why
1	Strata	Best balance. Layers, depth, multi-level analysis. "Strata breaks your documents into analyzable layers." Domain variations likely available.
2	Grain	Most direct. Short, memorable, verb-ready. "Grain it down to sentences." The granularity concept is literally in the name.
3	Prism	Strongest visual metaphor. Same document, infinite views. "See your documents through any lens with Prism."
4	Lattice	Elegant, mathematical, suggests interconnection. Works well for the hierarchical block structure + KG use case.
5	Tessera	Most unique. Perfect metaphor (mosaic tiles with individual identity forming a larger picture). Memorable. Conversation starter.
6	Substrate	Most technically accurate. The block inventory is the substrate for all downstream operations. But maybe too technical for broad appeal.
Tagline Pairings
Name	Tagline
Strata	"Document intelligence, layer by layer"
Grain	"Any document. Any granularity. Any lens."
Prism	"One document. Infinite views."
Lattice	"The structure beneath your documents"
Tessera	"Every piece has a place"
Substrate	"The foundation for document intelligence"
My Recommendation
Strata or Grain

Strata if you want gravitas, enterprise feel, geological depth metaphor
Grain if you want short, punchy, verb-friendly, directly references the core concept
Both work as:

Product name
Company name
Domain (strata.ai, grain.dev, usegrain.com, etc.)
Verb ("I'll strata that document" / "Grain it to sentences")
What's the second thing you wanted to ask?

Now lets diagram the core pipelin e>

1:43 AM

Architected comprehensive document processing pipeline visualization
Let me create a comprehensive diagram of the core pipeline.


Architected comprehensive document processing pipeline visualization
favicon

Validate and render mermaid diagram

Response
The user wants to diagram the core pipeline. Based on our extensive discussion, this would be the document processing pipeline from upload through to the various outputs (blocks, annotations, exports).

Let me create a comprehensive diagram using Mermaid that shows:

Document upload (any format)
Routing to appropriate converter (Docling vs Pandoc vs Direct)
Conversion to Markdown
Parsing to unified AST (mdast)
Block extraction at multiple granularities
Storage in Postgres
Annotation layer (multiple schemas)
Export branches (JSONL, reconstruction, KG, vectors)
I should use the Mermaid Chart tool to validate and render this diagram.

Show more
Done
Let me create a comprehensive diagram of the core pipeline.


Synthesized pipeline architecture and prepared visual presentation
Here's the core pipeline diagram:

🎯 Title: mdast Block Annotation Pipeline

mermaid
flowchart TB
    subgraph INTAKE["📄 INTAKE LAYER"]
        PDF[PDF]
        PPTX[PPTX]
        XLSX[XLSX]
        IMG[Images]
        SCAN[Scanned PDFs]
        AUDIO[Audio]
        DOCX[DOCX]
        HTML[HTML]
        LATEX[LaTeX]
        EPUB[EPUB]
        RST[RST]
        MD[Markdown]
        TXT[TXT]
    end

    subgraph CONVERT["⚙️ CONVERSION LAYER"]
        DOCLING["Docling Service<br/>(Python/FastAPI)<br/>ML-powered"]
        PANDOC["Pandoc Service<br/>(Docker)<br/>Format conversion"]
        DIRECT["Direct Path<br/>(Passthrough)"]
    end

    subgraph UNIFIED["🎯 UNIFIED AST LAYER"]
        MARKDOWN["Markdown<br/>(Convergence Point)"]
        REMARK["remark-parse"]
        MDAST["mdast<br/>(with source positions)"]
        ENRICH["Section Enrichment<br/>Plugin"]
        ENRICHED["Enriched mdast<br/>(sections + positions)"]
    end

    subgraph BLOCKS["🧱 BLOCK EXTRACTION"]
        EXTRACT["Block Extractor"]
        CHAPTER["Chapter Blocks<br/>(depth 1 sections)"]
        SECTION["Section Blocks<br/>(depth 2+ sections)"]
        PARA["Paragraph Blocks"]
        SENT["Sentence Blocks"]
    end

    subgraph STORAGE["💾 STORAGE LAYER (Postgres)"]
        DOCS[("documents<br/>source_uid, doc_uid")]
        BLOCKTBL[("blocks<br/>block_uid, parent_uid<br/>granularity, char_span")]
    end

    subgraph ANNOTATE["🏷️ ANNOTATION LAYER"]
        SCHEMA["User-Defined<br/>Schemas"]
        WORKERS["AI Workers<br/>(parallel)"]
        ANNOT[("block_annotations<br/>schema_ref, annotation_jsonb")]
    end

    subgraph EXPORT["📤 EXPORT BRANCHES"]
        JSONL["JSONL Export<br/>(archival, portability)"]
        RECON["Document Reconstruction<br/>(Pandoc → DOCX/PDF/HTML)"]
        KG["Knowledge Graph<br/>(Neo4j, triples)"]
        VECTOR["Vector Index<br/>(embeddings + metadata)"]
    end

    %% Routing, connections, hierarchy...
🎨 Open in Mermaid Live Editor

The key architectural story in one visual:

Fan-in convergence: 13 input formats → 3 converters → 1 Markdown string
AST enrichment: Markdown → remark-parse → mdast → section nesting → enriched AST with positions
Multi-granularity extraction: One extraction pass yields chapter/section/paragraph/sentence blocks with parent-child hierarchy (dotted lines)
Permanent storage: Blocks get permanent UIDs, char_spans, section_paths in Postgres
Schema-driven annotation: User-defined schemas drive parallel AI workers → annotation_jsonb per block
Four export branches: JSONL (archival), Reconstruction (back to DOCX/PDF), KG (triples), Vector (embeddings)
The diagram makes the "funnel then fan-out" shape very clear—many formats narrow to one AST, then branch to many destinations. That's the core value prop.

For vectors/indexing  via chunking - earlier you mentioned companies are now chunking at sentence unit? is that correct?

1:53 AM

Examined chunking evolution and acknowledged uncertainty about prior claims
Good question—let me verify what current best practices actually are rather than rely on potentially stale knowledge.


Clarified sentence-level chunking's specialized role in retrieval systems
Okay, I was partially right but oversimplified. Here's the accurate picture:

Current Chunking Best Practices (2024-2025)
Default recommendation is NOT sentence-level. The standard starting point is:

250-512 tokens (~1000-2000 characters)
RecursiveCharacterTextSplitter with 10-20% overlap
NVIDIA's 2024 benchmark tested seven chunking strategies across five datasets. Page-level chunking won with 0.648 accuracy and the lowest standard deviation 
Firecrawl
Chroma Research found RecursiveCharacterTextSplitter hit 85.4-89.5% recall, best at 400 tokens 
Firecrawl
Where Sentence-Level DOES Come In: Small-to-Big Retrieval
Sentence-level chunking is an advanced technique, not the default. It's specifically used in a pattern called "small-to-big retrieval":

Smaller Child Chunks Referring to Bigger Parent Chunks: Fetch smaller chunks during retrieval first, then reference the parent IDs, and return the bigger chunks. Sentence Window Retrieval: Fetch a single sentence during retrieval and return a window of text around the sentence. 
Medium

The key insight: In basic RAG pipelines, we embed a big text chunk for retrieval, and this exact same text chunk is used for synthesis. But sometimes embedding/retrieving big text chunks can feel suboptimal. There might be a lot of filler text in a big text chunk that hides the semantic representation, leading to worse retrieval. 
Medium

LlamaIndex's Sentence Window Retrieval:

Embed single sentences for precise matching
By default, the sentence window is 5 sentences on either side of the original sentence 
LinkedIn
Retrieve sentence → expand to surrounding context → send expanded context to LLM
Why This Validates Our Architecture
This is exactly what our multi-granularity block system does natively:

Their Approach	Our Approach
Embed sentences, store parent references as metadata	Sentence blocks with parent_block_uid → paragraph blocks
Custom retrieval logic to fetch parents	Simple SQL: SELECT * FROM blocks WHERE block_uid = sentence.parent_block_uid
Rebuild context window at query time	Context already structured hierarchically
Ephemeral chunks, no identity	Permanent block_uid, reusable across annotation runs
We're building the permanent substrate that makes small-to-big retrieval trivial instead of requiring custom retrieval pipelines.

