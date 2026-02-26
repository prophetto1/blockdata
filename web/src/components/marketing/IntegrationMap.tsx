import {
  IconArrowDown,
  IconChevronRight,
  IconCloud,
  IconDatabase,
  IconFileExport,
  IconFileText,
  IconTable,
  IconVectorTriangle,
  type TablerIcon,
} from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';

type IntegrationGroup = {
  icon: TablerIcon;
  title: string;
  items: string[];
  soon?: boolean;
};

const SOURCES: IntegrationGroup[] = [
  { icon: IconFileText, title: 'Documents', items: ['PDF', 'DOCX', 'Markdown'] },
  { icon: IconTable, title: 'Data & Media', items: ['XLSX', 'PPTX', 'CSV', 'Images'] },
  { icon: IconCloud, title: 'Cloud Storage', items: ['S3', 'Google Drive', 'SharePoint'], soon: true },
];

const DESTINATIONS: IntegrationGroup[] = [
  { icon: IconFileExport, title: 'File Exports', items: ['JSONL', 'CSV', 'Parquet'] },
  { icon: IconDatabase, title: 'Databases & Graphs', items: ['Neo4j', 'PostgreSQL', 'Snowflake'], soon: true },
  { icon: IconVectorTriangle, title: 'Vector & Automation', items: ['Pinecone', 'Weaviate', 'Webhooks'], soon: true },
];

const LEFT_LABELS = ['Upload', 'Parse', 'Sync'];
const RIGHT_LABELS = ['Export', 'Push', 'Index'];

function IntegrationCard({ group }: { group: IntegrationGroup }) {
  return (
    <div className="rounded-md border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <group.icon size={14} />
        </span>
        <span className="text-sm font-bold">{group.title}</span>
        {group.soon && <Badge size="xs" variant="green">Soon</Badge>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.items.map((item) => (
          <Badge key={item} size="xs" variant="secondary">{item}</Badge>
        ))}
      </div>
    </div>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <div className="relative flex items-center" style={{ minHeight: 24 }}>
      <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <div className="relative z-1 mx-auto flex items-center gap-0.5 bg-background px-2 py-0.5">
        <span className="whitespace-nowrap text-[10px] font-medium leading-none text-muted-foreground">
          {label}
        </span>
        <IconChevronRight size={10} className="shrink-0 text-muted-foreground" />
      </div>
    </div>
  );
}

export function IntegrationMap() {
  const hubCard = (
    <div
      className="rounded-lg border-2 border-emerald-500 p-6 text-center"
      style={{ background: 'var(--app-marketing-integration-hub-bg)' }}
    >
      <span className="text-[22px] font-extrabold" style={{ letterSpacing: '-0.02em' }}>
        BlockData
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">
        Schema-driven processing
      </span>
    </div>
  );

  return (
    <div>
      {/* Desktop layout (lg+) */}
      <div
        className="hidden lg:grid"
        style={{
          gridTemplateColumns: '1fr 110px minmax(160px, 200px) 110px 1fr',
          gridTemplateRows: 'auto repeat(3, auto)',
          gap: '12px 0',
          alignItems: 'center',
        }}
      >
        <span className="text-xs font-bold uppercase text-muted-foreground" style={{ gridColumn: 1, gridRow: 1 }}>
          Sources
        </span>
        <div style={{ gridColumn: '2 / 5', gridRow: 1 }} />
        <span className="text-right text-xs font-bold uppercase text-muted-foreground" style={{ gridColumn: 5, gridRow: 1 }}>
          Destinations
        </span>

        <div style={{ gridColumn: 3, gridRow: '2 / 5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {hubCard}
        </div>

        {SOURCES.map((source, i) => (
          <div key={source.title} style={{ gridColumn: 1, gridRow: i + 2 }}>
            <IntegrationCard group={source} />
          </div>
        ))}
        {LEFT_LABELS.map((label, i) => (
          <div key={label} style={{ gridColumn: 2, gridRow: i + 2 }}>
            <Connector label={label} />
          </div>
        ))}
        {RIGHT_LABELS.map((label, i) => (
          <div key={label} style={{ gridColumn: 4, gridRow: i + 2 }}>
            <Connector label={label} />
          </div>
        ))}
        {DESTINATIONS.map((dest, i) => (
          <div key={dest.title} style={{ gridColumn: 5, gridRow: i + 2 }}>
            <IntegrationCard group={dest} />
          </div>
        ))}
      </div>

      {/* Mobile layout (< lg) */}
      <div className="flex flex-col gap-4 lg:hidden">
        <span className="text-center text-xs font-bold uppercase text-muted-foreground">
          Sources
        </span>
        {SOURCES.map((s) => (
          <IntegrationCard key={s.title} group={s} />
        ))}

        <div className="flex items-center justify-center py-2">
          <IconArrowDown size={20} className="text-muted-foreground" />
        </div>

        {hubCard}

        <div className="flex items-center justify-center py-2">
          <IconArrowDown size={20} className="text-muted-foreground" />
        </div>

        <span className="text-center text-xs font-bold uppercase text-muted-foreground">
          Destinations
        </span>
        {DESTINATIONS.map((d) => (
          <IntegrationCard key={d.title} group={d} />
        ))}
      </div>
    </div>
  );
}
