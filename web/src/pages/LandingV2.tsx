import { useNavigate } from 'react-router-dom';
import { Tabs } from '@ark-ui/react/tabs';
import { Accordion } from '@ark-ui/react/accordion';
import { Clipboard } from '@ark-ui/react/clipboard';
import { Highlight } from '@ark-ui/react/highlight';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import {
  IconArrowRight,
  IconUpload,
  IconBolt,
  IconChecks,
  IconTable,
  IconFingerprint,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconCheck,
  IconFileText,
  IconDatabase,
  IconFileExport,
  IconCloud,
  IconTransform,
  IconCode,
  IconBrain,
  IconServer,
  IconTopologyStarRing3,
  IconVectorTriangle,
  IconApi,
  IconSparkles,
  IconShieldCheck,
  IconEye,
  IconPencil,
  IconArrowDown,
  IconWebhook,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { styleTokens } from '@/lib/styleTokens';

// ─── Shared JSON tree styles ─────────────────────────────────────────────────

const jsonTreeRoot = [
  'w-full font-mono text-foreground',
  '[&_[data-part=branch-content]]:relative',
  '[&_[data-part=branch-indent-guide]]:absolute [&_[data-part=branch-indent-guide]]:h-full [&_[data-part=branch-indent-guide]]:w-px [&_[data-part=branch-indent-guide]]:bg-border/40',
  '[&_[data-part=branch-control]]:flex [&_[data-part=branch-control]]:select-none [&_[data-part=branch-control]]:rounded [&_[data-part=branch-control]]:hover:bg-white/5',
  '[&_[data-part=branch-indicator]]:inline-flex [&_[data-part=branch-indicator]]:items-center [&_[data-part=branch-indicator]]:mr-1 [&_[data-part=branch-indicator]]:origin-center',
  '[&_[data-part=branch-indicator][data-state=open]]:rotate-90',
  '[&_[data-part=item]]:flex [&_[data-part=item]]:relative [&_[data-part=item]]:rounded [&_[data-part=item]]:hover:bg-white/5',
  '[&_[data-part=item-text]]:flex [&_[data-part=item-text]]:items-baseline',
  '[&_[data-part=branch-text]]:flex [&_[data-part=branch-text]]:items-baseline',
].join(' ');

const jsonTree = [
  'flex flex-col text-[13px] leading-[1.9] font-mono',
  '[&_svg]:w-3.5 [&_svg]:h-3.5',
  '[&_[data-type=string]]:text-[var(--json-string)]',
  '[&_[data-type=number]]:text-[var(--json-number)]',
  '[&_[data-type=boolean]]:text-[var(--json-boolean)] [&_[data-type=boolean]]:font-semibold',
  '[&_[data-type=null]]:text-[var(--json-null)] [&_[data-type=null]]:italic',
  '[&_[data-kind=brace]]:text-foreground/60 [&_[data-kind=brace]]:font-bold',
  '[&_[data-kind=key]]:text-[var(--json-key)] [&_[data-kind=key]]:font-medium',
  '[&_[data-kind=colon]]:text-muted-foreground/60 [&_[data-kind=colon]]:mx-0.5',
  '[&_[data-kind=preview-text]]:text-muted-foreground/50 [&_[data-kind=preview-text]]:italic',
].join(' ');

// ─── Data ────────────────────────────────────────────────────────────────────

const HERO_JSON = {
  block_uid: 'a7c3…:42',
  block_type: 'paragraph',
  source: 'contract_2024.pdf',
  schema: 'contract_review_v1',
  data: {
    clause_type: 'indemnification',
    risk_level: 'high',
    parties: ['Acme Corp', 'Globex Inc'],
    confidence: 0.93,
  },
};

const PIPELINE_STAGES = [
  { icon: IconUpload, step: '01', title: 'Ingest', text: 'Files, databases, or APIs. PDF, Word, Markdown, PostgreSQL, Snowflake — every source normalizes into addressable blocks with deterministic IDs.' },
  { icon: IconTable, step: '02', title: 'Parse', text: 'Documents decompose into typed blocks via Docling, Remark, or Pandoc. Databases arrive as structured rows via dlt. Choose your parser.' },
  { icon: IconTransform, step: '03', title: 'Transform', text: 'Run dlt, dbt, Python, or custom scripts. Clean, merge, chunk, segment. Chain transforms in any order.' },
  { icon: IconBrain, step: '04', title: 'Extract', text: 'Define schema fields — the AI fills them per block. Metadata, revision, or both. Same instructions on block 1 and block 5,000.' },
  { icon: IconChecks, step: '05', title: 'Review', text: 'AI writes to staging. You review in the grid, edit inline, confirm per-block or in bulk. Nothing ships without approval.' },
  { icon: IconFileExport, step: '06', title: 'Export', text: 'JSONL, CSV, Parquet, databases, knowledge graphs, vector stores, or serve directly via MCP.' },
];

const GRID_ROWS = [
  { i: 42, type: 'PARA', content: 'The court held that the administrative agency exceeded its statutory…', fn: 'holding', auth: 'Chevron', status: 'confirmed' },
  { i: 43, type: 'PARA', content: 'In reaching this conclusion, the majority relied on the plain text…', fn: 'reasoning', auth: 'Marbury', status: 'staged' },
  { i: 44, type: 'HEAD', content: 'III. Dissenting Opinion', fn: '—', auth: '—', status: 'staged' },
  { i: 45, type: 'PARA', content: "The dissent argued that the majority's reading of the statute fails…", fn: 'dissent', auth: 'Griswold', status: 'pending' },
  { i: 46, type: 'PARA', content: 'Furthermore, the legislative history demonstrates clear congressional…', fn: 'reasoning', auth: 'McCulloch', status: 'confirmed' },
];

const USE_CASES = [
  {
    key: 'analysis',
    label: 'Document analysis',
    icon: IconEye,
    badge: 'AI Extraction',
    title: 'Process 200-page contracts at consistent quality',
    body: 'Same instructions on block 1 and block 840. No drift, no fatigue. Review and confirm before export.',
    highlights: ['block 1', 'block 840', 'No drift'],
    fields: ['clause_type', 'risk_level', 'affected_parties', 'confidence'],
    json: { clause_type: 'indemnification', risk_level: 'high', affected_parties: ['Licensee'], confidence: 0.93 },
  },
  {
    key: 'pipeline',
    label: 'Data pipeline',
    icon: IconTransform,
    badge: 'Transform + Extract',
    title: 'Ingest from Postgres, transform with dbt, enrich with AI',
    body: 'Load structured data, run SQL transforms, add AI-generated fields, export enriched records to your warehouse.',
    highlights: ['structured data', 'SQL transforms', 'AI-generated'],
    fields: ['source_table', 'dbt_model', 'enriched_category', 'confidence'],
    json: { source_table: 'transactions', dbt_model: 'risk_scoring_v2', enriched_category: 'high_value', confidence: 0.91 },
  },
  {
    key: 'knowledge',
    label: 'Knowledge base',
    icon: IconServer,
    badge: 'KG + MCP',
    title: 'Turn documents into an AI-searchable knowledge base',
    body: 'Upload your docs and databases. Get a live knowledge graph and vector index served via MCP — any AI tool in your org can search it instantly.',
    highlights: ['knowledge graph', 'vector index', 'MCP'],
    fields: ['entity', 'relationships', 'embedding_model', 'mcp_endpoint'],
    json: { entity: 'Acme Corp', relationships: ['party_to:Contract_2024', 'subsidiary_of:MegaCorp'], embedding_model: 'text-embedding-3-small', mcp_endpoint: '/query' },
  },
  {
    key: 'revision',
    label: 'Batch revision',
    icon: IconPencil,
    badge: 'Content Revision',
    title: 'Revise an entire corpus and reconstruct documents',
    body: 'Apply revision rules per block. Review side-by-side. Export reconstructed documents with full provenance.',
    highlights: ['per block', 'side-by-side', 'full provenance'],
    fields: ['revised_content', 'tone_target', 'readability_score'],
    json: { revised_content: 'The licensee shall indemnify…', tone_target: 'plain_language', readability_score: '8th_grade' },
  },
];

const DESTINATIONS = [
  {
    icon: IconServer,
    title: 'MCP Server',
    text: 'Serve structured knowledge directly to Claude, agents, and any MCP-compatible AI tool. Upload docs → get a queryable endpoint.',
    tag: 'MCP',
    accent: true,
  },
  {
    icon: IconTopologyStarRing3,
    title: 'Knowledge Graphs',
    text: 'Metadata becomes traversable graph nodes and edges. Export to ArangoDB or Neo4j. Traverse relationships AI can reason over.',
    tag: 'Graph',
    accent: true,
  },
  {
    icon: IconVectorTriangle,
    title: 'Vector Stores',
    text: 'Embed content chunks into Pinecone, Weaviate, or Qdrant. Power semantic search and RAG pipelines with per-block metadata filters.',
    tag: 'Vectors',
    accent: true,
  },
  {
    icon: IconFileExport,
    title: 'File Exports',
    text: 'JSONL (canonical), CSV, Parquet. One record per block with full provenance. Feed ML pipelines, fine-tuning datasets, or evaluation sets.',
    tag: 'Files',
  },
  {
    icon: IconDatabase,
    title: 'Databases',
    text: 'Push enriched blocks to PostgreSQL, Snowflake, BigQuery, or any dlt destination. Full transform lineage preserved.',
    tag: 'Data',
  },
  {
    icon: IconApi,
    title: 'Webhooks & APIs',
    text: 'Trigger downstream workflows on export. HTTP POST, Slack, Zapier — chain external services into any pipeline.',
    tag: 'APIs',
  },
];

const COMPARISON = [
  { label: '200-page document', doc: 'Quality degrades by page 40.', block: '5,000+ blocks. Consistent quality on every one.' },
  { label: 'Traceability', doc: 'No source reference.', block: 'Block 247: paragraph 3, page 42, contract_2024.pdf.' },
  { label: 'Parallelism', doc: 'Sequential. One prompt, one pass.', block: '20 concurrent workers. 5,000 blocks in 12 minutes.' },
  { label: 'Human review', doc: 'Read the entire output and hope.', block: 'Staging → inspect per block → confirm → export.' },
  { label: 'Scale', doc: '1 document per session.', block: 'Thousands of blocks across documents and databases.' },
];

const FAQ_ITEMS = [
  {
    value: 'what-is-block',
    question: 'What is a block?',
    answer: 'An addressable unit of data — paragraph, heading, table row, or database record. Each has a deterministic UID and full source provenance. Re-upload the same file, get the same IDs. Join results to external systems.',
    highlights: ['deterministic UID', 'provenance', 'same IDs'],
  },
  {
    value: 'what-tools',
    question: 'What tools does BlockData use?',
    answer: 'Docling, Remark, and Pandoc for document parsing. dlt for data loading, dbt for SQL transforms, Python for custom logic. AI extraction uses Pydantic-validated schemas with multi-model routing — cheap models for classification, capable models for extraction.',
    highlights: ['Docling', 'dlt', 'dbt', 'Pydantic', 'multi-model'],
  },
  {
    value: 'schema-modes',
    question: 'What can schemas do?',
    answer: 'Three modes. Metadata: classify, extract entities, tag topics, score confidence. Revision: rewrite to plain language, apply style standards, translate. Combined: revise content and return structured metadata about the revision in one pass.',
    highlights: ['Metadata', 'Revision', 'Combined'],
  },
  {
    value: 'review',
    question: 'Can I edit results before export?',
    answer: "That's the point. AI results land in staging. Review in the grid, edit inline, confirm per-block or in bulk. Nothing exports without your approval. The staging → confirm gate is what makes BlockData trustworthy for production use.",
    highlights: ['staging', 'per-block', 'approval'],
  },
  {
    value: 'mcp',
    question: 'What is MCP serving?',
    answer: 'MCP (Model Context Protocol) lets AI tools query your knowledge base directly. Upload documents, BlockData structures them, and serves the result behind an MCP endpoint. Claude, custom agents, or any MCP-compatible tool can search and retrieve from it instantly.',
    highlights: ['MCP', 'query your knowledge base', 'instantly'],
  },
  {
    value: 'getting-started',
    question: 'How do I get started?',
    answer: 'Create an account, upload documents or connect a database, define a schema (or let AI suggest one), and run your first pipeline. Results appear in the review grid within minutes. Export to any destination when ready.',
    highlights: ['upload', 'define a schema', 'within minutes'],
  },
];

