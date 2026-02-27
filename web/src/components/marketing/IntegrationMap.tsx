import { HoverCard } from '@ark-ui/react/hover-card';
import { Portal } from '@ark-ui/react/portal';
import {
  IconArrowDown,
  IconCloud,
  IconDatabase,
  IconFileExport,
  IconUpload,
  IconVectorTriangle,
  IconWebhook,
  type TablerIcon,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';

// ─── Data ────────────────────────────────────────────────────────────────────

type IntegrationGroup = {
  id: string;
  icon: TablerIcon;
  title: string;
  items: string[];
  soon?: boolean;
  soonDetail?: string;
};

const SOURCES: IntegrationGroup[] = [
  {
    id: 'src-local',
    icon: IconUpload,
    title: 'Local Upload',
    items: ['PDF', 'DOCX', 'Markdown', 'XLSX', 'PPTX', 'CSV', 'Images'],
  },
  {
    id: 'src-cloud',
    icon: IconCloud,
    title: 'Cloud Storage',
    items: ['S3', 'Google Drive', 'Dropbox', 'OneDrive'],
  },
  {
    id: 'src-db',
    icon: IconDatabase,
    title: 'Databases',
    items: ['PostgreSQL', 'Snowflake', 'BigQuery'],
    soon: true,
    soonDetail: 'Ingest structured data from databases using dlt pipelines. Read from any dlt source.',
  },
];

const DESTINATIONS: IntegrationGroup[] = [
  {
    id: 'dst-files',
    icon: IconFileExport,
    title: 'File Exports',
    items: ['JSONL', 'CSV', 'Parquet'],
  },
  {
    id: 'dst-db',
    icon: IconDatabase,
    title: 'Databases',
    items: ['PostgreSQL', 'Snowflake', 'BigQuery', 'Neo4j'],
    soon: true,
    soonDetail: 'Push structured block data to any dlt destination — warehouses, knowledge graphs, lakehouses.',
  },
  {
    id: 'dst-vec',
    icon: IconVectorTriangle,
    title: 'Vector Stores',
    items: ['Pinecone', 'Weaviate', 'Qdrant'],
    soon: true,
    soonDetail: 'Embed and index blocks for semantic search and RAG pipelines.',
  },
  {
    id: 'dst-hooks',
    icon: IconWebhook,
    title: 'Webhooks',
    items: ['HTTP POST', 'Slack', 'Zapier'],
    soon: true,
    soonDetail: 'Trigger downstream workflows on run completion or export events.',
  },
];

const PIPELINE_LABELS = ['Ingest', 'Transform', 'Extract', 'Export'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SoonBadge({ detail }: { detail?: string }) {
  if (!detail) return <Badge size="xs" variant="green">Soon</Badge>;

  return (
    <HoverCard.Root openDelay={200} closeDelay={100}>
      <HoverCard.Trigger asChild>
        <span className="cursor-default">
          <Badge size="xs" variant="green">Soon</Badge>
        </span>
      </HoverCard.Trigger>
      <Portal>
        <HoverCard.Positioner>
          <HoverCard.Content className="z-50 w-64 rounded-lg border border-border/60 bg-popover p-4 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
            <p className="text-sm leading-relaxed text-popover-foreground">{detail}</p>
          </HoverCard.Content>
        </HoverCard.Positioner>
      </Portal>
    </HoverCard.Root>
  );
}

function CardContent({ group }: { group: IntegrationGroup }) {
  return (
    <>
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <group.icon size={13} />
        </span>
        <span className="text-[13px] font-bold leading-none">{group.title}</span>
        {group.soon && <SoonBadge detail={group.soonDetail} />}
      </div>
      <div className="flex flex-wrap gap-1">
        {group.items.map((item) => (
          <Badge key={item} size="xs" variant="secondary" className="rounded font-mono text-[10px] font-normal">
            {item}
          </Badge>
        ))}
      </div>
    </>
  );
}

// ─── SVG Connectors ─────────────────────────────────────────────────────────

function ConvergeLines({ count }: { count: number }) {
  const positions = Array.from({ length: count }, (_, i) =>
    ((i + 0.5) / count) * 100,
  );
  return (
    <svg
      viewBox="0 0 48 100"
      preserveAspectRatio="none"
      className="h-full w-10 shrink-0"
      fill="none"
    >
      {positions.map((y, i) => (
        <line
          key={i}
          x1="0" y1={y}
          x2="48" y2="50"
          stroke="var(--primary)"
          strokeWidth="1.5"
          opacity="0.15"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function DivergeLines({ count }: { count: number }) {
  const positions = Array.from({ length: count }, (_, i) =>
    ((i + 0.5) / count) * 100,
  );
  return (
    <svg
      viewBox="0 0 48 100"
      preserveAspectRatio="none"
      className="h-full w-10 shrink-0"
      fill="none"
    >
      {positions.map((y, i) => (
        <line
          key={i}
          x1="0" y1="50"
          x2="48" y2={y}
          stroke="var(--primary)"
          strokeWidth="1.5"
          opacity="0.15"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IntegrationMap() {
  return (
    <div>
      {/* Desktop: three-column flow with SVG connectors */}
      <div className="hidden lg:flex lg:items-center lg:justify-center">
        {/* Sources + converging lines */}
        <div className="flex items-stretch">
          <div className="flex flex-col gap-3">
            {SOURCES.map((g) => (
              <div key={g.id} className="w-56 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
                <CardContent group={g} />
              </div>
            ))}
          </div>
          <ConvergeLines count={SOURCES.length} />
        </div>

        {/* Hub */}
        <div className="flex w-48 shrink-0 flex-col items-center rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-8">
          <span className="text-lg font-extrabold tracking-tight">BlockData</span>
          <div className="mt-4 flex flex-col items-center gap-2">
            {PIPELINE_LABELS.map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <span className="rounded-md bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary">
                  {label}
                </span>
                {i < PIPELINE_LABELS.length - 1 && (
                  <IconArrowDown size={12} className="text-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Diverging lines + Destinations */}
        <div className="flex items-stretch">
          <DivergeLines count={DESTINATIONS.length} />
          <div className="flex flex-col gap-3">
            {DESTINATIONS.map((g) => (
              <div key={g.id} className="w-56 rounded-xl border border-border/60 bg-card/80 p-3 shadow-sm">
                <CardContent group={g} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-4 lg:hidden">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">Sources</p>
        {SOURCES.map((g) => (
          <div key={g.id} className="rounded-xl border border-border/60 bg-card/50 p-4">
            <CardContent group={g} />
          </div>
        ))}

        <div className="flex items-center justify-center py-2">
          <IconArrowDown size={20} className="text-muted-foreground" />
        </div>

        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-6 text-center">
          <span className="block text-lg font-extrabold tracking-tight">BlockData</span>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            {PIPELINE_LABELS.map((label, i) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{label}</span>
                {i < PIPELINE_LABELS.length - 1 && <span className="text-xs text-muted-foreground">→</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          <IconArrowDown size={20} className="text-muted-foreground" />
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-widest text-primary">Destinations</p>
        {DESTINATIONS.map((g) => (
          <div key={g.id} className="rounded-xl border border-border/60 bg-card/50 p-4">
            <CardContent group={g} />
          </div>
        ))}
      </div>
    </div>
  );
}