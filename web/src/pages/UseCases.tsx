import { Tabs } from '@ark-ui/react/tabs';
import { Highlight } from '@ark-ui/react/highlight';
import { JsonTreeView } from '@ark-ui/react/json-tree-view';
import {
  IconBrain,
  IconChevronRight,
  IconDatabase,
  IconEye,
  IconPencil,
  IconShieldCheck,
  IconTransform,
  IconVectorTriangle,
  IconServer,
  IconTopologyStarRing3,
  IconApi,
  IconFileText,
  IconSparkles,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
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

const FEATURED = [
  {
    key: 'analysis',
    tabLabel: 'Document analysis',
    badge: 'AI Extraction',
    badgeIcon: IconEye,
    title: 'Process 200-page contracts at consistent quality',
    scenario: 'Legal memo, technical manual, or 200-page contract. Every clause needs categorizing, every risk flagging — without drift from page 1 to page 200.',
    approach: 'Same instructions on block 1 and block 840. No drift, no fatigue. Review and confirm before export.',
    highlights: ['block 1', 'block 840', 'No drift'],
    fields: ['clause_type', 'risk_level', 'affected_parties', 'confidence'],
    json: {
      clause_type: 'indemnification',
      risk_level: 'high',
      affected_parties: ['Licensee'],
      confidence: 0.93,
    },
    output: 'Structured table of clauses, risk levels, and affected parties. One row per block with source traceability.',
    downstream: 'Spreadsheet review, case management, compliance dashboards.',
  },
  {
    key: 'pipeline',
    tabLabel: 'Data pipeline',
    badge: 'Transform + Extract',
    badgeIcon: IconTransform,
    title: 'Ingest from Postgres, transform with dbt, enrich with AI',
    scenario: 'Customer data in Postgres. You need enriched categories, risk scores, and AI-generated summaries pushed to your warehouse.',
    approach: 'Load structured data, run SQL transforms, add AI-generated fields, export to your warehouse.',
    highlights: ['structured data', 'SQL transforms', 'AI-generated'],
    fields: ['source_table', 'dbt_model', 'enriched_category', 'confidence'],
    json: {
      source_table: 'transactions',
      dbt_model: 'risk_scoring_v2',
      enriched_category: 'high_value',
      confidence: 0.91,
    },
    output: 'Enriched records with AI-generated fields and full transform lineage.',
    downstream: 'Warehouse analytics, BI dashboards, ML feature stores.',
  },
  {
    key: 'transformation',
    tabLabel: 'Batch transformation',
    badge: 'Content Revision',
    badgeIcon: IconPencil,
    title: 'Revise an entire corpus and reconstruct documents',
    scenario: 'A large policy or documentation set needs readability and style modernization while preserving source context.',
    approach: 'Apply revision rules per block. Review side-by-side. Export reconstructed documents with full provenance.',
    highlights: ['per block', 'side-by-side', 'full provenance'],
    fields: ['revised_content', 'tone_target', 'readability_score'],
    json: {
      revised_content: 'The licensee shall indemnify…',
      tone_target: 'plain_language',
      readability_score: '8th_grade',
    },
    output: 'Revised dataset with block-level audit history and deterministic lineage.',
    downstream: 'CMS updates, publication pipelines, document reconstruction.',
  },
  {
    key: 'schema',
    tabLabel: 'Schema-driven',
    badge: 'Schema-Driven',
    badgeIcon: IconBrain,
    title: 'Schema-Driven Extraction',
    scenario: 'You need structured fields per block — metadata, revised content, or both. Define the schema, the AI fills it.',
    approach: 'Create a schema with the fields you need. The AI reads each block and returns structured answers. Analyze, revise, or combine both in one pass.',
    highlights: ['schema', 'structured answers', 'one pass'],
    fields: ['clause_type', 'risk_level', 'revised_content', 'confidence', 'compliance_status'],
    json: {
      clause_type: 'indemnification',
      risk_level: 'high',
      revised_content: 'The licensee shall indemnify…',
      confidence: 0.93,
      compliance_status: 'flagged',
    },
    output: 'Structured overlay per block with schema-aligned fields. Metadata, revision, or both.',
    downstream: 'Review grid, export to JSONL, feed downstream pipelines.',
  },
];

type SecondaryItem = {
  icon: typeof IconBrain;
  title: string;
  text: string;
  span: string;
  tag?: string;
  accent?: boolean;
};

const SECONDARY: SecondaryItem[] = [
  {
    icon: IconServer,
    title: 'AI-searchable knowledge base',
    text: 'Upload documents and databases. Get a live, queryable knowledge base served via MCP — any AI tool in your org can search and retrieve from it instantly.',
    span: 'md:col-span-2',
    tag: 'MCP',
    accent: true,
  },
  {
    icon: IconTopologyStarRing3,
    title: 'Knowledge graphs',
    text: 'Structured metadata becomes traversable graph nodes and edges. Export to ArangoDB or Neo4j. Traverse relationships your AI can reason over.',
    span: 'md:col-span-1',
    tag: 'Graph',
    accent: true,
  },
  {
    icon: IconVectorTriangle,
    title: 'Semantic search & RAG',
    text: 'Embed content chunks with metadata into vector indexes. Power semantic search and retrieval-augmented generation pipelines.',
    span: 'md:col-span-1',
    tag: 'Vectors',
    accent: true,
  },
  {
    icon: IconApi,
    title: 'Workflow automation',
    text: 'Chain 3rd-party API calls and custom scripts into any pipeline. Pull external data, enrich blocks, push results — no-code or code. One run, start to finish.',
    span: 'md:col-span-1',
    tag: 'APIs',
  },
  {
    icon: IconFileText,
    title: 'Document reconstruction',
    text: 'Reassemble revised atomic blocks back into publishable documents via XML transforms. Edit at block level, export as whole documents.',
    span: 'md:col-span-1',
    tag: 'Export',
  },
  {
    icon: IconDatabase,
    title: 'Database enrichment',
    text: 'Pull from Postgres, BigQuery, or any dlt source. Run dbt transforms. Add AI-generated fields. Push enriched data back to your warehouse.',
    span: 'md:col-span-1',
    tag: 'Data',
  },
  {
    icon: IconSparkles,
    title: 'Fine-tuning datasets',
    text: 'Confirmed extractions with full provenance become supervised training examples. Versioned exports become gold-standard evaluation sets.',
    span: 'md:col-span-1',
    tag: 'ML',
  },
  {
    icon: IconShieldCheck,
    title: 'Compliance & audit trail',
    text: 'Every output traces to source document, model version, prompt, and human review decision. Full provenance chain, always.',
    span: 'md:col-span-2',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function UseCases() {
  return (
    <div className="overflow-hidden">

      {/* ━━ FEATURED USE CASES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="pt-32 pb-24 md:pt-44 md:pb-32" style={{ background: 'var(--muted)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">

          {/* Tab selector */}
          <Tabs.Root defaultValue="analysis" className="w-full">
            <Tabs.List className="relative mx-auto mb-12 flex w-fit gap-1 rounded-full border border-border/60 bg-card/80 p-1 backdrop-blur">
              {FEATURED.map((uc) => (
                <Tabs.Trigger
                  key={uc.key}
                  value={uc.key}
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-muted-foreground transition-all data-selected:bg-primary data-selected:text-primary-foreground data-selected:shadow-sm"
                >
                  <uc.badgeIcon size={15} />
                  {uc.tabLabel}
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {FEATURED.map((uc) => (
              <Tabs.Content key={uc.key} value={uc.key}>
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-8 md:p-12">
                  {/* Header */}
                  <div className="mb-8 flex flex-col gap-3">
                    <Badge variant="outline" className="w-fit gap-1.5">
                      <uc.badgeIcon size={12} />
                      {uc.badge}
                    </Badge>
                    <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{uc.title}</h2>
                  </div>

                  {/* Two-column body */}
                  <div className="grid gap-10 lg:grid-cols-2">
                    <div className="flex flex-col gap-8">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Scenario</p>
                        <p className="text-base leading-relaxed text-muted-foreground">{uc.scenario}</p>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Approach</p>
                        <p className="text-base leading-relaxed text-muted-foreground">
                          <Highlight
                            className="rounded bg-primary/10 px-1 font-medium text-primary"
                            query={uc.highlights}
                            text={uc.approach}
                          />
                        </p>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Schema fields</p>
                        <div className="flex flex-wrap gap-2">
                          {uc.fields.map((f) => (
                            <Badge key={f} variant="secondary" className="rounded-md font-mono text-xs font-normal">{f}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      {/* JSON output */}
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

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Output</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{uc.output}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Downstream</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">{uc.downstream}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </section>

      {/* ━━ SECONDARY USE CASES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8">
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-primary">
            More use cases
          </p>
          <h2 className="mx-auto mb-16 max-w-md text-center text-3xl font-bold tracking-tight md:text-4xl">
            What teams build.
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {SECONDARY.map((item) => (
              <div
                key={item.title}
                className="group flex gap-5 rounded-2xl border border-border/60 bg-card/50 p-8 transition-colors hover:border-primary/30 hover:bg-card/80"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                  <item.icon size={22} />
                </div>
                <div>
                  <h3 className="mb-1 text-base font-bold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BottomCTA
        headline="Try it on real data."
        description="Connect a source, run a pipeline, and see structured results appear block by block."
      />

    </div>
  );
}
