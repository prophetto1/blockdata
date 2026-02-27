import { useNavigate } from 'react-router-dom';
import { Tabs } from '@ark-ui/react/tabs';
import { Accordion } from '@ark-ui/react/accordion';
import { Clipboard } from '@ark-ui/react/clipboard';
import { Marquee } from '@ark-ui/react/marquee';
import { Highlight } from '@ark-ui/react/highlight';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import {
  IconArrowRight,
  IconUpload,
  IconBolt,
  IconChecks,
  IconTable,
  IconFingerprint,
  IconShieldCheck,
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
  IconRoute,
  IconBrain,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { styleTokens } from '@/lib/styleTokens';
import { IntegrationMap } from '@/components/marketing/IntegrationMap';
import { BottomCTA } from '@/components/marketing/BottomCTA';

// ─── JSON Tree View Tailwind classes ─────────────────────────────────────────

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
  immutable: {
    block_uid: 'a7c3…:42',
    block_type: 'paragraph',
    source_type: 'pdf',
  },
  user_defined: {
    schema_ref: 'contract_review_v1',
    data: {
      obligation_type: 'payment_deadline',
      parties: ['Acme Corp', 'Globex Inc'],
      risk_level: 'high',
    },
  },
};

const BENTO_ITEMS = [
  {
    icon: IconUpload,
    title: 'Multi-source ingestion',
    description: 'PDF, Word, databases, APIs. Every source produces the same addressable block inventory.',
    span: 'md:col-span-2',
  },
  {
    icon: IconCode,
    title: 'Code transforms',
    description: 'dlt, dbt, Python, custom scripts. Transform data without writing a pipeline from scratch.',
    span: '',
  },
  {
    icon: IconBrain,
    title: 'AI extraction',
    description: 'Schema-driven LLM processing. Define fields, the AI fills them per block.',
    span: '',
  },
  {
    icon: IconShieldCheck,
    title: 'Human review gate',
    description: 'AI writes to staging. You confirm before export. Nothing ships without approval.',
    span: '',
  },
  {
    icon: IconFingerprint,
    title: 'Deterministic identity',
    description: 'Same input, same block UIDs. Always. Join across systems, runs, and schemas.',
    span: '',
  },
  {
    icon: IconRoute,
    title: 'Composable pipeline',
    description: 'Chain stages in any order. Linear for simple jobs, visual DAG for complex workflows.',
    span: 'md:col-span-2',
  },
];

const FORMAT_ITEMS = [
  { name: 'PDF', icon: IconFileText },
  { name: 'Word', icon: IconFileText },
  { name: 'PostgreSQL', icon: IconDatabase },
  { name: 'dlt', icon: IconTransform },
  { name: 'dbt', icon: IconTransform },
  { name: 'Python', icon: IconCode },
  { name: 'JSONL', icon: IconFileExport },
  { name: 'CSV', icon: IconTable },
  { name: 'Parquet', icon: IconDatabase },
  { name: 'Neo4j', icon: IconDatabase },
  { name: 'S3 / GCS', icon: IconCloud },
  { name: 'Webhooks', icon: IconBolt },
];

const FAQ_ITEMS = [
  {
    value: 'what-is-pipeline',
    question: 'What is a pipeline?',
    answer: 'A sequence of stages that process your data — ingest, parse, transform, extract, review, export. You configure which stages run and in what order. Linear for simple jobs, composable DAG for complex workflows.',
    highlights: ['stages', 'ingest', 'transform', 'extract', 'composable DAG'],
  },
  {
    value: 'what-is-block',
    question: 'What is a block?',
    answer: 'An addressable unit of data — paragraph, heading, table row, or database record. Each has a deterministic ID and full source provenance. Blocks are what every pipeline stage operates on.',
    highlights: ['addressable unit', 'deterministic ID', 'provenance'],
  },
  {
    value: 'what-tools',
    question: 'What tools can I use?',
    answer: 'dlt for data loading, dbt for SQL transforms, Python for custom logic, or flow scripts for anything else. AI extraction uses Claude with multi-model routing — cheap models for classification, capable models for extraction.',
    highlights: ['dlt', 'dbt', 'Python', 'multi-model'],
  },
  {
    value: 'review',
    question: 'Can I edit results before export?',
    answer: 'That\'s the point. AI results land in staging. Review in the grid, edit inline, confirm per-block or in bulk. Nothing exports without your approval.',
    highlights: ['staging', 'grid', 'per-block', 'approval'],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden">

      {/* ━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32">
        {/* Gradient backdrop */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, var(--primary) 0%, transparent 60%)',
            opacity: 0.08,
          }}
        />

        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">

            {/* Left — copy */}
            <div className="flex flex-col gap-8">
              <Badge variant="outline" className="w-fit gap-1.5 px-3 py-1 text-xs">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Now in beta
              </Badge>

              <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
                Build data
                <br />
                <span className="bg-linear-to-r from-primary to-orange-400 bg-clip-text text-transparent">
                  pipelines.
                </span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground md:text-xl">
                Ingest documents and databases. Transform with dlt, dbt, and Python.
                Extract with AI. Review and export structured output with full provenance.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="h-12 gap-2 rounded-full bg-primary px-6 text-base text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate('/register')}
                >
                  Get started free
                  <IconArrowRight size={18} />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 gap-2 rounded-full px-6 text-base"
                  onClick={() => navigate('/how-it-works')}
                >
                  See how it works
                </Button>
              </div>
            </div>

            {/* Right — code window with JSON tree */}
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-border/60 bg-card/80 shadow-2xl shadow-primary/5 backdrop-blur">
                {/* Chrome bar */}
                <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3.5">
                  <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.danger }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.warning }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.success }} />
                  <span className="ml-auto text-xs font-medium text-muted-foreground/60">
                    pipeline output
                  </span>
                  <Clipboard.Root value={JSON.stringify(HERO_JSON, null, 2)}>
                    <Clipboard.Trigger className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground">
                      <Clipboard.Indicator copied={<IconCheck size={13} />}>
                        <IconCopy size={13} />
                      </Clipboard.Indicator>
                    </Clipboard.Trigger>
                  </Clipboard.Root>
                </div>
                {/* JSON Tree */}
                <div className="p-5">
                  <JsonTreeView.Root
                    defaultExpandedDepth={3}
                    className={jsonTreeRoot}
                    data={HERO_JSON}
                  >
                    <JsonTreeView.Tree
                      className={jsonTree}
                      arrow={<IconChevronRight size={14} />}
                    />
                  </JsonTreeView.Root>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ FORMATS MARQUEE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="border-y border-border/40 py-6">
        <Marquee.Root className="w-full overflow-hidden data-[orientation=horizontal]:h-12">
          <Marquee.Viewport className="h-full w-full">
            <Marquee.Content className="flex items-center gap-8">
              {FORMAT_ITEMS.map((item, i) => (
                <Marquee.Item
                  key={i}
                  className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-muted-foreground/70 select-none"
                >
                  <item.icon size={15} />
                  {item.name}
                </Marquee.Item>
              ))}
            </Marquee.Content>
          </Marquee.Viewport>
        </Marquee.Root>
      </section>

      {/* ━━ DATA FLOW — IntegrationMap ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Data flow
          </p>
          <h2 className="mx-auto mb-12 max-w-md text-center text-3xl font-bold tracking-tight md:text-4xl">
            Data in. Structured output out.
          </h2>
          <IntegrationMap />
        </div>
      </section>

      {/* ━━ PIPELINE — 6 stages ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            The pipeline
          </p>
          <h2 className="mx-auto mb-16 max-w-xl text-center text-3xl font-bold tracking-tight md:text-4xl">
            Six stages. Fully composable.
          </h2>

          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: IconUpload, step: '01', title: 'Ingest', text: 'Files, databases, or APIs. Every source normalizes into addressable blocks with deterministic IDs.' },
              { icon: IconTable, step: '02', title: 'Parse', text: 'Documents decompose into typed blocks. Databases load into queryable tables. Choose your parser.' },
              { icon: IconTransform, step: '03', title: 'Transform', text: 'Run dlt, dbt, Python, or custom scripts. Chain transforms in any order before or after extraction.' },
              { icon: IconBrain, step: '04', title: 'Extract', text: 'AI fills schema fields per block. Your instructions, consistent quality at any scale.' },
              { icon: IconChecks, step: '05', title: 'Review', text: 'Results land in staging. Edit inline, confirm per-block or in bulk. Nothing ships without approval.' },
              { icon: IconFileExport, step: '06', title: 'Export', text: 'JSONL, CSV, Parquet, databases, webhooks. Confirmed data with full provenance routes anywhere.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-4 bg-background p-8">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground/40">{s.step}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon size={18} />
                  </div>
                </div>
                <h3 className="text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ BENTO GRID — capabilities ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Capabilities
          </p>
          <h2 className="mx-auto mb-16 max-w-lg text-center text-3xl font-bold tracking-tight md:text-4xl">
            Everything you need.
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {BENTO_ITEMS.map((item) => (
              <div
                key={item.title}
                className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-8 transition-colors hover:border-primary/30 hover:bg-card/80 ${item.span}`}
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <item.icon size={22} />
                </div>
                <h3 className="mb-2 text-base font-bold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━ USE CASES — Tabs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-24 md:py-32">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: 'var(--muted)' }}
        />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="mb-16 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Use cases
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                See it in action.
              </h2>
            </div>
            <Button
              variant="outline"
              className="gap-2 rounded-full"
              onClick={() => navigate('/use-cases')}
            >
              All use cases
              <IconArrowRight size={15} />
            </Button>
          </div>

          <Tabs.Root defaultValue="analysis" className="w-full">
            <Tabs.List className="relative mb-10 flex gap-1 rounded-xl border border-border/60 bg-card/80 p-1.5 backdrop-blur">
              {[
                { value: 'analysis', label: 'Document analysis' },
                { value: 'pipeline', label: 'Data pipeline' },
                { value: 'transformation', label: 'Batch transformation' },
              ].map((t) => (
                <Tabs.Trigger
                  key={t.value}
                  value={t.value}
                  className="flex-1 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-all data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm"
                >
                  {t.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {[
              {
                key: 'analysis',
                badge: 'AI Extraction',
                title: 'Process 200-page contracts at consistent quality',
                body: 'Same instructions on block 1 and block 840. No drift, no fatigue. Review and confirm before export.',
                highlights: ['block 1', 'block 840', 'No drift'],
                fields: ['clause_type', 'risk_level', 'affected_parties', 'confidence'],
                json: { clause_type: 'indemnification', risk_level: 'high', affected_parties: ['Licensee'], confidence: 0.93 },
              },
              {
                key: 'pipeline',
                badge: 'Transform + Extract',
                title: 'Ingest from Postgres, transform with dbt, enrich with AI',
                body: 'Load structured data, run SQL transforms, add AI-generated fields, export to your warehouse.',
                highlights: ['structured data', 'SQL transforms', 'AI-generated'],
                fields: ['source_table', 'dbt_model', 'enriched_category', 'confidence'],
                json: { source_table: 'transactions', dbt_model: 'risk_scoring_v2', enriched_category: 'high_value', confidence: 0.91 },
              },
              {
                key: 'transformation',
                badge: 'Content Revision',
                title: 'Revise an entire corpus and reconstruct documents',
                body: 'Apply revision rules per block. Review side-by-side. Export reconstructed documents with full provenance.',
                highlights: ['per block', 'side-by-side', 'full provenance'],
                fields: ['revised_content', 'tone_target', 'readability_score'],
                json: { revised_content: 'The licensee shall indemnify…', tone_target: 'plain_language', readability_score: '8th_grade' },
              },
            ].map((uc) => (
              <Tabs.Content key={uc.key} value={uc.key}>
                <div className="grid items-start gap-8 lg:grid-cols-5">
                  <div className="flex flex-col gap-5 lg:col-span-3">
                    <Badge variant="outline" className="w-fit">{uc.badge}</Badge>
                    <h3 className="text-2xl font-bold leading-snug">{uc.title}</h3>
                    <p className="text-lg leading-relaxed text-muted-foreground">
                      <Highlight
                        className="rounded bg-primary/10 px-1 font-medium text-primary"
                        query={uc.highlights}
                        text={uc.body}
                      />
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      {uc.fields.map((f) => (
                        <Badge key={f} variant="secondary" className="rounded-md font-mono text-xs font-normal">{f}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80">
                      <div className="border-b border-border/40 px-4 py-2.5">
                        <span className="text-xs font-medium text-muted-foreground/60">output</span>
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

      {/* ━━ FAQ — Accordion ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            FAQ
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">
            Common questions
          </h2>

          <Accordion.Root defaultValue={['what-is-schema']} collapsible className="flex w-full flex-col">
            {FAQ_ITEMS.map((item) => (
              <Accordion.Item key={item.value} value={item.value} className="border-b border-border/60">
                <Accordion.ItemTrigger className="flex w-full items-center justify-between gap-4 border-none bg-transparent py-6 text-left text-[15px] font-semibold text-foreground transition-colors hover:text-primary">
                  {item.question}
                  <Accordion.ItemIndicator className="inline-flex shrink-0 items-center text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180">
                    <IconChevronDown size={16} />
                  </Accordion.ItemIndicator>
                </Accordion.ItemTrigger>
                <Accordion.ItemContent className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
                  <div className="pb-6 text-[15px] leading-relaxed text-muted-foreground">
                    <Highlight
                      className="rounded bg-primary/10 px-0.5 font-medium text-primary"
                      query={item.highlights}
                      text={item.answer}
                    />
                  </div>
                </Accordion.ItemContent>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </section>

      <BottomCTA />

    </div>
  );
}
