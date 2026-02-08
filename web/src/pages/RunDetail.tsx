import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, Group, Text, Badge, Button, SimpleGrid, Loader, Center } from '@mantine/core';
import { supabase } from '@/lib/supabase';
import { downloadFromEdge } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { RunRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

const STATUS_COLOR: Record<string, string> = {
  running: 'blue',
  complete: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [row, setRow] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!runId) return;
    setLoading(true);
    supabase
      .from(TABLES.runs)
      .select('run_id, conv_uid, schema_id, status, started_at, completed_at, total_blocks, completed_blocks, failed_blocks, owner_id, model_config')
      .eq('run_id', runId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (!data) setError('Run not found');
        else setRow(data as RunRow);
        setLoading(false);
      });
  };

  useEffect(load, [runId]);

  const exportJsonl = async () => {
    if (!runId) return;
    try {
      await downloadFromEdge(`export-jsonl?run_id=${encodeURIComponent(runId)}`, `export-${runId}.jsonl`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <PageHeader title="Run" subtitle={row?.run_id}>
        <Button variant="light" size="xs" onClick={load}>Refresh</Button>
      </PageHeader>
      {error && <ErrorAlert message={error} />}
      {row && (
        <>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Card withBorder padding="md">
              <Text size="xs" c="dimmed">Status</Text>
              <Badge mt={4} color={STATUS_COLOR[row.status] ?? 'gray'}>{row.status}</Badge>
            </Card>
            <Card withBorder padding="md">
              <Text size="xs" c="dimmed">Total blocks</Text>
              <Text fw={600} mt={4}>{row.total_blocks}</Text>
            </Card>
            <Card withBorder padding="md">
              <Text size="xs" c="dimmed">Completed</Text>
              <Text fw={600} mt={4}>{row.completed_blocks} <Text span c="dimmed" size="sm">(+{row.failed_blocks} failed)</Text></Text>
            </Card>
          </SimpleGrid>
          <Group mt="lg">
            <Button onClick={exportJsonl}>Export JSONL</Button>
          </Group>
        </>
      )}
    </>
  );
}
