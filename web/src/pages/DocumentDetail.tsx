import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Loader, Center, Text, Group, Progress, Stack, Skeleton, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconDownload, IconTrash } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { downloadFromEdge } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { BlockViewerGrid } from '@/components/blocks/BlockViewerGrid';
import { RunSelector } from '@/components/blocks/RunSelector';
import { useRuns } from '@/hooks/useRuns';

const STATUS_COLOR: Record<string, string> = {
  ingested: 'green',
  converting: 'yellow',
  uploaded: 'blue',
  conversion_failed: 'red',
  ingest_failed: 'red',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentDetail() {
  const { sourceUid, projectId } = useParams<{ sourceUid: string; projectId: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!sourceUid) return;
    supabase
      .from(TABLES.documents)
      .select('*')
      .eq('source_uid', sourceUid)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) { setError(err.message); setLoading(false); return; }
        if (!data) { setError('Document not found'); setLoading(false); return; }
        const d = data as DocumentRow;
        // Route-entity validation: doc's project_id must match route projectId
        if (projectId && d.project_id !== projectId) {
          navigate(`/app/projects/${d.project_id}/documents/${sourceUid}`, { replace: true });
          return;
        }
        setDoc(d);
        setLoading(false);
      });
  }, [sourceUid, projectId, navigate]);

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
    if (!doc?.conv_uid) return;
    try {
      await downloadFromEdge(
        `export-jsonl?conv_uid=${encodeURIComponent(doc.conv_uid)}`,
        `export-${doc.conv_uid.slice(0, 12)}.jsonl`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async () => {
    if (!sourceUid) return;
    setDeleting(true);
    try {
      const { error: err } = await supabase.rpc('delete_document', { p_source_uid: sourceUid });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'green', title: 'Deleted', message: 'Document and all related data removed' });
      navigate(`/app/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
      closeDelete();
    }
  };

  // Runs — hook must be called before any early returns
  const { runs, error: runsError } = useRuns(doc?.conv_uid ?? null);

  if (loading) {
    return (
      <Stack gap="md">
        <Skeleton height={40} width={300} />
        <Skeleton height={20} width={200} />
        <Skeleton height={400} />
      </Stack>
    );
  }

  if (!doc) return <ErrorAlert message={error ?? 'Document not found'} />;

  const selectedRun = runs.find((r) => r.run_id === selectedRunId) ?? null;
  const runProgress = selectedRun && selectedRun.total_blocks > 0
    ? {
        completed: selectedRun.completed_blocks,
        failed: selectedRun.failed_blocks,
        total: selectedRun.total_blocks,
        pctComplete: (selectedRun.completed_blocks / selectedRun.total_blocks) * 100,
        pctFailed: (selectedRun.failed_blocks / selectedRun.total_blocks) * 100,
      }
    : null;

  return (
    <>
      <AppBreadcrumbs items={[
        { label: 'Projects', href: '/app' },
        { label: projectName || 'Project', href: `/app/projects/${projectId}` },
        { label: doc.doc_title },
      ]} />
      {/* Compact document header: title + metadata + actions in one row */}
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text fw={600} size="md" truncate style={{ maxWidth: 300 }}>{doc.doc_title}</Text>
          <Badge size="sm" color={STATUS_COLOR[doc.status] ?? 'gray'} variant="light">{doc.status}</Badge>
          <Text size="xs" c="dimmed">{doc.source_type}</Text>
          <Text size="xs" c="dimmed">{formatBytes(doc.source_filesize)}</Text>
          {doc.source_total_characters && (
            <Text size="xs" c="dimmed">{doc.source_total_characters.toLocaleString()} chars</Text>
          )}
        </Group>
        <Group gap="xs" wrap="nowrap">
          {doc.conv_uid && (
            <Button variant="light" size="xs" onClick={exportJsonl} leftSection={<IconDownload size={14} />}>
              Export
            </Button>
          )}
          <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={openDelete}>
            Delete
          </Button>
        </Group>
      </Group>

      {/* Run selector row — separate from grid toolbar */}
      {doc.status === 'ingested' && doc.conv_uid && (
        <Group gap="sm" mb="xs" wrap="nowrap">
          <RunSelector runs={runs} value={selectedRunId} onChange={setSelectedRunId} />
          {selectedRun && (
            <Badge size="xs" variant="light" color={selectedRun.status === 'complete' ? 'green' : selectedRun.status === 'running' ? 'blue' : 'red'}>
              {selectedRun.status}
            </Badge>
          )}
          {runProgress && (
            <Group gap={4} wrap="nowrap">
              <Progress.Root size="xs" w={80}>
                <Progress.Section value={runProgress.pctComplete} color="green" />
                <Progress.Section value={runProgress.pctFailed} color="red" />
              </Progress.Root>
              <Text size="xs" c="dimmed">
                {runProgress.completed}/{runProgress.total}
              </Text>
            </Group>
          )}
          {runsError && <Text size="xs" c="red">{runsError}</Text>}
        </Group>
      )}

      {error && <ErrorAlert message={error} />}

      {doc.status === 'converting' && (
        <Alert color="yellow" icon={<IconInfoCircle size={18} />} mb="md">
          Conversion in progress. Refresh in a moment.
        </Alert>
      )}

      {(doc.status === 'conversion_failed' || doc.status === 'ingest_failed') && (
        <Alert color="red" icon={<IconInfoCircle size={18} />} mb="md">
          {doc.error || 'Processing failed.'}
        </Alert>
      )}

      {doc.status === 'uploaded' && (
        <Center py="xl">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text c="dimmed" size="sm">Document uploaded, awaiting processing...</Text>
          </Stack>
        </Center>
      )}

      {doc.status === 'ingested' && doc.conv_uid && (
        <BlockViewerGrid convUid={doc.conv_uid} selectedRunId={selectedRunId} selectedRun={selectedRun} />
      )}

      <Modal opened={deleteOpened} onClose={closeDelete} title="Delete document" centered>
        <Stack gap="md">
          <Text size="sm">
            This will permanently delete <Text span fw={600}>{doc.doc_title}</Text> and all its blocks, overlays, and runs. This cannot be undone.
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
