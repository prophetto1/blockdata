





Core Pipeline 





Product Summary

Internal Name: MD-Annotate
Real Product Name - TBD 
Candidates include: Spectrum, Prism, Strata, etc. 












Product Vision (What It Is)

One-Sentence Definition:
MD-Annotate  is a document intelligence platform that transforms unstructured documents into permanent, identity-bearing block inventories that users can annotate through multiple swappable schemas—enabling parallel AI processing, multi-lens analysis, and document reconstruction.
Core Belief:
You believe that the "block" (paragraph-level unit) should be a first-class citizen with permanent identity and provenance—not a disposable chunk on the way to a vector store. Same blocks, infinite lenses.

The Problem

Large documents exceed single AI context limits — A 1000-page document can't be processed coherently by one AI
Current tools force re-processing — Want citation analysis AND opinion extraction? Run two separate pipelines from scratch
No provenance chain — RAG chunks are disposable; you can't trace extracted data back to the exact source paragraph
Fragmented ecosystem — IDP tools do doc-level extraction, annotation tools are human-in-the-loop, RAG tools treat chunks as intermediates. Nobody built the hub.


Who Feels It (Implied Personas)
PersonaPainLegal researcher (you)28K SC cases, needs citation networks + opinion analysis + authority scoring—currently requires separate pipelinesTechnical writer/editorMassive docs need consistent editing standards; can't parallelize prose review across AI workersKnowledge engineerExtracting KG triples from documents lacks block-level granularity and reusabilityAI builderNeeds retrieval-ready chunks with rich metadata for filtered semantic search



Core Capabilities (User-Centric)

Upload any format → Users can upload PDF, DOCX, PPTX, TXT, or MD and receive a structured block inventory without manual conversion
Apply multiple schemas → Users can run different annotation schemas (citation extraction, prose editing, KG entities) against the same blocks without re-ingestion
Parallel AI annotation → Users can have multiple AI workers process a massive document concurrently, following a consistent user-defined schema
Reconstruct documents → Users can export annotated blocks back to original format (DOCX, PDF) with edits applied
Route to downstream systems → Users can export to JSONL, push to knowledge graphs, or index to vector stores—all from the same block inventory







===

5. Use Cases
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
DomainCorpusSchema ExtractsOutputLegal28K Supreme Court casesCitations, holdings, authority signalsCitation network, precedent graphAcademic500 research papersClaims, methods, findings, referencesSystematic review datasetFinance200 annual reportsRisk factors, strategy signals, metricsCompetitive comparison matrixPolicyState statutes on single topicDefinitions, requirements, exceptionsCross-jurisdiction analysisPatents1000 patents in domainClaims, prior art, technical categoriesInnovation landscape mapMedia6 months news coverageEntities, events, sentiment, sourcesEvent timeline, narrative analysis

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
DomainDocumentSchema DefinesOutputEditorial800-page technical manualStyle rules, clarity checks, rewritesEdited documentLegal300-page contractClause types, risk flags, suggested revisionsAnnotated contract + risk reportPublishing500-page textbookOutdated claims, citation needs, clarity issuesRevised editionLocalizationTranslated documentMistranslations, term inconsistencies, fixesCorrected translationAccessibilityLong-form contentReading level, jargon flags, simplificationsPlain-language versionJournalismInvestigative reportClaims requiring citation, verification statusFact-checked document with sources

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
DomainCorpusSchema ExtractsOutputAcademicDomain textbooksConcepts, definitions, relationshipsDomain ontologyCorporateCompany filingsPeople, organizations, roles, eventsEntity databaseScientificResearch papersHypotheses, evidence, contradictionsArgumentation graphProductTechnical manualsFeatures, specs, compatibilityStructured product catalogMedicalClinical guidelinesConditions, interventions, dosagesQueryable protocol databaseLegalCase law corpusHoldings, facts, treatment relationshipsPrecedent network

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
DomainCorpusSchema Enriches WithEnablesEnterpriseInternal documentationTopics, doc type, audience, freshnessFiltered enterprise searchSupportHelp center articlesIntent, product area, complexity levelSupport chatbot retrievalLegalCase law + statutesJurisdiction, topic, authority weightLegal research AIResearchAcademic papersMethodology, claim strength, domainResearch assistant Q&AEngineeringTechnical documentationAPI, version, deprecation statusDeveloper assistant

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
DomainDocumentSchema ASchema BInsightRhetoricOpinion piecesClaims + evidenceRhetorical movesHow arguments are constructedJournalismNews articlesFactual assertionsSource attributionWhat's claimed vs. sourcedLegalContract versionsClause extractionDiff detectionWhat changed between draftsMediaNews corpusFactual contentFraming/tone markersSame facts, different spinEducationTextbooksConcepts taughtCognitive load indicatorsWhere learners struggle

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
DomainWorkflowLegal researchAI extracts relevant precedents → attorney reviews relevance → AI drafts argument sectionGrant writingAI extracts prior work claims → PI reviews accuracy → AI structures proposalSystematic reviewAI screens abstracts → researcher adjudicates borderlines → AI synthesizes findingsDue diligenceAI flags contract risks → lawyer reviews severity → AI generates summary memoContent moderationAI flags potential violations → human reviews edge cases → thresholds refined

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
DomainTemplateSchema DefinesOutputConsultingReport structureSection requirements, client contextCompleted client reportSalesProposal templateClient-specific content per sectionCustom proposalComplianceForm structureHow to extract answers from source docsCompleted compliance formLocalizationOriginal documentTranslation + adaptation per blockLocalized versionDocumentationDoc structureTechnical content per section from specsGenerated documentation

Pattern Summary
#PatternCore OperationInput → Output1Corpus-Wide ExtractionAnalyzeN documents → structured dataset2Distributed ProcessingEdit/Transform1 massive doc → processed doc3Knowledge Graph ConstructionStructureDocuments → graph with provenance4Retrieval InfrastructureIndexDocuments → enriched searchable corpus5Multi-Schema ComparisonCompareSame blocks × N schemas → cross-lens insights6Human-AI CollaborationCollaborateAI annotation + human judgment → refined output7Template-Based GenerationGenerateStructure + context → completed document























===

Unified AST Architecture 
- achieve a unified AST format that:
    1. Accepts any document format as input
    2. Routes through appropriate converter (Pandoc or Docling)
    3. Converges to a single AST representation
    4. Supports user-defined block granularity (sentence, paragraph, section, chapter)
    5. Enables reconstruction to desired output formats

Part 1: Tool Comparison ===> table md format
Input Format Support
FormatPandocDoclingNotesMarkdown✅ Native✅Both handle wellHTML✅ Native✅Both handle wellDOCX✅ Native✅Pandoc preserves more styling; Docling better at complex layoutsPDF⚠️ Limited✅ NativeDocling far superior — ML-based layout detection, reading order, tablesPPTX⚠️ Limited✅ NativeDocling designed for thisXLSX❌✅ NativeDocling onlyLaTeX✅ Native❌Pandoc onlyEPUB✅ Native❌Pandoc onlyRST✅ Native❌Pandoc onlyODT✅ Native❌Pandoc onlyRTF✅ Native❌Pandoc onlyDocBook✅ Native❌Pandoc onlyMediaWiki✅ Native❌Pandoc onlyOrg-mode✅ Native❌Pandoc onlyJupyter✅ Native❌Pandoc onlyImages (PNG, TIFF, JPEG)❌✅ OCRDocling onlyScanned PDFs❌✅ OCRDocling onlyAudio (WAV, MP3)❌✅ ASRDocling only (transcription)WebVTT❌✅Docling only
Summary:

Pandoc excels: Text-based markup formats, academic formats, bidirectional conversion
Docling excels: Visual/layout-heavy formats (PDF, PPTX), OCR, ML-based understanding

---
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

---

Docling Document
Structure:

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

---

mdast (Markdown AST)
Since both tools can output Markdown, and remark-parse produces mdast, this is a candidate for unified format.
Structure:

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

import { unified } from 'unified'
import remarkParse from 'remark-parse'

const tree = unified()
  .use(remarkParse)
  .parse(markdownString)


  Step 2: Add section containers
Transform flat heading + content into nested sections:

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

Query by granularity:
sql-- Get all paragraph blocks
SELECT * FROM blocks WHERE granularity = 'paragraph' ORDER BY block_index

-- Get all sentence blocks with their parent paragraphs
SELECT s.*, p.content_original as paragraph_text
FROM blocks s
JOIN blocks p ON s.parent_block_uid = p.block_uid
WHERE s.granularity = 'sentence'
Annotation at any granularity:
sql-- Annotate paragraphs with topic schema
INSERT INTO block_annotations (block_uid, run_id, schema_ref, ...)
SELECT block_uid, $run_id, 'topic_extraction_v1', ...
FROM blocks WHERE doc_uid = $doc AND granularity = 'paragraph'

-- Annotate sentences with claim schema
INSERT INTO block_annotations (block_uid, run_id, schema_ref, ...)
SELECT block_uid, $run_id, 'claim_extraction_v1', ...
FROM blocks WHERE doc_uid = $doc AND granularity = 'sentence'

Reconstruction Path
From blocks back to document:
javascript// 1. Query blocks at desired granularity, in order
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
javascript// Get paragraphs, but reconstruct each from its sentences
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
sql-- Granularity enum
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
typescriptinterface UnifiedAST {
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

---

