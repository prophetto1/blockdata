import {
  Badge,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
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
import { styleTokens } from '@/lib/styleTokens';

// ─── Data ────────────────────────────────────────────────────────────────────

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function IntegrationCard({ group }: { group: IntegrationGroup }) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Group gap="sm" mb="xs">
        <ThemeIcon variant="light" color="teal" size="sm" radius="sm">
          <group.icon size={14} />
        </ThemeIcon>
        <Text fw={700} size="sm">{group.title}</Text>
        {group.soon && (
          <Badge size="xs" variant="light" color="teal">Soon</Badge>
        )}
      </Group>
      <Group gap={6} wrap="wrap">
        {group.items.map((item) => (
          <Badge
            key={item}
            variant="default"
            size="xs"
            radius="sm"
            styles={{ root: { textTransform: 'none' } }}
          >
            {item}
          </Badge>
        ))}
      </Group>
    </Paper>
  );
}

function Connector({ label }: { label: string }) {
  return (
    <Box
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minHeight: 24,
      }}
    >
      {/* Full-width line behind the label */}
      <Box
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 1,
          background: 'var(--mantine-color-default-border)',
        }}
      />
      {/* Label floating on the line */}
      <Box
        style={{
          margin: '0 auto',
          padding: '2px 8px',
          background: 'var(--mantine-color-body)',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Text
          style={{ fontSize: 10, whiteSpace: 'nowrap', lineHeight: 1 }}
          c="dimmed"
          fw={500}
        >
          {label}
        </Text>
        <IconChevronRight
          size={10}
          style={{ color: 'var(--mantine-color-dimmed)', flexShrink: 0 }}
        />
      </Box>
    </Box>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function IntegrationMap() {
  const hubCard = (
    <Paper
      p="xl"
      radius="lg"
      withBorder
      bg={styleTokens.marketing.integrationHubBackground}
      style={{
        textAlign: 'center' as const,
        borderColor: 'var(--mantine-color-teal-5)',
        borderWidth: 2,
      }}
    >
      <Text fw={800} fz={22} style={{ letterSpacing: '-0.02em' }}>
        BlockData
      </Text>
      <Text size="xs" c="dimmed" mt={4}>
        Schema-driven processing
      </Text>
    </Paper>
  );

  return (
    <Box>
      {/* ── Desktop layout (lg+) ── */}
      <Box
        visibleFrom="lg"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 110px minmax(160px, 200px) 110px 1fr',
          gridTemplateRows: 'auto repeat(3, auto)',
          gap: '12px 0',
          alignItems: 'center',
        }}
      >
        {/* Column headers */}
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="dimmed"
          style={{ gridColumn: 1, gridRow: 1 }}
        >
          Sources
        </Text>
        <Box style={{ gridColumn: '2 / 5', gridRow: 1 }} />
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="dimmed"
          ta="right"
          style={{ gridColumn: 5, gridRow: 1 }}
        >
          Destinations
        </Text>

        {/* Hub — spans rows 2–4, column 3 */}
        <Box
          style={{
            gridColumn: 3,
            gridRow: '2 / 5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {hubCard}
        </Box>

        {/* Source cards — column 1, rows 2–4 */}
        {SOURCES.map((source, i) => (
          <Box key={source.title} style={{ gridColumn: 1, gridRow: i + 2 }}>
            <IntegrationCard group={source} />
          </Box>
        ))}

        {/* Left connectors — column 2, rows 2–4 */}
        {LEFT_LABELS.map((label, i) => (
          <Box key={label} style={{ gridColumn: 2, gridRow: i + 2 }}>
            <Connector label={label} />
          </Box>
        ))}

        {/* Right connectors — column 4, rows 2–4 */}
        {RIGHT_LABELS.map((label, i) => (
          <Box key={label} style={{ gridColumn: 4, gridRow: i + 2 }}>
            <Connector label={label} />
          </Box>
        ))}

        {/* Destination cards — column 5, rows 2–4 */}
        {DESTINATIONS.map((dest, i) => (
          <Box key={dest.title} style={{ gridColumn: 5, gridRow: i + 2 }}>
            <IntegrationCard group={dest} />
          </Box>
        ))}
      </Box>

      {/* ── Mobile layout (< lg) ── */}
      <Box hiddenFrom="lg">
        <Stack gap="md">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" ta="center">
            Sources
          </Text>
          {SOURCES.map((s) => (
            <IntegrationCard key={s.title} group={s} />
          ))}

          <Group justify="center" py="xs">
            <IconArrowDown size={20} style={{ color: 'var(--mantine-color-dimmed)' }} />
          </Group>

          {hubCard}

          <Group justify="center" py="xs">
            <IconArrowDown size={20} style={{ color: 'var(--mantine-color-dimmed)' }} />
          </Group>

          <Text size="xs" fw={700} tt="uppercase" c="dimmed" ta="center">
            Destinations
          </Text>
          {DESTINATIONS.map((d) => (
            <IntegrationCard key={d.title} group={d} />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
