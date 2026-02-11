import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Group, Text, Badge, Button, SimpleGrid, Loader, Center, Modal, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconPlayerStop } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { downloadFromEdge } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { RunRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';

const STATUS_COLOR: Record<string, string> = {
  running: 'blue',
  complete: 'green',
  failed: 'red',
  cancelled: 'gray',
};

export default function RunDetail() {
  const { runId, projectId } = useParams<{ runId: string; projectId: string }>();
  const navigate = useNavigate();
  const [row, setRow] = useState<RunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    if (!runId) return;
    setLoading(true);
    supabase
      .from(TABLES.runs)
      .select('run_id, conv_uid, schema_id, status, started_at, completed_at, total_blocks, completed_blocks, failed_blocks, owner_id, model_config')
      .eq('run_id', runId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        if (!data) { setError('Run not found'); setLoading(false); return; }
        const r = data as RunRow;
        // Route-entity validation: look up project via conv_uid, redirect if mismatch
        if (projectId && r.conv_uid) {
          supabase
            .from(TABLES.documents)
            .select('project_id')
            .eq('conv_uid', r.conv_uid)
            .maybeSingle()
            .then(({ data: docData }) => {
              if (docData && (docData as { project_id: string }).project_id !== projectId) {
                navigate(`/app/projects/${(docData as { project_id: string }).project_id}/runs/${runId}`, { replace: true });
                return;
              }
              setRow(r);
              setLoading(false);
            });
        } else {
          setRow(r);
          setLoading(false);
        }
      });
  };

  useEffect(load, [runId, projectId, navigate]);

  // Fetch project name for breadcrumbs
  useEffect(() => {
    if (!projectId) return;
    supabase
      .from(TABLES.projects)
      .select('project_name')
      .eq('project_id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProjectName((data as { project_name: string }).project_name);
      });
  }, [projectId]);

  const exportJsonl = async () => {
    if (!runId) return;
    try {
      await downloadFromEdge(`export-jsonl?run_id=${encodeURIComponent(runId)}`, `export-${runId}.jsonl`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleCancel = async () => {
    if (!runId) return;
    setCancelling(true);
    try {
      const { error: err } = await supabase.rpc('cancel_run', { p_run_id: runId });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'yellow', title: 'Cancelled', message: 'Run has been cancelled' });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!runId) return;
    setDeleting(true);
    try {
      const { error: err } = await supabase.rpc('delete_run', { p_run_id: runId });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'green', title: 'Deleted', message: 'Run and all overlays removed' });
      navigate(`/app/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
      closeDelete();
    }
  };

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <AppBreadcrumbs items={[
        { label: 'Projects', href: '/app/projects' },
        { label: projectName || 'Project', href: `/app/projects/${projectId}` },
        { label: `Run ${row?.run_id?.slice(0, 8) ?? ''}...` },
      ]} />
      <PageHeader title="Run" subtitle={row?.run_id}>
        <Button variant="light" size="xs" onClick={load}>Refresh</Button>
        {row?.status === 'running' && (
          <Button variant="light" color="yellow" size="xs" leftSection={<IconPlayerStop size={14} />} onClick={handleCancel} loading={cancelling}>
            Cancel
          </Button>
        )}
        <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={openDelete}>
          Delete
        </Button>
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

      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete run" centered>
        <Stack gap="md">
          <Text size="sm">
            This will permanently delete this run and all its block overlays. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDelete}>Cancel</Button>
            <Button color="red" onClick={handleDelete} loading={deleting}>Delete</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
