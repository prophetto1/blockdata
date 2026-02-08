references exist in:
E:\writing-system\ref-repos\learning-commons-evaluators
E:\writing-system\ref-repos\learning-commons-kg
E:\agchain\legal-10\datasets



Learning Commons: Two-Repo Architecture Analysis
How They're Configured
learning-commons-kg (the Knowledge Graph)

A data repository, not an application — contains JSONL exports, API tutorials, and CI/CD for versioned releases
The actual graph lives on the Learning Commons Platform (hosted service); the repo provides three access patterns:
REST API (api.learningcommons.org/knowledge-graph/v0) — authenticated, private beta
MCP Server — private beta, lets AI models query standards directly
JSONL exports via CDN (cdn.learningcommons.org/knowledge-graph/v1.3.0/exports/) — public, two files: nodes.jsonl + relationships.jsonl
Licensed CC-BY-4.0, versioned via release-please (currently v1.3.0)
Tutorials in both JS and Python show how to query the API
learning-commons-evaluators (the AI Evaluators)

A Python 3.10+ Jupyter notebook application — three evaluators run as LangChain chains
Dependencies: langchain, langchain_google_genai/langchain_openai, textstat, pydantic, pandas
Requires API keys: GOOGLE_API_KEY (primary, Gemini 2.5-pro) and optionally OPENAI_API_KEY
No database, no hosted service — stateless functions that take text in and return structured JSON out
Licensed MIT
Constituent Parts
KG repo — 4 entity types, 4 relationship types:

Entity	Role
StandardsFramework	Container for a jurisdiction's standards (e.g., "California Mathematics")
StandardsFrameworkItem	Individual standard (e.g., CCSS 6.EE.B.5) with code, description, grade, subject
LearningComponent	Granular decomposed skill that supports a standard
Factor	Learner variability factor (from Digital Promise)
Relationship	From → To	Payload
SUPPORTS	Standard → LearningComponent	—
PREREQUISITE	Standard → Standard	learning progression
CROSSWALK	Standard → Standard	jaccard, sharedLCCount, stateLCCount, ccssLCCount
RELEVANT_TO_STANDARD	Factor → Standard	—
Evaluators repo — 3 evaluator modules:

Evaluator	Input	Output
Grade Level Appropriateness	text passage	{ grade, alternative_grade, scaffolding_needed, reasoning }
Sentence Structure	text + optional ground truth	sentence type counts, complexity metrics, 4-level rating
Vocabulary Complexity	text + grade level	{ tier_2_words, tier_3_words, archaic_words, vocabulary_complexity, reasoning }
All three use a 4-level complexity scale: Slightly → Moderately → Very → Exceedingly Complex.

How They Interoperate
The two repos share the same architectural pattern but are loosely coupled:


                   ┌─────────────────────────┐
                   │  Knowledge Graph (KG)    │
                   │  Standards + LCs +       │
                   │  Crosswalks + Prereqs    │
                   └────────┬────────────────┘
                            │
                  provides structured context
                            │
                            ▼
                   ┌─────────────────────────┐
                   │  Evaluators             │
                   │  (LLM-as-Judge chains)  │
                   │  Text → Structured JSON │
                   └─────────────────────────┘
The KG provides domain context that evaluators consume:

The vocabulary evaluator uses curriculum topic progressions by grade (embedded directly in its prompts, not fetched live from the KG API) to determine what vocabulary a student at a given grade "should know"
The prerequisite practice tutorial in the KG repo uses OpenAI GPT-4 to generate questions — the same LLM-as-structured-output pattern the evaluators use
Both repos produce structured JSON with explicit reasoning chains
They are not wired together at runtime. The KG data is baked into evaluator prompts as reference material, not queried dynamically. The integration is conceptual (shared domain model and output philosophy) rather than mechanical (no API calls between them).

What's Needed to Make Them Operational
KG repo:

An API_KEY from Learning Commons (private beta) for REST/MCP access
OR: download the public JSONL exports and load into your own graph DB (Neo4j, etc.)
Node.js 18+ or Python 3.8+ for tutorials
Evaluators repo:

Python 3.10+, make install to set up venv
GOOGLE_API_KEY (Gemini 2.5-pro) — this is the primary LLM
Run via make jupyter (Jupyter Lab)
Each evaluation takes ~1 min (LLM call latency)
No batching or parallelism built in
How the KGs Are Developed
The Learning Commons KG is built through a domain-expert curation pipeline:

Source ingestion: Academic standards from 1EdTech (CASE format) — Common Core + 15+ state standards
Expert decomposition: Domain experts break each standard into granular Learning Components (skills)
Relationship derivation:
SUPPORTS edges connect standards to their LCs
CROSSWALK edges are computed from shared LC overlap between standards (Jaccard similarity on LC sets)
PREREQUISITE edges represent expert-defined learning progressions
Versioned release: New state coverage added incrementally (v1.1 → v1.2 → v1.3), with JSONL exports regenerated per release
The KG is not auto-generated from text. It's a curated knowledge structure with quantified alignment metrics.

Mapping to MD-Annotate v2: Supreme Court Corpus KG
Now for the critical question: how would you use the MD-Annotate schema system to build a knowledge graph from 28,000 Supreme Court cases?

The Parallel
Learning Commons	MD-Annotate (your platform)
Standard (text of one standard)	Block (one paragraph of one case)
LearningComponent (decomposed skill)	Extracted entity/relation from user_defined.data
SUPPORTS edge	Derived from schema extraction (block → entity)
CROSSWALK edge	Derived from shared entities across cases
PREREQUISITE edge	Derived from citation/precedent extraction
Expert annotators	AI workers processing blocks with user-defined schemas
JSONL export (nodes + relationships)	JSONL export (immutable + user_defined)
Operational Plan: 5 Schemas, Layered KG Build
The key insight is that you wouldn't build the KG in one schema — you'd layer multiple schemas over the same immutable blocks, each extracting different facets, then compose the KG from all of them.

Schema 1: scotus_structural_v1 — Paragraph classification


{
  "schema_ref": "scotus_structural_v1",
  "fields": {
    "rhetorical_function": { "enum": ["issue_framing", "fact_narrative", "rule_statement", 
                                       "rule_application", "holding", "dicta", "procedural_disposition"] },
    "reasoning_type": { "enum": ["textual", "analogical", "policy", "historical", null] }
  }
}
This is Use Case 1 from your schemas doc. It classifies every paragraph's structural role. This becomes the node label layer — you know which blocks are holdings, which are dicta, which are rule statements.

Schema 2: scotus_entities_v1 — Named entity extraction


{
  "schema_ref": "scotus_entities_v1",
  "fields": {
    "parties": [{ "name": "str", "role": "petitioner|respondent|amicus|intervenor" }],
    "judges": [{ "name": "str", "role": "author|concurring|dissenting" }],
    "courts": ["str"],
    "statutes": [{ "citation": "str", "short_name": "str|null" }],
    "places": ["str"],
    "dates": [{ "date": "str", "context": "str" }]
  }
}
This produces KG nodes: Party, Judge, Court, Statute, Place. Each entity is anchored to a specific block_uid — full provenance.

Schema 3: scotus_citations_v1 — Citation graph extraction


{
  "schema_ref": "scotus_citations_v1",
  "fields": {
    "cases_cited": [{
      "case_name": "str",
      "citation": "str",
      "treatment": "followed|distinguished|overruled|cited|discussed",
      "principle_cited_for": "str|null"
    }],
    "statutes_cited": [{ "citation": "str", "interpretation": "str|null" }]
  }
}
This produces KG edges: Case → CITES → Case, with treatment type and the principle being cited. This is directly analogous to the Learning Commons PREREQUISITE relationship — it's the legal precedent graph.

Schema 4: scotus_legal_rules_v1 — Rule and holding extraction


{
  "schema_ref": "scotus_legal_rules_v1",
  "fields": {
    "legal_principle": "str|null",
    "test_articulated": { "name": "str|null", "elements": ["str"] },
    "holding": "str|null",
    "standard_of_review": "str|null"
  }
}
This produces KG nodes of type LegalRule/Test/Holding — the substantive doctrinal content. Analogous to Learning Commons' LearningComponent (the decomposed atomic knowledge unit).

Schema 5: scotus_topic_classification_v1 — Subject matter tagging


{
  "schema_ref": "scotus_topic_classification_v1",
  "fields": {
    "primary_topic": { "enum": ["constitutional", "criminal", "civil_rights", "administrative", 
                                 "commercial", "property", "labor", "tax", "environmental", "other"] },
    "constitutional_provisions": ["str"],
    "legal_domain": "str",
    "keyword_concepts": ["str"]
  }
}
This produces classification labels — analogous to Learning Commons' StandardsFramework (the organizing taxonomy).

The KG Assembly Pipeline
After running all 5 schemas across 28,000 cases (~420,000 blocks x 5 schemas = ~2.1M overlay rows), you export JSONL per run and compose the KG:


Phase 1: Ingest 28,000 .md files → immutable block inventory
          (~420,000 blocks with stable block_uids)

Phase 2: Run 5 schemas → 5 JSONL exports per case
          Schema 1: structural classification (node labels)
          Schema 2: entity extraction (KG nodes)
          Schema 3: citation extraction (KG edges)
          Schema 4: rule/holding extraction (KG nodes)
          Schema 5: topic classification (taxonomy)

Phase 3: KG assembly (post-export pipeline)
          ├─ Extract entities from Schema 2 → deduplicate → create nodes
          ├─ Extract citations from Schema 3 → resolve to case nodes → create CITES edges
          ├─ Extract rules from Schema 4 → create LegalRule nodes → link to block provenance
          ├─ Extract topics from Schema 5 → create taxonomy edges
          └─ Cross-link: shared entities across cases = implicit CROSSWALK edges
              (analogous to Learning Commons' Jaccard-based crosswalks)
What This Gives You (Analogous to Learning Commons)
Learning Commons Query	Your SCOTUS KG Equivalent
"Find all standards aligned to CCSS 6.EE.B.5"	"Find all cases that cite Marbury v. Madison"
"What learning components support this standard?"	"What legal principles does this case articulate?"
"Show prerequisites for this standard"	"Show the citation chain leading to this holding"
"Crosswalk California to Common Core"	"Crosswalk 5th Circuit to Supreme Court on 4th Amendment search doctrine"
"Generate practice for prerequisite skills"	"Generate exam questions targeting the rule from Miranda v. Arizona"
What's Missing vs. Learning Commons (and How to Close It)
Gap	Learning Commons Has	You Need
Entity resolution	Curated by domain experts	An entity deduplication pipeline (string matching + LLM disambiguation) to merge "Brown, CJ" / "Chief Justice Brown" / "John Brown" into one node
Crosswalk computation	Jaccard over shared LearningComponents	Jaccard over shared entities/citations between cases — computed post-export from Schema 2+3 data
Graph storage	Hosted platform + JSONL export	You'd need a graph DB (Neo4j, or Supabase + a graph extension) to store and query the assembled KG
Progression/prerequisite edges	Expert-curated	Derivable from citation treatment: followed = builds on; overruled = supersedes; distinguished = narrows
MCP server	Private beta for AI access	An MCP tool wrapping your KG queries — so an AI can ask "what cases discuss qualified immunity?" and get structured results
Making It Operational — Concrete Steps
Corpus preparation: Get all 28,000 case texts as .md files (one per case). If they're in another format, the Docling track handles conversion.

Batch ingest: Upload all 28,000 files. The platform creates ~420,000 immutable blocks (assuming ~15 paragraphs/case average).

Schema authoring: Write the 5 schema JSON artifacts above (or start with 1-2 and iterate). Each schema includes instructions and reference material in the JSON body — the worker gets everything it needs per block.

Run creation: Create 28,000 runs per schema (one per case). The platform creates ~420,000 pending overlay rows per schema.

Worker execution: AI workers claim and process blocks. At 28,000 cases x 5 schemas, this is ~2.1M block evaluations. With concurrent workers (the atomic claim pattern from your architecture), throughput scales linearly with worker count.

Export: Export JSONL per run. Each line has immutable (the block) + user_defined (the schema output).

KG assembly: A post-export pipeline reads all 5 JSONL streams, extracts entities/relations, deduplicates, and loads into a graph DB. This is the step where you go from "annotated blocks" to "knowledge graph" — it's analogous to the Learning Commons team's expert curation step, but automated via the structured schema outputs.

Query layer: Build an MCP server or API over the graph DB so you (or AI tools) can query the assembled KG.

Steps 1-6 are what MD-Annotate v2 gives you natively. Steps 7-8 are the "Tier 3: Export connectors" from your platform roadmap — the KG assembly pipeline that consumes the platform's structured output.



Your legal-10 Database: What You Already Have
No DuckDB MCP server configured — I read the inventory files directly. Here's what's in the ~739MB DuckDB:

Data Assets (the foundation for your KG)
Table	Rows	What It Is
scdb_cases	29,021	Supreme Court Database — 55 columns of structured metadata per case (caseId, citation, term, chief justice, issue area, votes, disposition, ideology codes, etc.)
scotus_text_stats	27,733	Per-case text statistics (opinion chars, file bytes, syllabus chars)
shepards_edges	5,711,699	Citation treatment graph — citing/cited Lexis cites with treatment_norm and agree boolean
fowler_scores	27,846	Case authority scores (Fowler auth_score + pauth_score)
martin_quinn_scores	800	Justice ideology scores (Martin-Quinn) by term
justice_lookup	40	Justice ID → name mapping
cap_cases_meta	855,215	Caselaw Access Project metadata (broader federal coverage)
oyez_cases	8,393	Oyez oral argument cases
cl_crosswalk	866,618	Lexis ↔ federal citation ↔ CourtListener cluster crosswalk
Key Views (already assembled)
View	What It Does
scotus_citations_ranked	Per-case ranked citation lists with Fowler scores (nested struct arrays)
scotus_citations_ranked_flat	Same, unnested for flat querying
scdb_with_fowler	SCDB + Fowler authority scores joined
scdb_with_ideology	SCDB + Martin-Quinn ideology of majority opinion author
The Full Text
scdb_full_with_text.jsonl (526MB) contains every case with its full majority_opinion text inline, plus all 55 SCDB metadata columns, Fowler scores, and file hashes (opinion_text_sha256). Each line is one case.

What You Have vs. What MD-Annotate v2 Would Add
This is the critical distinction. You already have two layers of data that most people don't:

Layer 1: Structured case-level metadata (SCDB — you have this)
55 coded variables per case: issue area, decision direction, vote counts, jurisdiction, authority basis, disposition
Justice-level: who wrote it, ideology score at time of writing
Citation graph: 5.7M Shepard's edges with treatment classification
Layer 2: Full opinion text (you have this)
~28,000 majority opinion texts as raw strings in JSONL
SHA-256 hashed for identity
Layer 3: Block-level structured extraction (this is what MD-Annotate adds)
You do NOT yet have paragraph-level structured data
The SCDB metadata is case-level — it tells you Marbury v. Madison is about judicial review (issueArea=9), but it doesn't tell you which paragraph articulates the holding, which paragraphs cite which cases, or what legal principle is stated in paragraph 12
Shepard's edges tell you case-to-case citations but not where in the opinion or for what principle
The Operational Bridge: legal-10 → MD-Annotate → KG
Here's how you'd actually do it with what you have:

Step 1: Convert text to uploadable .md files
Your scdb_full_with_text.jsonl has majority_opinion as a raw string field. You'd extract each to a standalone .md file, one per case, named by caseId:


scotus_opinions/
  1791-001.md   # "THE COURT were unanimously of opinion..."
  1791-002.md   # "But, BY THE COURT: -- We will not award..."
  ...
  2022-042.md   # (most recent case)
~28,000 files. The opinion_text_sha256 you already have maps directly to source_uid in the immutable envelope (since the source bytes are the opinion text).

Step 2: Ingest into MD-Annotate (mdast track)
Upload all 28,000 .md files. The platform splits each into paragraph-level blocks via mdast. A typical opinion has 10-30 paragraphs, so you'd get roughly 280,000–840,000 blocks — each with a stable block_uid, block_index, and block_content.

Step 3: The schema advantage — what SCDB cannot tell you
Here's where the schema system creates data that doesn't exist anywhere in legal-10 today:

Schema: scotus_paragraph_classification_v1


{
  "schema_ref": "scotus_paragraph_classification_v1",
  "reference_material": {
    "note": "SCDB issue area codes and decision direction codes are provided so you can ground your classification.",
    "scdb_issue_areas": { "1": "Criminal Procedure", "2": "Civil Rights", "...": "..." }
  },
  "fields": {
    "rhetorical_function": {
      "enum": ["issue_framing", "fact_narrative", "procedural_history", "rule_statement",
               "rule_application", "holding", "dicta", "concurrence_note", "dissent_note",
               "procedural_disposition", "syllabus_summary"]
    },
    "cases_cited_in_paragraph": [{
      "citation_as_written": "str",
      "normalized_us_cite": "str|null",
      "treatment": "followed|distinguished|overruled|cited_for_principle|discussed|string_cited",
      "principle_cited_for": "str|null"
    }],
    "legal_principle_stated": "str|null",
    "constitutional_provisions": ["str"],
    "statutes_interpreted": ["str"],
    "key_entities": ["str"],
    "reasoning_type": { "enum": ["textual", "analogical", "policy", "historical", "structural", null] }
  }
}
This schema, run across all ~500,000 paragraph blocks, produces data that:

Localizes Shepard's treatment to the paragraph level — you go from "Case A cites Case B" to "Paragraph 12 of Case A follows Case B for the principle that..."
Extracts holdings at block granularity — SCDB tells you case-level disposition; this tells you which paragraph actually states the holding and what it says
Creates a paragraph-level citation graph — every cases_cited_in_paragraph entry with a normalized_us_cite can be joined back to SCDB's usCite field, linking block-level citations to the full SCDB metadata of the cited case
Distinguishes dicta from holding — SCDB has no field for this; it's fundamentally a paragraph-level judgment
Step 4: Join block-level extractions back to legal-10
The join key is straightforward:

Each .md file is named by caseId
Each block's immutable.source_upload.source_uid is deterministic from the file
Your SCDB caseId links to usCite → lexisCite → shepards_edges.cited_lexis
So a single query chain would be:


block.user_defined.data.cases_cited_in_paragraph[].normalized_us_cite
  → JOIN scdb_cases ON usCite
  → JOIN fowler_scores ON lexisCite
  → JOIN shepards_edges ON cited_lexis
This gives you, for every paragraph in every opinion:

The citations it makes (from the schema extraction)
The Fowler authority score of each cited case (from legal-10)
The Shepard's treatment of each cited case by every other court in the system (from legal-10)
The Martin-Quinn ideology of the author and the cited case's author (from legal-10)
Step 5: KG assembly
The KG nodes and edges would be:

Nodes (extracted from schema overlays + legal-10):

Case — one per SCDB case, attributes from all 55 SCDB columns + Fowler + MQ
Block — one per paragraph, with block_uid, rhetorical function, content
LegalPrinciple — deduplicated from legal_principle_stated across all blocks
Justice — from justice_lookup
ConstitutionalProvision — from constitutional_provisions extraction
Edges (derived from block-level schema output + Shepard's):

Case --HAS_BLOCK--> Block (reading order)
Block --CITES--> Case (with treatment, principle, paragraph location)
Block --STATES--> LegalPrinciple
Case --AUTHORED_BY--> Justice
Case --SHEPARDS_TREATMENT--> Case (your existing 5.7M Shepard's edges, now enrichable with block-level context)
The result is a paragraph-addressable citation knowledge graph over the entire SCOTUS corpus — something that doesn't exist in any current legal dataset, because SCDB is case-level, Shepard's is case-level, and nobody has done block-level structured extraction across 28,000 opinions with consistent schemas.

great idea .. i have a very similar one - suppose i acrtually wanted to develop/research this exact design across all SC cases

# Citation Polarity Methods: Implementation Guide

## Overview

This guide details the implementation of two complementary citation polarity extraction methods:

1. **Bluebook Signal Extraction** (δ-Stance approach) - Extracts author-indicated stance from citation signals
2. **Quoted Passage Extraction** (LePaRD approach) - Extracts quoted text and context for passage retrieval

These methods are implemented as separate database views/tables first, then integrated with existing Shepard's treatment data for hybrid polarity scoring.

---

## PART 1: SEPARATE VIEWS (Step 1)

### 1A. Bluebook Signal Extraction

#### Method Definition (from δ-Stance Paper)

The δ-Stance approach extracts citation signals that appear **immediately before** citations in legal text. These signals indicate the author's (judge's) intended relationship between their argument and the cited authority.

**Signal Taxonomy (Bluebook R4.1-4.5):**

| Signal | Stance Value | Polarity | Intensity | Meaning |
|--------|--------------|----------|-----------|---------|
| e.g. / no signal | +3.0 | Positive | 3 | Direct support |
| accord | +2.5 | Positive | 2.5 | Agreement across jurisdictions |
| see | +2.0 | Positive | 2 | Clear indirect support |
| see also | +1.5 | Positive | 1.5 | Additional support |
| cf. | +1.0 | Positive | 1 | Analogous support |
| see generally | 0.0 | Neutral | 0 | Background material |
| but cf. | -1.0 | Negative | 1 | Analogous opposition |
| but see | -2.0 | Negative | 2 | Clear opposition |
| contra | -3.0 | Negative | 3 | Direct contradiction |

**Extraction Algorithm:**
1. For each citation at position `start` in opinion text
2. Extract `text[start-30:start]` (preceding 30 characters)
3. Apply regex patterns in ORDER (multi-word before single-word)
4. Map detected signal → stance value
5. If no signal detected → default to +3.0 (direct support, as per Bluebook convention)

#### SQL Implementation

```sql
-- VIEW 1: bluebook_signals_raw
-- Extracts Bluebook citation signals from opinion text

CREATE OR REPLACE VIEW bluebook_signals_raw AS
WITH 
-- Load opinion texts
texts AS (
    SELECT caseId, majority_opinion 
    FROM read_json_auto('datasets/scdb_full_with_text.jsonl')
    WHERE majority_opinion IS NOT NULL
),
-- Load citation positions
cites AS (
    SELECT 
        anchor_caseId, 
        anchor_lexisCite,
        normalized_cite, 
        start, 
        "end"
    FROM read_parquet('datasets/citation_inventory.parquet')
),
-- Join and extract preceding context
joined AS (
    SELECT 
        c.anchor_caseId,
        c.anchor_lexisCite,
        c.normalized_cite,
        c.start,
        c."end",
        -- Extract 30 chars before citation, lowercase for matching
        LOWER(SUBSTRING(t.majority_opinion, GREATEST(1, c.start - 30), 30)) as pre_context_30,
        -- Extract 60 chars for full context display
        SUBSTRING(t.majority_opinion, GREATEST(1, c.start - 60), 60) as pre_context_60
    FROM cites c
    JOIN texts t ON c.anchor_caseId = t.caseId
)
SELECT 
    anchor_caseId,
    anchor_lexisCite,
    normalized_cite,
    start,
    "end",
    pre_context_60,
    -- Signal detection (ordered: multi-word first, then single-word)
    CASE 
        -- Multi-word signals (check first!)
        WHEN pre_context_30 LIKE '%see also%' THEN 'see_also'
        WHEN pre_context_30 LIKE '%but see%' THEN 'but_see'
        WHEN pre_context_30 LIKE '%but cf.%' THEN 'but_cf'
        WHEN pre_context_30 LIKE '%see generally%' THEN 'see_generally'
        -- Single-word signals with boundary detection
        WHEN pre_context_30 LIKE '%contra,%' OR pre_context_30 LIKE '%contra %' THEN 'contra'
        WHEN pre_context_30 LIKE '%accord,%' OR pre_context_30 LIKE '%accord %' THEN 'accord'
        WHEN pre_context_30 LIKE '%e.g.,%' OR pre_context_30 LIKE '% e.g. %' THEN 'eg'
        WHEN pre_context_30 LIKE '%cf.%' THEN 'cf'
        -- 'see' requires careful boundary detection to avoid false matches
        WHEN pre_context_30 LIKE '% see %' 
          OR pre_context_30 LIKE '%.  see %' 
          OR pre_context_30 LIKE '%, see %'
          OR pre_context_30 LIKE '%; see %' THEN 'see'
        ELSE 'no_signal'
    END as bluebook_signal,
    -- Map signal to stance value (δ-Stance Table 1)
    CASE 
        WHEN pre_context_30 LIKE '%see also%' THEN 1.5
        WHEN pre_context_30 LIKE '%but see%' THEN -2.0
        WHEN pre_context_30 LIKE '%but cf.%' THEN -1.0
        WHEN pre_context_30 LIKE '%see generally%' THEN 0.0
        WHEN pre_context_30 LIKE '%contra,%' OR pre_context_30 LIKE '%contra %' THEN -3.0
        WHEN pre_context_30 LIKE '%accord,%' OR pre_context_30 LIKE '%accord %' THEN 2.5
        WHEN pre_context_30 LIKE '%e.g.,%' OR pre_context_30 LIKE '% e.g. %' THEN 3.0
        WHEN pre_context_30 LIKE '%cf.%' THEN 1.0
        WHEN pre_context_30 LIKE '% see %' 
          OR pre_context_30 LIKE '%.  see %' 
          OR pre_context_30 LIKE '%, see %'
          OR pre_context_30 LIKE '%; see %' THEN 2.0
        ELSE 3.0  -- No signal = direct support (Bluebook default)
    END as stance_value,
    -- Polarity category
    CASE 
        WHEN pre_context_30 LIKE '%but see%' 
          OR pre_context_30 LIKE '%but cf.%' 
          OR pre_context_30 LIKE '%contra,%' 
          OR pre_context_30 LIKE '%contra %' THEN 'negative'
        WHEN pre_context_30 LIKE '%see generally%' THEN 'neutral'
        ELSE 'positive'
    END as bluebook_polarity
FROM joined;
```

#### Materialization

```sql
-- Create persistent table from view
CREATE TABLE bluebook_signals AS SELECT * FROM bluebook_signals_raw;

-- Add indexes for performance
CREATE INDEX idx_bluebook_anchor ON bluebook_signals(anchor_caseId);
CREATE INDEX idx_bluebook_cite ON bluebook_signals(normalized_cite);
CREATE INDEX idx_bluebook_signal ON bluebook_signals(bluebook_signal);
```

---

### 1B. Quoted Passage Extraction (LePaRD Style)

#### Method Definition (from LePaRD Paper)

LePaRD extracts **quoted passages** from judicial opinions that cite precedent. The key insight is that when judges quote a precedent, the surrounding context reveals why they're using that citation.

**Extraction Algorithm:**
1. Find all quoted text in opinion using regex `"([^"]+)"`
2. For each quote ≥ 5 words:
   - Record quote text and position
   - Extract preceding context (up to 300 words before quote)
   - Match quote to cited cases using fuzzy matching
3. Output: (destination_context, quote, cited_case)

#### SQL Implementation

```sql
-- VIEW 2: quoted_passages_raw
-- Extracts quoted text from opinions (simplified LePaRD approach)
-- Note: Full LePaRD uses fuzzy matching to source cases; this extracts quotes near citations

CREATE OR REPLACE VIEW quoted_passages_raw AS
WITH 
texts AS (
    SELECT caseId, majority_opinion 
    FROM read_json_auto('datasets/scdb_full_with_text.jsonl')
    WHERE majority_opinion IS NOT NULL
),
cites AS (
    SELECT 
        anchor_caseId, 
        anchor_lexisCite,
        normalized_cite, 
        start, 
        "end"
    FROM read_parquet('datasets/citation_inventory.parquet')
),
joined AS (
    SELECT 
        c.anchor_caseId,
        c.anchor_lexisCite,
        c.normalized_cite,
        c.start,
        c."end",
        t.majority_opinion,
        -- Get context window around citation (500 chars before, 200 after)
        SUBSTRING(t.majority_opinion, GREATEST(1, c.start - 500), 500) as pre_context,
        SUBSTRING(t.majority_opinion, c."end" + 1, 200) as post_context
    FROM cites c
    JOIN texts t ON c.anchor_caseId = t.caseId
)
SELECT 
    anchor_caseId,
    anchor_lexisCite,
    normalized_cite,
    start,
    "end",
    pre_context,
    post_context,
    -- Check if there's a quote in the preceding context
    CASE 
        WHEN pre_context LIKE '%"%' OR pre_context LIKE '%"%' THEN TRUE
        ELSE FALSE
    END as has_preceding_quote,
    -- Check if there's a parenthetical after citation (case summary)
    CASE 
        WHEN post_context LIKE '(%' THEN TRUE
        ELSE FALSE
    END as has_parenthetical,
    -- Extract parenthetical if present (first 150 chars after opening paren)
    CASE 
        WHEN post_context LIKE '(%' 
        THEN SUBSTRING(post_context, 1, 
            COALESCE(NULLIF(POSITION(')' IN post_context), 0), 150))
        ELSE NULL
    END as parenthetical_text
FROM joined;
```

#### Materialization

```sql
-- Create persistent table
CREATE TABLE quoted_passages AS SELECT * FROM quoted_passages_raw;

-- Add indexes
CREATE INDEX idx_quotes_anchor ON quoted_passages(anchor_caseId);
CREATE INDEX idx_quotes_cite ON quoted_passages(normalized_cite);
CREATE INDEX idx_quotes_has_paren ON quoted_passages(has_parenthetical);
```

---

## PART 2: INTEGRATION (Step 2)

### 2A. Join with Shepard's Data

The integration creates a unified view combining:
- Bluebook signals (author intent)
- Shepard's treatment (editorial classification)
- Fowler scores (authority ranking)

```sql
-- VIEW 3: citation_polarity_unified
-- Combines Bluebook signals with Shepard's treatment

CREATE OR REPLACE VIEW citation_polarity_unified AS
WITH 
-- Get cited case lexis cite for Shepard's join
cited_lexis AS (
    SELECT 
        b.*,
        s.lexisCite as cited_lexisCite
    FROM bluebook_signals b
    LEFT JOIN scdb_cases s ON b.normalized_cite = s.usCite
)
SELECT 
    cl.anchor_caseId,
    cl.anchor_lexisCite,
    cl.normalized_cite,
    cl.cited_lexisCite,
    cl.start,
    cl."end",
    
    -- Bluebook signal data
    cl.bluebook_signal,
    cl.stance_value as bluebook_stance_value,
    cl.bluebook_polarity,
    
    -- Shepard's treatment data (column is 'shepards' not 'treatment_norm')
    sh.shepards as shepards_treatment,
    -- Note: 'agree' column does not exist in shepards_data.csv

    -- Shepard's polarity (mapped from shepards column)
    CASE
        WHEN sh.shepards IN ('followed') THEN 'positive'
        WHEN sh.shepards IN ('distinguished', 'criticized', 'questioned',
                              'overrul', 'limit') THEN 'negative'
        ELSE 'neutral'
    END as shepards_polarity,
    
    -- HYBRID POLARITY: Prefer Bluebook when signal detected, else Shepard's
    CASE 
        -- If Bluebook detected a non-default signal, use it
        WHEN cl.bluebook_signal != 'no_signal' THEN cl.bluebook_polarity
        -- Otherwise use Shepard's if available
        WHEN sh.shepards IS NOT NULL THEN 
            CASE 
                WHEN sh.shepards IN ('follows') THEN 'positive'
                WHEN sh.shepards IN ('distinguishes', 'criticizes', 'questions', 
                                            'overrules', 'limits') THEN 'negative'
                ELSE 'neutral'
            END
        -- Default to positive (citation without signal = support)
        ELSE 'positive'
    END as hybrid_polarity,
    
    -- Source of hybrid decision
    CASE 
        WHEN cl.bluebook_signal != 'no_signal' THEN 'bluebook'
        WHEN sh.shepards IS NOT NULL THEN 'shepards'
        ELSE 'default'
    END as hybrid_source,
    
    -- Agreement indicator (do methods agree?)
    CASE 
        WHEN cl.bluebook_signal = 'no_signal' OR sh.shepards IS NULL THEN NULL
        WHEN cl.bluebook_polarity = 
            CASE 
                WHEN sh.shepards IN ('follows') THEN 'positive'
                WHEN sh.shepards IN ('distinguishes', 'criticizes', 'questions', 
                                            'overrules', 'limits') THEN 'negative'
                ELSE 'neutral'
            END 
        THEN TRUE
        ELSE FALSE
    END as methods_agree

FROM cited_lexis cl
LEFT JOIN read_csv_auto('datasets/shepards_data.csv') sh
    ON cl.anchor_lexisCite = sh.citing_case
    AND cl.cited_lexisCite = sh.cited_case
    AND sh.supreme_court = 1;
```

### 2B. Materialized Integration Table

```sql
-- Create persistent integrated table
CREATE TABLE citation_polarity_integrated AS 
SELECT * FROM citation_polarity_unified;

-- Indexes for FDQ queries
CREATE INDEX idx_polarity_anchor ON citation_polarity_integrated(anchor_caseId);
CREATE INDEX idx_polarity_cite ON citation_polarity_integrated(normalized_cite);
CREATE INDEX idx_polarity_hybrid ON citation_polarity_integrated(hybrid_polarity);
CREATE INDEX idx_polarity_agree ON citation_polarity_integrated(methods_agree);
```

### 2C. Validation Queries

```sql
-- Check coverage statistics
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN bluebook_signal != 'no_signal' THEN 1 END) as with_bluebook_signal,
    COUNT(shepards_treatment) as with_shepards,
    COUNT(CASE WHEN methods_agree IS NOT NULL THEN 1 END) as comparable,
    ROUND(100.0 * SUM(CASE WHEN methods_agree THEN 1 ELSE 0 END) / 
          NULLIF(COUNT(CASE WHEN methods_agree IS NOT NULL THEN 1 END), 0), 2) as agreement_rate
FROM citation_polarity_integrated;

-- Signal distribution by Shepard's treatment
SELECT 
    shepards_treatment,
    bluebook_signal,
    COUNT(*) as count,
    ROUND(AVG(bluebook_stance_value), 2) as avg_stance
FROM citation_polarity_integrated
WHERE shepards_treatment IS NOT NULL 
  AND bluebook_signal != 'no_signal'
GROUP BY 1, 2
ORDER BY 1, count DESC;

-- Find disagreements (Bluebook negative but Shepard's positive, or vice versa)
SELECT 
    anchor_caseId,
    normalized_cite,
    bluebook_signal,
    bluebook_polarity,
    shepards_treatment,
    shepards_polarity
FROM citation_polarity_integrated
WHERE methods_agree = FALSE
LIMIT 50;
```

---

## PART 3: FDQ INTEGRATION

### For FDQ-01 (Citation Stance Differentiation)

The integrated table can be used directly for FDQ-01 sub-questions:

```sql
-- Get in_favor citations for an anchor
SELECT normalized_cite, hybrid_polarity, hybrid_source, bluebook_stance_value
FROM citation_polarity_integrated
WHERE anchor_caseId = :anchor_id
  AND hybrid_polarity = 'positive'
ORDER BY bluebook_stance_value DESC;

-- Get against citations for an anchor  
SELECT normalized_cite, hybrid_polarity, hybrid_source, bluebook_stance_value
FROM citation_polarity_integrated
WHERE anchor_caseId = :anchor_id
  AND hybrid_polarity = 'negative'
ORDER BY bluebook_stance_value ASC;
```

### Eligibility Enhancement

Update the eligibility criteria to use the integrated table:

```sql
-- Anchors with balanced polarity (at least 1 of each)
SELECT anchor_caseId, 
       COUNT(CASE WHEN hybrid_polarity = 'positive' THEN 1 END) as n_positive,
       COUNT(CASE WHEN hybrid_polarity = 'negative' THEN 1 END) as n_negative
FROM citation_polarity_integrated
GROUP BY anchor_caseId
HAVING n_positive >= 1 AND n_negative >= 1;
```

---

## Files Reference

| File | Purpose | Location |
|------|---------|----------|
| citation_inventory.parquet | Citation positions | datasets/ |
| scdb_full_with_text.jsonl | Opinion text | datasets/ |
| scdb_cases | SCDB metadata | DuckDB table |
| shepards_edges | Shepard's treatment | DuckDB table |
| deltastance/ | δ-Stance paper/sample | datasets/new/ |
| LePaRD/ | LePaRD code | datasets/new/ |

---

## Execution Order

1. **Create bluebook_signals_raw view** → Test with sample queries
2. **Create quoted_passages_raw view** → Test with sample queries  
3. **Materialize to tables** → Add indexes
4. **Create citation_polarity_unified view** → Validate join coverage
5. **Materialize integration table** → Run validation queries
6. **Update FDQ eligibility queries** → Use new polarity source

---

## Expected Results (Verified 2026-01-24)

| Metric | Verified Value |
|--------|----------------|
| Total citations | 378,938 |
| With Bluebook signal detected | 35,726 (9.4%) |
| With Shepard's treatment (SC→SC) | ~232,000 |
| Comparable (both methods) | ~27,000 |
| Key disagreements | 1,013 "distinguished" with positive Bluebook |

### Signal Distribution (Actual)

| Signal | Count | % | Polarity |
|--------|-------|---|----------|
| no_signal | 343,212 | 90.6% | positive_default |
| see | 19,356 | 5.1% | positive |
| cf | 6,445 | 1.7% | positive |
| eg | 4,352 | 1.1% | positive |
| see_also | 4,045 | 1.1% | positive |
| contra | 652 | 0.17% | negative |
| accord | 402 | 0.11% | positive |
| see_generally | 202 | 0.05% | neutral |
| but_see | 177 | 0.05% | negative |
| but_cf | 95 | 0.03% | negative |

---

*Generated: 2026-01-25*
*Version: 1.0*
Show less
This is a perfect illustration of the complementary relationship between what you've already built and what the schema system adds. Let me map the two approaches side by side.

What You Have vs. What Blocks + Schemas Would Add
Your citation polarity pipeline operates at the citation-occurrence level within raw text strings. It's deterministic, fast, and already verified at scale. Here's the key comparison:

Your Current Pipeline (DuckDB + regex, verified)

raw opinion text → regex finds citation at offset → 
  extract 30 chars before → pattern match Bluebook signal → 
  stance value (-3.0 to +3.0)
Strengths: Deterministic, reproducible, fast (378K citations processed). The Bluebook signal taxonomy is well-defined and regex-extractable.

Limitations (which you already know, because you built the parenthetical extraction and LePaRD integration to compensate):

90.6% of citations have no signal (no_signal → default +3.0). The Bluebook convention "no signal = direct support" is the right default, but it collapses a lot of variation. A paragraph that cites Marbury v. Madison to establish jurisdiction and one that cites it as the foundational principle of judicial review both show no_signal, +3.0 — but the treatment purpose is very different.

Regex can't read the sentence. Your pre_context_30 window catches see also and but cf., but it can't capture "The Court in Brown held that..." vs. "Although Brown established..." — the syntactic framing carries treatment signal that lives outside the 30-char window and requires comprehension.

The 1,013 disagreements (distinguished in Shepard's but positive Bluebook) are exactly the cases where the author doesn't signal negative treatment with Bluebook conventions but the editorial classification identifies it. An AI reading the paragraph could resolve which is correct.

Parenthetical extraction is brittle. Your SUBSTRING(post_context, 1, POSITION(')' ...)) captures the text, but doesn't interpret it. "(holding that warrantless searches violate the Fourth Amendment)" is a principle statement; "(discussing the history of habeas corpus)" is background reference. These have different polarity implications.

The Schema Approach: Same Research, Block-Level AI Extraction
Here's how you'd implement this as a user-defined schema on the MD-Annotate platform. The schema would run per paragraph, not per citation occurrence — which is a fundamental unit-of-work shift.


{
  "schema_ref": "scotus_citation_polarity_v1",
  "description": "Per-block citation polarity extraction: Bluebook signals, treatment purpose, quoted passage attribution, and author stance for every citation in every paragraph of a Supreme Court opinion.",
  "reference_material": {
    "bluebook_signal_taxonomy": [
      { "signal": "e.g.", "stance": 3.0, "polarity": "positive", "meaning": "Direct support" },
      { "signal": "accord", "stance": 2.5, "polarity": "positive", "meaning": "Agreement across jurisdictions" },
      { "signal": "see", "stance": 2.0, "polarity": "positive", "meaning": "Clear indirect support" },
      { "signal": "see also", "stance": 1.5, "polarity": "positive", "meaning": "Additional support" },
      { "signal": "cf.", "stance": 1.0, "polarity": "positive", "meaning": "Analogous support" },
      { "signal": "see generally", "stance": 0.0, "polarity": "neutral", "meaning": "Background material" },
      { "signal": "but cf.", "stance": -1.0, "polarity": "negative", "meaning": "Analogous opposition" },
      { "signal": "but see", "stance": -2.0, "polarity": "negative", "meaning": "Clear opposition" },
      { "signal": "contra", "stance": -3.0, "polarity": "negative", "meaning": "Direct contradiction" },
      { "signal": "no_signal", "stance": 3.0, "polarity": "positive_default", "meaning": "Direct support (Bluebook default)" }
    ],
    "treatment_purpose_taxonomy": [
      "authority_for_holding",
      "authority_for_standard",
      "factual_analogy",
      "factual_distinction",
      "procedural_history",
      "background_context",
      "overruled_or_superseded",
      "narrowing_or_limiting",
      "extending_or_broadening",
      "string_cite_filler"
    ],
    "instructions_note": "The Bluebook signal taxonomy and treatment purpose taxonomy are provided so you can classify citations consistently. Read the full paragraph, identify every citation, and fill in the fields below."
  },
  "instructions": "You are analyzing one paragraph of a US Supreme Court majority opinion. Identify every case citation in this paragraph. For each citation, extract the Bluebook signal (if any), determine the treatment purpose based on the full sentence context, and assess whether the author is using this citation positively, negatively, or neutrally. If this paragraph contains no citations, return an empty array for citations_in_block.",
  "fields": {
    "citations_in_block": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "citation_as_written": { "type": "string", "description": "The citation exactly as it appears in the text." },
          "normalized_us_cite": { "type": "string|null", "description": "Normalized to U.S. Reports format (e.g., '347 U.S. 483') if identifiable. Null for non-SCOTUS or unresolvable citations." },
          "bluebook_signal": {
            "type": "string",
            "enum": ["eg", "accord", "see", "see_also", "cf", "see_generally", "but_cf", "but_see", "contra", "no_signal"],
            "description": "The Bluebook introductory signal immediately preceding this citation, per the taxonomy in reference_material."
          },
          "stance_value": { "type": "number", "description": "Numeric stance from the Bluebook taxonomy (-3.0 to +3.0)." },
          "treatment_purpose": {
            "type": "string",
            "enum": ["authority_for_holding", "authority_for_standard", "factual_analogy", "factual_distinction", "procedural_history", "background_context", "overruled_or_superseded", "narrowing_or_limiting", "extending_or_broadening", "string_cite_filler"],
            "description": "Why the author cited this case in this paragraph."
          },
          "principle_cited_for": { "type": "string|null", "description": "The legal principle or proposition this citation supports, stated in one sentence. Null if the citation is string-cite filler or purely procedural." },
          "quoted_passage": { "type": "string|null", "description": "If the paragraph quotes language from the cited case, the quoted text. Null if no quote." },
          "semantic_polarity": {
            "type": "string",
            "enum": ["positive", "negative", "neutral", "mixed"],
            "description": "The author's actual stance toward this cited case based on full sentence context — not just the Bluebook signal."
          },
          "polarity_reasoning": { "type": "string", "description": "One sentence explaining why you assigned this semantic_polarity. Especially important when semantic_polarity differs from the Bluebook signal's implied polarity." }
        }
      },
      "description": "All case citations appearing in this paragraph."
    },
    "block_citation_count": { "type": "integer", "description": "Number of distinct citations in this paragraph." },
    "block_has_negative_citation": { "type": "boolean", "description": "True if any citation in this paragraph has semantic_polarity = negative." },
    "block_dominant_polarity": {
      "type": "string",
      "enum": ["positive", "negative", "neutral", "mixed"],
      "description": "The overall citation polarity of this paragraph (majority vote across citations)."
    }
  }
}
What This Schema Produces That Your SQL Pipeline Cannot
Running this schema across ~28,000 cases (est. 400K–800K paragraph blocks) gives you:

1. treatment_purpose — the WHY behind every citation

Your current pipeline tells you Case A cites Case B with signal "see". The schema tells you Case A cites Case B in paragraph 12 as authority for the standard of review. This is the field that transforms citation counts into a knowledge graph — because now you know that Brown v. Board is cited 2,300 times as authority_for_holding on equal protection but only 47 times as factual_analogy, and you can trace that distinction to specific paragraphs.

2. semantic_polarity — resolving your 1,013 disagreements

Your Bluebook/Shepard's disagreement cases (distinguished but positive signal) are exactly where an AI reading the full sentence can break the tie. The polarity_reasoning field creates an auditable trail for every resolution. You'd get structured evidence for why the author used no_signal before a citation that Shepard's classifies as distinguished — maybe the author is acknowledging the case exists without signaling negative treatment, or maybe Shepard's over-classified a "distinguished on narrow grounds" that the author actually treats supportively.

3. quoted_passage — LePaRD extraction without regex fragility

Your current quoted_passages_raw view does LIKE '%"%' to detect quotes in a 500-char pre-context window. The AI worker reads the actual paragraph and extracts the exact quoted text attributed to the specific cited case. No window sizing, no regex for quote matching, no confusion between quotes from different cited cases in the same sentence.

4. principle_cited_for — the thing that doesn't exist anywhere

Neither SCDB, nor Shepard's, nor Fowler, nor your Bluebook extraction captures what principle a citation supports. This field, aggregated across 400K citations, creates a proposition-level knowledge graph: "The principle that warrantless searches are presumptively unreasonable is cited as authority in paragraphs [list], first articulated in [case], most frequently cited in [issue area]."

The Hybrid: SQL for what regex does well, schemas for what requires comprehension
The practical approach isn't either/or. Your SQL pipeline is the right tool for deterministic extraction — the Bluebook signals, the character offsets, the Shepard's joins. The schema system is the right tool for semantic extraction — the treatment purpose, the quoted passage attribution, the polarity reasoning.

The integration point is the join key. Both systems produce data anchored to the same cases:


SQL pipeline:    citation_inventory.parquet → (anchor_caseId, normalized_cite, start, end)
Schema pipeline: block JSONL → (block_uid contains conv_uid:block_index, caseId from filename)
After running the schema, you'd export JSONL and load the citations_in_block arrays into DuckDB:


-- Load schema extraction results
CREATE TABLE block_citation_polarity AS 
SELECT * FROM read_json_auto('exports/scotus_citation_polarity_v1/*.jsonl');

-- Join schema extraction (semantic) with SQL extraction (deterministic)
SELECT 
    bp.block_uid,
    bp.block_index,
    c.normalized_us_cite,
    
    -- Deterministic (your existing pipeline)
    bs.bluebook_signal as regex_bluebook_signal,
    bs.stance_value as regex_stance_value,
    sh.treatment_norm as shepards_treatment,
    
    -- Semantic (schema extraction)
    c.bluebook_signal as ai_bluebook_signal,
    c.semantic_polarity,
    c.treatment_purpose,
    c.principle_cited_for,
    c.quoted_passage,
    c.polarity_reasoning,
    
    -- Agreement between regex and AI on Bluebook signal
    (bs.bluebook_signal = c.bluebook_signal) as bluebook_signal_agrees,
    
    -- Three-way polarity comparison
    bs.bluebook_polarity as regex_polarity,
    sh_polarity as shepards_polarity,
    c.semantic_polarity as ai_polarity
    
FROM block_citation_polarity bp,
     UNNEST(bp.citations_in_block) AS c
LEFT JOIN bluebook_signals bs 
    ON bp.anchor_caseId = bs.anchor_caseId 
    AND c.normalized_us_cite = bs.normalized_cite
LEFT JOIN shepards_edges sh
    ON ...  -- existing Shepard's join
This gives you a three-signal polarity for every citation occurrence:

Regex Bluebook (deterministic, from your pipeline) — what signal was literally present
Shepard's editorial (from the Shepard's dataset) — how editors classified the treatment
AI semantic (from the schema extraction) — what the full paragraph context reveals
The cases where all three agree are high-confidence. The cases where they disagree are the research frontier — and the polarity_reasoning field gives you an auditable explanation for why the AI disagrees with regex or Shepard's.

Scale estimate
Metric	Your current pipeline	Schema pipeline
Unit of work	citation occurrence (378,938)	paragraph block (~500K)
Extraction method	regex + SQL	AI worker per block
Coverage	all citations with offsets	all paragraphs (including those without citations)
Speed	seconds (DuckDB)	hours-days (depends on worker count + model)
Fields per citation	3 (signal, stance, polarity)	8 (signal, stance, treatment_purpose, principle, quote, semantic_polarity, reasoning, normalized_cite)
Determinism	100% reproducible	model-dependent; reproducible given same model + temp=0
The schema pipeline is slower but produces 3x more structured fields per citation, plus the treatment_purpose and principle_cited_for fields that are impossible to extract with regex. Your existing 378,938-row SQL extraction becomes the validation baseline for the schema extraction — if the AI's bluebook_signal disagrees with your regex on a case where the regex is clearly correct, you know the AI made an error on that block.