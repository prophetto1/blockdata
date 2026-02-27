import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs } from '@ark-ui/react/tabs';
import { Accordion } from '@ark-ui/react/accordion';
import { Highlight } from '@ark-ui/react/highlight';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import {
  IconArrowRight,
  IconUpload,
  IconBolt,
  IconChecks,
  IconTable,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconDatabase,
  IconFileExport,
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
  IconPlayerPlay,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── JSON tree styles ────────────────────────────────────────────────────────

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

const TECH_PILLS = [
  { label: 'ArangoDB', icon: IconDatabase },
  { label: 'Claude MCP', icon: IconServer },
  { label: 'Pydantic', icon: IconShieldCheck },
  { label: 'dlt + dbt', icon: IconTransform },
];

const SOURCE_TYPES = [
  { icon: IconFileText, title: 'Documents', formats: ['PDF', 'DOCX', 'Markdown', 'XLSX', 'PPTX', 'Images'] },
  { icon: IconDatabase, title: 'Databases', formats: ['PostgreSQL', 'Snowflake', 'BigQuery', 'DuckDB'] },
  { icon: IconTable, title: 'Spreadsheets', formats: ['CSV', 'Excel', 'TSV', 'Google Sheets'] },
  { icon: IconApi, title: 'API Sources', formats: ['REST', 'GraphQL', 'Webhooks'] },
];

const FLOW_STEPS = [
  { step: '01', title: 'Ingest', desc: 'Upload anything' },
  { step: '02', title: 'Normalize', desc: 'Atomic blocks' },
  { step: '03', title: 'Transform', desc: 'AI + rules' },
  { step: '04', title: 'Serve', desc: 'KG, vectors, MCP' },
];

const PIPELINE_STAGES = [
  { icon: IconUpload, step: '01', title: 'Ingest', text: 'Files, databases, or APIs. PDF, Word, Markdown, PostgreSQL, Snowflake — every source normalizes into addressable blocks with deterministic IDs.' },
  { icon: IconTable, step: '02', title: 'Parse', text: 'Documents decompose into typed blocks via Docling, Remark, or Pandoc. Databases arrive as structured rows via dlt.' },
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

const CONVERGENCE_TARGETS = [
  { icon: IconFileText, label: 'Documents', desc: 'Structured block data' },
  { icon: IconTopologyStarRing3, label: 'Knowledge Graph', desc: 'Nodes & edges' },
  { icon: IconVectorTriangle, label: 'Vector Embeddings', desc: 'Semantic search' },
];

const DESTINATIONS = [
  { icon: IconServer, title: 'MCP Server', text: 'Serve structured knowledge directly to Claude, agents, and any MCP-compatible AI tool. Upload docs → get a queryable endpoint.', tag: 'MCP', accent: true },
  { icon: IconTopologyStarRing3, title: 'Knowledge Graphs', text: 'Metadata becomes traversable graph nodes and edges. Export to ArangoDB or Neo4j. Traverse relationships AI can reason over.', tag: 'Graph', accent: true },
  { icon: IconVectorTriangle, title: 'Vector Stores', text: 'Embed content chunks into Pinecone, Weaviate, or Qdrant. Power semantic search and RAG pipelines with per-block metadata filters.', tag: 'Vectors', accent: true },
  { icon: IconFileExport, title: 'File Exports', text: 'JSONL (canonical), CSV, Parquet. One record per block with full provenance.', tag: 'Files' },
  { icon: IconDatabase, title: 'Databases', text: 'Push enriched blocks to PostgreSQL, Snowflake, BigQuery, or any dlt destination.', tag: 'Data' },
  { icon: IconApi, title: 'Webhooks & APIs', text: 'Trigger downstream workflows. HTTP POST, Slack, Zapier — chain external services.', tag: 'APIs' },
];

const SCHEMA_PATHS = [
  { icon: IconTable, title: 'Visual Grid Builder', desc: 'Drag-and-drop field editor for non-technical users to define schema fields visually.' },
  { icon: IconCode, title: 'Monaco Code Editor', desc: 'Direct JSON/YAML schema editing with IntelliSense, validation, and auto-complete.' },
  { icon: IconBrain, title: 'AI Natural Language', desc: 'Describe what you need in plain English. The AI generates a validated schema.' },
  { icon: IconSparkles, title: 'Auto-Analyze', desc: 'Upload a sample. The system infers fields, types, and patterns automatically.' },
];

const USE_CASES = [
  {
    key: 'analysis', label: 'Document analysis', icon: IconEye, badge: 'AI Extraction',
    title: 'Process 200-page contracts at consistent quality',
    body: 'Same instructions on block 1 and block 840. No drift, no fatigue. Review and confirm before export.',
    highlights: ['block 1', 'block 840', 'No drift'],
    fields: ['clause_type', 'risk_level', 'affected_parties', 'confidence'],
    json: { clause_type: 'indemnification', risk_level: 'high', affected_parties: ['Licensee'], confidence: 0.93 },
  },
  {
    key: 'pipeline', label: 'Data pipeline', icon: IconTransform, badge: 'Transform + Extract',
    title: 'Ingest from Postgres, transform with dbt, enrich with AI',
    body: 'Load structured data, run SQL transforms, add AI-generated fields, export enriched records to your warehouse.',
    highlights: ['structured data', 'SQL transforms', 'AI-generated'],
    fields: ['source_table', 'dbt_model', 'enriched_category', 'confidence'],
    json: { source_table: 'transactions', dbt_model: 'risk_scoring_v2', enriched_category: 'high_value', confidence: 0.91 },
  },
  {
    key: 'knowledge', label: 'Knowledge base', icon: IconServer, badge: 'KG + MCP',
    title: 'Turn documents into an AI-searchable knowledge base',
    body: 'Upload your docs and databases. Get a live knowledge graph and vector index served via MCP — any AI tool in your org can search it instantly.',
    highlights: ['knowledge graph', 'vector index', 'MCP'],
    fields: ['entity', 'relationships', 'embedding_model', 'mcp_endpoint'],
    json: { entity: 'Acme Corp', relationships: ['party_to:Contract_2024', 'subsidiary_of:MegaCorp'], embedding_model: 'text-embedding-3-small', mcp_endpoint: '/query' },
  },
  {
    key: 'revision', label: 'Batch revision', icon: IconPencil, badge: 'Content Revision',
    title: 'Revise an entire corpus and reconstruct documents',
    body: 'Apply revision rules per block. Review side-by-side. Export reconstructed documents with full provenance.',
    highlights: ['per block', 'side-by-side', 'full provenance'],
    fields: ['revised_content', 'tone_target', 'readability_score'],
    json: { revised_content: 'The licensee shall indemnify…', tone_target: 'plain_language', readability_score: '8th_grade' },
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
  { value: 'what-is-block', question: 'What is a block?', answer: 'An addressable unit of data — paragraph, heading, table row, or database record. Each has a deterministic UID and full source provenance. Re-upload the same file, get the same IDs.', highlights: ['deterministic UID', 'provenance', 'same IDs'] },
  { value: 'do-i-need-engineers', question: 'Do I need engineers to use this?', answer: 'No. Upload documents, pick a schema (or let AI suggest one), and run. Results appear in the review grid. Export when ready. Engineers can go deeper with dbt, custom transforms, and API workflows.', highlights: ['Upload documents', 'review grid', 'go deeper'] },
  { value: 'how-fast', question: 'How fast is setup?', answer: 'First pipeline in under 5 minutes. Upload a document, define fields, run extraction. Review results in the grid, export to any destination.', highlights: ['under 5 minutes', 'any destination'] },
  { value: 'schema-modes', question: 'What can schemas do?', answer: 'Three modes. Metadata: classify, extract entities, tag topics. Revision: rewrite to plain language, apply style standards. Combined: revise content and return structured metadata in one pass.', highlights: ['Metadata', 'Revision', 'Combined'] },
  { value: 'mcp', question: 'Can my AI tools access the results?', answer: 'Yes. BlockData serves structured knowledge via MCP (Model Context Protocol). Claude, custom agents, or any MCP-compatible tool can search and retrieve from your knowledge base instantly.', highlights: ['MCP', 'knowledge base', 'instantly'] },
  { value: 'review', question: 'Can I edit results before export?', answer: "That's the point. AI results land in staging. Review in the grid, edit inline, confirm per-block or in bulk. Nothing exports without your approval.", highlights: ['staging', 'per-block', 'approval'] },
];

const SECTIONS = [
  { id: 'hero', label: 'Overview' },
  { id: 'sources', label: 'Sources' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'review', label: 'Review' },
  { id: 'convergence', label: 'ArangoDB' },
  { id: 'outputs', label: 'Outputs' },
  { id: 'schemas', label: 'Schemas' },
  { id: 'use-cases', label: 'Use cases' },
  { id: 'mcp', label: 'MCP' },
  { id: 'why-blocks', label: 'Why blocks' },
  { id: 'faq', label: 'FAQ' },
] as const;

// ─── Section Nav ─────────────────────────────────────────────────────────────

function SectionNav() {
  const [active, setActive] = useState<string>('hero');

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="fixed right-11 top-1/2 z-40 hidden -translate-y-1/2 xl:flex xl:flex-col xl:gap-1">
      {SECTIONS.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
            active === s.id
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground/50 hover:text-muted-foreground'
          }`}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden">
      <SectionNav />

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="hero" className="relative pt-28 pb-20 md:pt-40 md:pb-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 md:px-8">
          {/* Tech pills */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {TECH_PILLS.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
              >
                <t.icon size={13} className="text-primary" />
                {t.label}
              </span>
            ))}
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            From Raw Data to{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI-Ready Knowledge
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            The first end-to-end platform to ingest, structure, and transform your documents and databases into Knowledge Graphs and Vectors — served instantly via MCP.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-primary px-8 text-base text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={() => navigate('/register')}
            >
              Get started free
              <IconArrowRight size={18} />
            </Button>
            <Button size="lg" variant="outline" className="h-12 gap-2 rounded-full px-8 text-base">
              <IconPlayerPlay size={16} />
              Watch demo
            </Button>
          </div>

          {/* 4-step simplified flow */}
          <div className="mt-16 flex items-center justify-center gap-2 sm:gap-4">
            {FLOW_STEPS.map((s, i) => (
              <div key={s.step} className="flex items-center gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/80 text-xs font-bold text-primary sm:h-12 sm:w-12">
                    {s.step}
                  </span>
                  <span className="text-xs font-semibold">{s.title}</span>
                  <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <IconArrowRight size={14} className="mt-[-16px] text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>

          {/* Mini dashboard mock */}
          <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/60" />
              <span className="ml-3 text-[11px] text-muted-foreground/50">BlockData — Workbench</span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/30 p-6">
              <div className="px-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Assets</p>
                <p className="mt-2 text-2xl font-bold">89</p>
                <p className="text-xs text-muted-foreground">documents uploaded</p>
                <p className="mt-1 text-2xl font-bold">4</p>
                <p className="text-xs text-muted-foreground">datasets connected</p>
              </div>
              <div className="px-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Pipeline</p>
                <div className="mt-3 flex flex-col gap-1.5">
                  {['Ingest', 'Transform', 'Extract'].map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${i < 2 ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                      <span className="text-xs">{s}</span>
                      <span className="text-[10px] text-muted-foreground">{i < 2 ? 'done' : 'running'}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">MCP Endpoints</p>
                <div className="mt-3 flex flex-col gap-2">
                  <div className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                    <p className="text-xs font-semibold">Main Cluster</p>
                    <p className="text-[10px] text-muted-foreground">1.2k/s · 2 agents connected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ CONNECT ANY SOURCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="sources" className="py-20 md:py-28" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            The &ldquo;dump&rdquo; experience
          </p>
          <h2 className="mx-auto mb-4 max-w-xl text-center text-3xl font-bold tracking-tight md:text-4xl">
            Connect any source
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            PDFs, SQL exports, CSVs, spreadsheets — dump everything in. The system auto-segments it into atomic knowledge objects.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SOURCE_TYPES.map((s) => (
              <div key={s.title} className="rounded-xl border border-border/60 bg-card/80 p-6 transition-colors hover:border-primary/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon size={20} />
                </div>
                <h3 className="mb-2 text-sm font-bold">{s.title}</h3>
                <div className="flex flex-wrap gap-1">
                  {s.formats.map((f) => (
                    <Badge key={f} variant="secondary" className="rounded font-mono text-[10px] font-normal">{f}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ 6-STAGE PIPELINE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="pipeline" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <div className="mb-12 flex flex-col items-center gap-4 md:flex-row md:justify-between">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">How it works</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">The 6-stage pipeline</h2>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-5 py-3">
              <IconBolt size={20} className="text-primary" />
              <div>
                <p className="text-xl font-extrabold text-primary">10K+</p>
                <p className="text-xs text-muted-foreground">blocks per run</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE_STAGES.map((s) => (
              <div key={s.step} className="group rounded-xl border border-border/60 bg-card/50 p-6 transition-colors hover:border-primary/30 hover:bg-card/80">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <s.icon size={18} />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground/50">{s.step}</span>
                  <span className="text-sm font-bold">{s.title}</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ REVIEW GRID ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="review" className="py-20 md:py-28" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">Human-in-the-loop</p>
          <h2 className="mx-auto mb-4 max-w-lg text-center text-3xl font-bold tracking-tight md:text-4xl">
            Review before anything ships
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            AI writes to staging. You review in the grid, edit inline, confirm per-block or in bulk. Nothing exports without your approval.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/80">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <th className="w-12 px-4 py-3">#</th>
                  <th className="w-16 px-4 py-3">Type</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="w-24 px-4 py-3">Function</th>
                  <th className="w-24 px-4 py-3">Authority</th>
                  <th className="w-24 px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {GRID_ROWS.map((r) => (
                  <tr key={r.i} className="border-b border-border/20 transition-colors hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.i}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="rounded font-mono text-[10px]">{r.type}</Badge>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm">{r.content}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.fn}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.auth}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={r.status === 'confirmed' ? 'default' : 'secondary'}
                        className={`rounded text-[10px] ${r.status === 'confirmed' ? 'bg-green-500/15 text-green-400' : r.status === 'staged' ? 'bg-primary/15 text-primary' : ''}`}
                      >
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ━━ ARANGODB CONVERGENCE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="convergence" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">One database, three capabilities</p>
          <h2 className="mx-auto mb-4 max-w-lg text-center text-3xl font-bold tracking-tight md:text-4xl">
            ArangoDB Convergence
          </h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            Unlike traditional approaches that split data into separate vector, document, and graph stores, BlockData unifies everything into a single ArangoDB cluster.
          </p>
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-0">
            <div className="flex flex-col gap-3">
              {CONVERGENCE_TARGETS.map((t) => (
                <div key={t.label} className="flex w-64 items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <t.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:flex md:flex-col md:items-center md:justify-center md:px-6">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex h-[52px] items-center">
                  <div className="h-px w-12 bg-primary/30" />
                  <IconArrowRight size={14} className="text-primary/50" />
                </div>
              ))}
            </div>
            <div className="md:hidden">
              <IconArrowDown size={20} className="text-primary/50" />
            </div>
            <div className="flex w-64 flex-col items-center rounded-2xl border-2 border-primary/40 bg-primary/5 px-8 py-8">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <IconDatabase size={28} />
              </div>
              <p className="text-lg font-extrabold">ArangoDB</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">Documents + Graphs + Vectors</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">One cluster. One query language.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ WHAT YOU GET — OUTPUTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="outputs" className="py-20 md:py-28" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">Export anywhere</p>
          <h2 className="mx-auto mb-4 max-w-md text-center text-3xl font-bold tracking-tight md:text-4xl">
            What you get
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            Every block exports with full provenance. Choose your destination — or export to all of them.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DESTINATIONS.map((d) => (
              <div
                key={d.title}
                className={`group rounded-xl border p-6 transition-colors ${
                  d.accent
                    ? 'border-primary/30 bg-primary/[0.03] hover:bg-primary/[0.06]'
                    : 'border-border/60 bg-card/50 hover:border-primary/20 hover:bg-card/80'
                }`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${d.accent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <d.icon size={18} />
                  </div>
                  <Badge variant={d.accent ? 'default' : 'secondary'} className="rounded text-[10px]">{d.tag}</Badge>
                </div>
                <h3 className="mb-1 text-sm font-bold">{d.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{d.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ SCHEMA FLEXIBILITY ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="schemas" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">Schema flexibility</p>
          <h2 className="mx-auto mb-4 max-w-lg text-center text-3xl font-bold tracking-tight md:text-4xl">
            Four paths to define your schema
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            Data isn't static. BlockData offers four distinct paths for defining and evolving your data schema.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {SCHEMA_PATHS.map((s) => (
              <div key={s.title} className="group rounded-xl border border-border/60 bg-card/50 p-6 transition-colors hover:border-primary/30 hover:bg-card/80">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <s.icon size={20} />
                </div>
                <h3 className="mb-2 text-base font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ USE CASES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="use-cases" className="py-20 md:py-28" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">Use cases</p>
          <h2 className="mx-auto mb-12 max-w-md text-center text-3xl font-bold tracking-tight md:text-4xl">
            What teams build
          </h2>
          <Tabs.Root defaultValue="analysis" className="w-full">
            <Tabs.List className="relative mx-auto mb-10 flex w-fit flex-wrap gap-1 rounded-full border border-border/60 bg-card/80 p-1 backdrop-blur">
              {USE_CASES.map((uc) => (
                <Tabs.Trigger
                  key={uc.key}
                  value={uc.key}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-sm"
                >
                  <uc.icon size={14} />
                  {uc.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
            {USE_CASES.map((uc) => (
              <Tabs.Content key={uc.key} value={uc.key}>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-8 md:p-10">
                  <div className="mb-6 flex flex-col gap-2">
                    <Badge variant="outline" className="w-fit gap-1.5">
                      <uc.icon size={12} />
                      {uc.badge}
                    </Badge>
                    <h3 className="text-xl font-bold tracking-tight md:text-2xl">{uc.title}</h3>
                  </div>
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div className="flex flex-col gap-6">
                      <p className="text-base leading-relaxed text-muted-foreground">
                        <Highlight
                          className="rounded bg-primary/10 px-1 font-medium text-primary"
                          query={uc.highlights}
                          text={uc.body}
                        />
                      </p>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Schema fields</p>
                        <div className="flex flex-wrap gap-2">
                          {uc.fields.map((f) => (
                            <Badge key={f} variant="secondary" className="rounded-md font-mono text-xs font-normal">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
                      <div className="border-b border-border/40 px-4 py-2.5">
                        <span className="text-xs font-medium text-muted-foreground/60">example output</span>
                      </div>
                      <div className="p-4">
                        <JsonTreeView.Root defaultExpandedDepth={2} className={jsonTreeRoot} data={uc.json}>
                          <JsonTreeView.Tree className={jsonTree} arrow={<IconChevronRight size={14} />} />
                        </JsonTreeView.Root>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </section>

      {/* ━━ MCP SERVING LAYER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="mcp" className="py-20 md:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">One protocol to serve them all</p>
          <h2 className="mx-auto mb-4 max-w-lg text-center text-3xl font-bold tracking-tight md:text-4xl">
            MCP Serving Layer
          </h2>
          <p className="mx-auto mb-14 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            BlockData exposes your structured data via the Model Context Protocol. Connect your knowledge directly to Claude, ChatGPT, or custom LLM agents — no API wrappers needed.
          </p>
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center md:gap-0">
            <div className="w-72 rounded-2xl border-2 border-primary/40 bg-primary/5 p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <IconServer size={16} />
                </div>
                <span className="text-sm font-extrabold">BlockData Platform</span>
              </div>
              <div className="flex flex-col gap-2">
                {['Pydantic validation', 'Query router', 'Auth gateway'].map((item) => (
                  <div key={item} className="rounded-lg border border-border/40 bg-background/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:flex md:flex-col md:items-center md:justify-center md:px-6">
              <div className="flex items-center">
                <div className="h-px w-16 bg-primary/30" />
                <IconArrowRight size={14} className="text-primary/50" />
              </div>
              <span className="my-1 text-[10px] text-muted-foreground/50">MCP</span>
            </div>
            <div className="flex items-center gap-1 md:hidden">
              <IconArrowDown size={20} className="text-primary/50" />
              <span className="text-[10px] text-muted-foreground/50">MCP</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { icon: IconBrain, label: 'Claude & AI Agents', desc: 'Search and retrieve instantly' },
                { icon: IconCode, label: 'Custom Applications', desc: 'Query via MCP client SDK' },
                { icon: IconApi, label: 'External Services', desc: 'Webhook triggers on updates' },
              ].map((c) => (
                <div key={c.label} className="flex w-64 items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <c.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━ WHY BLOCKS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="why-blocks" className="py-20 md:py-28" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">Why blocks</p>
          <h2 className="mx-auto mb-4 max-w-lg text-center text-3xl font-bold tracking-tight md:text-4xl">
            Document-level vs block-level AI
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            Most AI tools process entire documents in one pass. BlockData decomposes data into atomic blocks and processes each one individually.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card/80">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  <th className="px-5 py-3.5" />
                  <th className="px-5 py-3.5 text-muted-foreground">Document-level AI</th>
                  <th className="px-5 py-3.5 text-primary">Block-level AI</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((c) => (
                  <tr key={c.label} className="border-b border-border/20">
                    <td className="px-5 py-3.5 text-sm font-semibold">{c.label}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{c.doc}</td>
                    <td className="px-5 py-3.5 text-sm">{c.block}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ━━ FAQ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="faq" className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight md:text-4xl">FAQ</h2>
          <Accordion.Root defaultValue={['what-is-block']} className="flex flex-col gap-2">
            {FAQ_ITEMS.map((item) => (
              <Accordion.Item
                key={item.value}
                value={item.value}
                className="overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-colors data-[state=open]:bg-card/80"
              >
                <Accordion.ItemTrigger className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left text-sm font-semibold transition-colors hover:text-primary">
                  {item.question}
                  <Accordion.ItemIndicator>
                    <IconChevronDown size={16} className="transition-transform duration-200 data-[state=open]:rotate-180" />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent className="px-5 pb-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    <Highlight
                      className="rounded bg-primary/10 px-0.5 font-medium text-primary"
                      query={item.highlights}
                      text={item.answer}
                    />
                  </p>
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>

      {/* ━━ BOTTOM CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="px-4 pb-24 pt-8 sm:px-6 md:px-8 md:pb-32">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.03]">
          <div className="flex flex-col items-center gap-8 px-8 py-14 text-center md:py-16">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              Ready to activate your dark data?
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
              Start ingesting your documents and databases. Get structured knowledge served to your AI tools — in minutes, not months.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-12 gap-2 rounded-full bg-primary px-8 text-base text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                onClick={() => navigate('/register')}
              >
                Get started free
                <IconArrowRight size={18} />
              </Button>
              <Button size="lg" variant="outline" className="h-12 gap-2 rounded-full px-8 text-base">
                Read documentation
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
