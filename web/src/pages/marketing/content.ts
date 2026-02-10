import type { ReactNode } from 'react';
import {
  IconBolt,
  IconFileText,
  IconPencil,
  IconSchema,
  IconScale,
  IconShare,
  IconTable,
  IconUpload,
} from '@tabler/icons-react';

export type MarketingStep = {
  step: string;
  title: string;
  description: string;
  icon: (props: { size?: number }) => ReactNode;
};

export const STEPS: MarketingStep[] = [
  {
    step: '01',
    title: 'Upload',
    description: 'Drop in any document — Markdown, Word, PDF. The platform decomposes it into ordered, typed blocks with stable identities.',
    icon: IconUpload,
  },
  {
    step: '02',
    title: 'Define Your Schema',
    description: 'Tell the platform what to extract. Browse templates, use the AI wizard, or write JSON directly. Your schema applies identically to every block.',
    icon: IconSchema,
  },
  {
    step: '03',
    title: 'Process',
    description: 'AI processes every block independently — no context window limits, no quality degradation on paragraph 400. Blocks run in parallel at any scale.',
    icon: IconBolt,
  },
  {
    step: '04',
    title: 'Use the Results',
    description: 'Watch structured data populate in real time. Filter, sort, inspect. Export as JSONL or push directly to Neo4j, DuckDB, or a webhook.',
    icon: IconTable,
  },
];

export type FeaturedUseCase = {
  title: string;
  scenario: string;
  how: string;
  examples: string[];
  result: string;
  icon: (props: { size?: number }) => ReactNode;
};

export const FEATURED_USE_CASES: FeaturedUseCase[] = [
  {
    icon: IconPencil,
    title: 'Work through a long document — paragraph by paragraph, at consistent quality.',
    scenario:
      'You have a 50,000-word manuscript, a 200-page thesis, or a lengthy technical report. You need every paragraph reviewed against the same standard — but no AI session can maintain quality across that length. By paragraph 200, the model drifts. By paragraph 400, it starts skipping sections.',
    how:
      'Upload your document. The platform splits it into its natural structure — paragraphs, headings, sections — each one an independent unit. Define a schema describing what you need (revision, notes, rules applied, quality score). AI processes every block independently. Paragraph 1 and paragraph 840 get identical treatment.',
    examples: [
      'Prose editing against a style guide (Strunk’s rules, house style, AP style)',
      'Technical accuracy review (flag unsupported claims, check citations)',
      'Structural assessment (classify each paragraph’s rhetorical function)',
      'Terminology extraction (key terms, definitions, cross-references)',
    ],
    result:
      'A long document reviewed at paragraph-level quality in minutes, not days. Every result traceable to the exact paragraph that produced it.',
  },
  {
    icon: IconShare,
    title: 'Turn a collection of documents into structured, searchable knowledge.',
    scenario:
      'You have dozens of documents — PDFs, Word files, markdown, slide decks — spread across a shared drive. They contain what your team knows: specifications, research, contracts, policies. Organizing and extracting structure manually is weeks of work.',
    how:
      'Create a project. Upload documents in parallel — the platform handles multiple formats. Every document becomes an ordered inventory of blocks. Define one schema: the fields you want extracted from every paragraph across every document. Apply it once. AI workers fan out across thousands of blocks in parallel.',
    examples: [
      'Entity and relationship extraction (people, organizations, connections)',
      'Topic classification per paragraph (what is this paragraph about?)',
      'Obligation tracking (who committed to what, where?)',
      'Cross-reference mapping (what references what?)',
    ],
    result:
      'A document set turned into structured, traceable output. Export JSONL for your pipeline or push directly to integrations.',
  },
];

export const MORE_USE_CASES = [
  {
    icon: IconScale,
    title: 'Legal Research at Scale',
    stat: '28,000 documents. 420,000 blocks.',
    description: 'Extract paragraph-level metadata — rhetorical function, citations, legal principles — from entire legal corpora.',
  },
  {
    icon: IconFileText,
    title: 'Contract Review',
    stat: '45 pages. 214 clauses. 6 fields.',
    description: 'Upload a contract. Get obligations, risk flags, defined terms, cross-references, and deadlines — clause by clause, with tracing.',
  },
];

export const CAPABILITIES = [
  {
    title: 'Multi-Format Ingestion',
    description: 'Markdown via mdast. DOCX/PDF and more via Docling. Every format produces the same block inventory.',
  },
  {
    title: 'Schema-First Extraction',
    description: 'Define exactly what to extract. Enums, arrays, nested objects — your schema controls the output contract.',
  },
  {
    title: 'Block-Level Parallelism',
    description: 'Each block is independent, so processing scales with workers, not with context windows.',
  },
  {
    title: 'Realtime Working Surface',
    description: 'Watch results fill in live inside the grid. Inspect, filter, and verify at paragraph resolution.',
  },
  {
    title: 'Deterministic Identity',
    description: 'Every block has a stable ID. Re-upload the same file, get the same IDs. Join results to external systems.',
  },
  {
    title: 'Exports + Integrations',
    description: 'Export canonical JSONL or push directly to downstream systems via integration connectors.',
  },
];

