import { useEffect, useState } from 'react';
import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Anchor,
  Button,
  Paper,
  ThemeIcon,
  Skeleton,
  Center,
} from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import {
  IconFileText,
  IconPlayerPlay,
  IconUpload,
  IconPlus,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow, RunRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const STATUS_COLOR: Record<string, string> = {
  ingested: 'green',
  converting: 'yellow',
  uploaded: 'blue',
  conversion_failed: 'red',
  ingest_failed: 'red',
  running: 'blue',
  complete: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export default function Dashboard() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      supabase
        .from(TABLES.documents)
        .select('source_uid, doc_title, status, uploaded_at, source_type, owner_id, conv_uid, source_filesize, source_total_characters, error')
        .order('uploaded_at', { ascending: false })
        .limit(5),
      supabase
        .from(TABLES.runs)
        .select('run_id, conv_uid, schema_id, status, started_at, total_blocks, completed_blocks, failed_blocks, owner_id, completed_at, model_config')
        .order('started_at', { ascending: false })
        .limit(5),
    ]).then(([docRes, runRes]) => {
      if (docRes.error) setError(docRes.error.message);
      else setDocs((docRes.data ?? []) as DocumentRow[]);
      if (runRes.error) setError(runRes.error.message);
      else setRuns((runRes.data ?? []) as RunRow[]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Recent activity" />
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Stack gap="xs">
            {[1, 2, 3].map((i) => <Skeleton key={i} height={60} radius="md" />)}
          </Stack>
          <Stack gap="xs">
            {[1, 2, 3].map((i) => <Skeleton key={i} height={60} radius="md" />)}
          </Stack>
        </SimpleGrid>
      </>
    );
  }

  const isEmpty = docs.length === 0 && runs.length === 0;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Recent activity">
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate('/app/upload')}
        >
          New annotation
        </Button>
      </PageHeader>

      {error && <ErrorAlert message={error} />}

      {isEmpty && (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" variant="light" color="blue">
              <IconUpload size={40} />
            </ThemeIcon>
            <Text size="lg" fw={600}>Get started</Text>
            <Text size="sm" c="dimmed" maw={400} ta="center">
              Upload a document, choose an annotation schema, and start your first run.
              Results appear in the block viewer in real time.
            </Text>
            <Button
              size="lg"
              leftSection={<IconUpload size={18} />}
              onClick={() => navigate('/app/upload')}
            >
              Upload your first document
            </Button>
          </Stack>
        </Center>
      )}

      {!isEmpty && (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Recent Documents */}
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light"><IconFileText size={14} /></ThemeIcon>
                <Text fw={600} size="sm">Recent Documents</Text>
              </Group>
              <Anchor component={Link} to="/app/documents" size="xs">View all</Anchor>
            </Group>
            <Stack gap="xs">
              {docs.map((d) => (
                <Card key={d.source_uid} withBorder padding="xs" radius="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      component={Link}
                      to={`/app/documents/${d.source_uid}`}
                      size="sm"
                      fw={500}
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {d.doc_title}
                    </Anchor>
                    <Badge size="xs" variant="light" color={STATUS_COLOR[d.status] ?? 'gray'}>
                      {d.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>{d.source_type} &middot; {new Date(d.uploaded_at).toLocaleDateString()}</Text>
                </Card>
              ))}
            </Stack>
          </Paper>

          {/* Recent Runs */}
          <Paper p="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="violet"><IconPlayerPlay size={14} /></ThemeIcon>
                <Text fw={600} size="sm">Recent Runs</Text>
              </Group>
              <Anchor component={Link} to="/app/runs" size="xs">View all</Anchor>
            </Group>
            <Stack gap="xs">
              {runs.map((r) => (
                <Card key={r.run_id} withBorder padding="xs" radius="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor component={Link} to={`/app/runs/${r.run_id}`} size="sm" fw={500} ff="monospace">
                      {r.run_id.slice(0, 12)}...
                    </Anchor>
                    <Badge size="xs" variant="light" color={STATUS_COLOR[r.status] ?? 'gray'}>
                      {r.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>
                    {r.completed_blocks}/{r.total_blocks} blocks
                    {r.failed_blocks > 0 && <Text span c="red" size="xs"> ({r.failed_blocks} failed)</Text>}
                  </Text>
                </Card>
              ))}
              {runs.length === 0 && <Text size="sm" c="dimmed">No runs yet.</Text>}
            </Stack>
          </Paper>
        </SimpleGrid>
      )}
    </>
  );
}
