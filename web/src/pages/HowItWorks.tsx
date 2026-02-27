import { Steps } from '@ark-ui/react/steps';
import { Tabs } from '@ark-ui/react/tabs';
import { Accordion } from '@ark-ui/react/accordion';
import { Clipboard } from '@ark-ui/react/clipboard';
import { Highlight } from '@ark-ui/react/highlight';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import {
  IconArrowRight,
  IconBrain,
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconDatabase,
  IconEye,
  IconFileExport,
  IconFileText,
  IconPencil,
  IconSparkles,
  IconTable,
  IconTransform,
  IconUpload,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { styleTokens } from '@/lib/styleTokens';
import { BottomCTA } from '@/components/marketing/BottomCTA';

// ─── JSON Tree View Tailwind ─────────────────────────────────────────────────

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

const PIPELINE = [
  { icon: IconUpload, title: 'Ingest', body: 'Files, databases, or APIs. Every source normalizes into addressable blocks with deterministic IDs.' },
  { icon: IconTable, title: 'Parse', body: 'Documents decompose into typed blocks. Databases load into queryable tables. Choose your parser.' },
  { icon: IconTransform, title: 'Transform', body: 'Run dlt, dbt, Python, or custom scripts. Chain transforms before or after extraction.' },
  { icon: IconBrain, title: 'Extract', body: 'Define schema fields. The AI fills them per block. Your instructions, consistent quality at any scale.' },
  { icon: IconCheck, title: 'Review', body: 'Results land in staging. Edit inline, confirm per-block or in bulk. Nothing ships without approval.' },
  { icon: IconFileExport, title: 'Export', body: 'JSONL, CSV, Parquet, databases, webhooks. Confirmed data with full provenance routes anywhere.' },
];

const GRID_ROWS = [
  { i: 42, type: 'PARA', content: 'The court held that the administrative agency exceeded its statutory…', fn: 'holding', auth: 'Chevron', status: 'confirmed' },
  { i: 43, type: 'PARA', content: 'In reaching this conclusion, the majority relied on the plain text…', fn: 'reasoning', auth: 'Marbury', status: 'staged' },
  { i: 44, type: 'HEAD', content: 'III. Dissenting Opinion', fn: '—', auth: '—', status: 'staged' },
  { i: 45, type: 'PARA', content: "The dissent argued that the majority's reading of the statute fails…", fn: 'dissent', auth: 'Griswold', status: 'pending' },
];

const COMPARISON = [
  { label: '200-page document', doc: 'Quality degrades by page 40.', block: '800+ blocks. Consistent quality.' },
  { label: 'Traceability', doc: 'No source reference.', block: 'Block 247: paragraph 3, page 42.' },
  { label: 'Parallelism', doc: 'Sequential processing.', block: '20 concurrent workers.' },
  { label: 'Human review', doc: 'Read entire output.', block: 'Staging → confirm per block.' },
  { label: 'Scale', doc: '1 document per session.', block: 'Thousands of blocks across documents and databases, in minutes.' },
];

const SCHEMA_MODES = {
  metadata: {
    label: 'Metadata',
    icon: IconEye,
    description: 'Classify paragraphs, extract entities, tag topics, and score confidence.',
    json: { rhetorical_function: 'holding', confidence: 0.92, cited_authorities: ['Chevron v. NRDC'] },
  },
  revision: {
    label: 'Revision',
    icon: IconPencil,
    description: 'Rewrite to plain language, apply style standards, translate, or simplify.',
    json: { revised_content: 'The court decided…', reading_level: '8th_grade', changes_made: 'simplified legal jargon' },
  },
  combined: {
    label: 'Combined',
    icon: IconSparkles,
    description: 'Revise content and return structured metadata about the revision.',
    json: { revised_content: 'The court decided…', reading_level_change: '12 → 8', compliance_status: 'approved' },
  },
};

const EXPORT_JSON = {
  immutable: {
    block_uid: 'a7c3…:42',
    block_type: 'paragraph',
    source_type: 'pdf',
    source_page: 12,
  },
  user_defined: {
    schema_ref: 'contract_review_v1',
    data: {
      rhetorical_function: 'claim',
      cited_authorities: ['Smith v. Jones'],
      confidence: 0.94,
    },
  },
};

const EXPORT_FORMATS = [
  {
    key: 'jsonl',
    icon: IconFileText,
    name: 'JSONL',
    badge: 'Canonical',
    bestFor: 'ML pipelines, fine-tuning, evaluation sets, webhook transfer.',
    detail: 'One record per line with nested structure preserved. All other formats derive from this.',
  },
  {
    key: 'csv',
    icon: IconTable,
    name: 'CSV',
    badge: 'Derived',
    bestFor: 'Spreadsheet review, analyst handoff, quick QA passes.',
    detail: 'Flat columns for simple inspection. Nested structures flattened.',
  },
  {
    key: 'parquet',
    icon: IconDatabase,
    name: 'Parquet',
    badge: 'Derived',
    bestFor: 'Analytics workloads, warehouse querying, columnar scans.',
    detail: 'Columnar compression with schema metadata. Fast scans, low storage.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function HowItWorks() {

  return (
    <div className="overflow-hidden">

      {/* ━━ PIPELINE — interactive Steps ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-32" style={{ background: 'var(--muted)' }}>
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, var(--primary) 0%, transparent 60%)',
            opacity: 0.08,
          }}
        />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="mb-16 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                The pipeline
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Six stages. Fully composable.
              </h1>
            </div>
          </div>

          <Steps.Root defaultStep={0} count={6} className="flex w-full flex-col gap-6">
            <Steps.List className="flex items-center justify-between">
              {PIPELINE.map((s, i) => (
                <Steps.Item key={i} index={i} className="relative flex flex-1 items-center gap-2 last:flex-initial">
                  <Steps.Trigger className="flex items-center gap-2 border-none bg-transparent p-0 font-sans text-sm font-medium text-foreground">
                    <Steps.Indicator className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors data-complete:border-primary data-complete:bg-primary data-complete:text-primary-foreground data-current:border-primary data-current:bg-primary/10 data-current:text-primary data-incomplete:border-border data-incomplete:text-muted-foreground">
                      <s.icon size={16} />
                    </Steps.Indicator>
                    <span className="hidden text-xs lg:inline">{s.title}</span>
                  </Steps.Trigger>
                  <Steps.Separator className="mx-2 h-0.5 flex-1 bg-border transition-colors data-complete:bg-primary" />
                </Steps.Item>
              ))}
            </Steps.List>

            {PIPELINE.map((s, i) => (
              <Steps.Content key={i} index={i} className="rounded-xl border border-border/60 bg-card/80 p-8">
                <div className="flex items-start gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <s.icon size={22} />
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold">{s.title}</h3>
                    <p className="text-base leading-relaxed text-muted-foreground">{s.body}</p>
                  </div>
                </div>
              </Steps.Content>
            ))}

            <Steps.CompletedContent className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
              <p className="text-lg font-medium text-primary">
                Pipeline complete. Confirmed data ready for export.
              </p>
            </Steps.CompletedContent>

            <div className="flex justify-center gap-3">
              <Steps.NextTrigger asChild>
                <Button className="gap-2">
                  Next step
                  <IconArrowRight size={15} />
                </Button>
              </Steps.NextTrigger>
            </div>
          </Steps.Root>
        </div>
      </section>

      {/* ━━ GRID PREVIEW ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="mb-16 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Review
              </p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Review before you export.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Every pipeline result lands in staging. Inspect block-by-block, edit inline, and confirm before anything ships.
              </p>
            </div>
          </div>

          {/* Mock grid */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-xl shadow-primary/5">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3.5">
              <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.dangerSoft }} />
              <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.warningSoft }} />
              <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.successSoft }} />
              <span className="mx-auto text-xs font-medium text-muted-foreground/60">
                legal_analysis_project — BlockData
              </span>
              <div className="w-10" />
            </div>

            {/* Header row */}
            <div className="hidden grid-cols-[3rem_4rem_1fr_6rem_5rem_5rem] border-b border-border/40 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 md:grid">
              <span className="pl-5">#</span>
              <span>Type</span>
              <span>Content (source)</span>
              <span>Function</span>
              <span>Authority</span>
              <span>Status</span>
            </div>

            {/* Data rows */}
            {GRID_ROWS.map((row, idx) => (
              <div
                key={row.i}
                className="grid grid-cols-[3rem_4rem_1fr_6rem_5rem_5rem] items-center border-b border-border/20 py-3 text-sm last:border-b-0"
                style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--app-marketing-demo-row-alt)' }}
              >
                <span className="pl-5 font-mono text-xs text-muted-foreground/50">{row.i}</span>
                <Badge variant="secondary" className="w-fit rounded font-mono text-[10px] font-normal">{row.type}</Badge>
                <span className="truncate pr-4 text-xs text-muted-foreground">{row.content}</span>
                <span className="font-mono text-xs">{row.fn}</span>
                <span className="font-mono text-xs text-muted-foreground">{row.auth}</span>
                <Badge
                  variant={row.status === 'confirmed' ? 'green' : row.status === 'staged' ? 'yellow' : 'gray'}
                  size="xs"
                  className="w-fit"
                >
                  {row.status}
                </Badge>
              </div>
            ))}

            {/* Footer */}
            <div className="py-2.5 text-center text-xs text-muted-foreground/50" style={{ background: 'var(--app-marketing-demo-footer-bg)' }}>
              Showing 4 of 347 blocks
            </div>
          </div>
        </div>
      </section>

      {/* ━━ EXPORT CONTRACT — JSON Tree + Clipboard ━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            {/* Left — explanation */}
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                The contract
              </p>
              <h2 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">
                The Export Contract
              </h2>
              <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
                <Highlight
                  className="rounded bg-primary/10 px-1 font-medium text-primary"
                  query={['two sections', 'provenance', 'never change']}
                  text="Every BlockData export follows a stable contract with two sections. Immutable fields guarantee provenance and never change. User-defined fields sit alongside them."
                />
              </p>

              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border/60 bg-card/80 p-6">
                  <h3 className="mb-2 text-base font-bold">Immutable section</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    block_uid, block_type, source_type, and locator fields. Guaranteed provenance that never changes.
                  </p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <h3 className="mb-2 text-base font-bold">User-defined section</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Your schema_ref and extracted data — metadata, revised content, or both. Sits alongside immutable provenance.
                  </p>
                </div>
              </div>
            </div>

            {/* Right — JSON tree with clipboard */}
            <div>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-xl shadow-primary/5">
                <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3.5">
                  <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.danger }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.warning }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: styleTokens.windowDots.success }} />
                  <span className="ml-auto text-xs font-medium text-muted-foreground/60">block_export.jsonl</span>
                  <Clipboard.Root value={JSON.stringify(EXPORT_JSON, null, 2)}>
                    <Clipboard.Trigger className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground">
                      <Clipboard.Indicator copied={<IconCheck size={13} />}>
                        <IconCopy size={13} />
                      </Clipboard.Indicator>
                    </Clipboard.Trigger>
                  </Clipboard.Root>
                </div>
                <div className="p-5">
                  <JsonTreeView.Root defaultExpandedDepth={3} className={jsonTreeRoot} data={EXPORT_JSON}>
                    <JsonTreeView.Tree className={jsonTree} arrow={<IconChevronRight size={14} />} />
                  </JsonTreeView.Root>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━ EXPORT FORMATS — Tabs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            Formats
          </p>
          <h2 className="mx-auto mb-16 max-w-md text-center text-3xl font-bold tracking-tight md:text-4xl">
            JSONL is canonical.
          </h2>

          <Tabs.Root defaultValue="jsonl" className="w-full">
            <Tabs.List className="relative mx-auto mb-10 flex w-fit gap-1 rounded-full border border-border/60 bg-card/80 p-1 backdrop-blur">
              {EXPORT_FORMATS.map((fmt) => (
                <Tabs.Trigger
                  key={fmt.key}
                  value={fmt.key}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-all data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-sm"
                >
                  <fmt.icon size={15} />
                  {fmt.name}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {EXPORT_FORMATS.map((fmt) => (
              <Tabs.Content key={fmt.key} value={fmt.key}>
                <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <fmt.icon size={20} />
                      </div>
                      <h3 className="text-xl font-bold">{fmt.name}</h3>
                    </div>
                    <Badge variant={fmt.badge === 'Canonical' ? 'default' : 'secondary'}>
                      {fmt.badge}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">Best for</p>
                      <p className="text-base leading-relaxed text-foreground">{fmt.bestFor}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Details</p>
                      <p className="text-base leading-relaxed text-muted-foreground">{fmt.detail}</p>
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </section>

      {/* ━━ BLOCK vs DOCUMENT — Accordion comparison ━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-24 md:py-32" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            {/* Left — comparison */}
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Why blocks?
              </p>
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Block-level vs. document-level
              </h2>
              <p className="mb-10 text-lg text-muted-foreground">
                <Highlight
                  className="rounded bg-primary/10 px-1 font-medium text-primary"
                  query={['drift', 'atomic blocks', 'traceable']}
                  text="Processing data as a single blob leads to drift and lost provenance. Decomposing into atomic blocks keeps quality stable and every result traceable."
                />
              </p>

              <Accordion.Root collapsible className="flex w-full flex-col">
                {COMPARISON.map((item) => (
                  <Accordion.Item key={item.label} value={item.label} className="border-b border-border/60">
                    <Accordion.ItemTrigger className="flex w-full items-center justify-between gap-4 border-none bg-transparent py-5 text-left text-[15px] font-semibold text-foreground transition-colors hover:text-primary">
                      {item.label}
                      <Accordion.ItemIndicator className="inline-flex shrink-0 text-muted-foreground transition-transform duration-200 data-[state=open]:rotate-180">
                        <IconChevronDown size={16} />
                      </Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent className="overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
                      <div className="grid gap-3 pb-5 sm:grid-cols-2">
                        <div className="rounded-lg border border-border/40 bg-background p-4">
                          <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground/60">Document-level</p>
                          <p className="text-sm text-muted-foreground">{item.doc}</p>
                        </div>
                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                          <p className="mb-1 text-xs font-semibold uppercase text-primary/60">Block-level</p>
                          <p className="text-sm text-foreground">{item.block}</p>
                        </div>
                      </div>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </div>

            {/* Right — schema modes */}
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                Schema flexibility
              </p>
              <h2 className="mb-10 text-3xl font-bold tracking-tight md:text-4xl">
                Three modes. One engine.
              </h2>

              <Tabs.Root defaultValue="metadata" className="w-full">
                <Tabs.List className="relative mb-6 flex gap-1 rounded-xl border border-border/60 bg-card/80 p-1">
                  {Object.entries(SCHEMA_MODES).map(([key, mode]) => (
                    <Tabs.Trigger
                      key={key}
                      value={key}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all data-selected:bg-background data-selected:text-foreground data-selected:shadow-sm"
                    >
                      <mode.icon size={14} />
                      {mode.label}
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>

                {Object.entries(SCHEMA_MODES).map(([key, mode]) => (
                  <Tabs.Content key={key} value={key}>
                    <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80">
                      <div className="border-b border-border/40 p-5">
                        <p className="text-sm leading-relaxed text-muted-foreground">{mode.description}</p>
                      </div>
                      <div className="p-5">
                        <JsonTreeView.Root defaultExpandedDepth={2} className={jsonTreeRoot} data={mode.json}>
                          <JsonTreeView.Tree className={jsonTree} arrow={<IconChevronRight size={14} />} />
                        </JsonTreeView.Root>
                      </div>
                    </div>
                  </Tabs.Content>
                ))}
              </Tabs.Root>
            </div>
          </div>
        </div>
      </section>

      <BottomCTA
        headline="See it in action."
        description="Connect a source, configure a pipeline, and see structured results block by block."
      />

    </div>
  );
}
