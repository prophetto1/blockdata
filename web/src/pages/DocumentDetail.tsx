import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Alert, Badge, Button, Loader, Center, Text, Group, Stack, Skeleton, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { downloadFromEdge } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { DocumentRow } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { BlockViewerGrid } from '@/components/blocks/BlockViewerGrid';
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
  const location = useLocation();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleting, setDeleting] = useState(false);
  const requestedRunId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('runId');
    return value?.trim() ? value.trim() : null;
  }, [location.search]);

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
  const { runs } = useRuns(doc?.conv_uid ?? null);

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedRunId(null);
      return;
    }
    setSelectedRunId((prev) => {
      if (requestedRunId && runs.some((run) => run.run_id === requestedRunId)) return requestedRunId;
      if (prev && runs.some((run) => run.run_id === prev)) return prev;
      return runs[0].run_id;
    });
  }, [requestedRunId, runs]);

  useShellHeaderTitle({
    title: doc?.doc_title ?? 'Document',
    subtitle: doc
      ? `${doc.source_type} · ${formatBytes(doc.source_filesize)}${
          doc.source_total_characters ? ` · ${doc.source_total_characters.toLocaleString()} chars` : ''
        }`
      : undefined,
  });

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
  return (
    <>
      <Group gap="xs" wrap="nowrap" mb="sm">
        <Badge size="sm" color={STATUS_COLOR[doc.status] ?? 'gray'} variant="light">{doc.status}</Badge>
        <Text size="xs" c="dimmed">
          {doc.source_type} · {formatBytes(doc.source_filesize)}
          {doc.source_total_characters ? ` · ${doc.source_total_characters.toLocaleString()} chars` : ''}
        </Text>
      </Group>

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
        <BlockViewerGrid
          convUid={doc.conv_uid}
          selectedRunId={selectedRunId}
          selectedRun={selectedRun}
          onExport={exportJsonl}
          onDelete={openDelete}
        />
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
