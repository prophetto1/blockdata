import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Button,
  Paper,
  Anchor,
  Center,
  Loader,
  ThemeIcon,
  SimpleGrid,
  TextInput,
  Textarea,
  Modal,
  Select,
  Progress,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import JSZip from 'jszip';
import {
  IconUpload,
  IconFileText,
  IconPlayerPlay,
  IconPencil,
  IconTrash,
  IconBolt,
  IconCheck,
  IconDownload,
} from '@tabler/icons-react';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { edgeFetch, edgeJson } from '@/lib/edge';
import type { ProjectRow, DocumentRow, RunRow, SchemaRow } from '@/lib/types';
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

const sortDocumentsByUploadedAt = (rows: DocumentRow[]) =>
  [...rows].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}

function sanitizeFilename(value: string): string {
  const withoutSpecials = value
    .trim()
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_');
  const withoutControls = withoutSpecials
    .split('')
    .map((char) => (char.charCodeAt(0) < 32 ? '_' : char))
    .join('');
  return withoutControls.slice(0, 80) || 'document';
}

type ProjectOverlaySummary = {
  documents: number;
  totalBlocks: number;
  confirmed: number;
  staged: number;
  pending: number;
  failed: number;
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProjectOverlaySummary>({
    documents: 0,
    totalBlocks: 0,
    confirmed: 0,
    staged: 0,
    pending: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteOpened, { open: openDeleteProject, close: closeDeleteProject }] = useDisclosure(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [applyingSchema, setApplyingSchema] = useState(false);
  const [runningAllPending, setRunningAllPending] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;

    const [projRes, docRes, schemaRes] = await Promise.all([
      supabase.from(TABLES.projects).select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from(TABLES.documents).select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
      supabase.from(TABLES.schemas).select('*').order('created_at', { ascending: false }),
    ]);

    if (projRes.error) { setError(projRes.error.message); setLoading(false); return; }
    if (docRes.error) { setError(docRes.error.message); setLoading(false); return; }
    if (schemaRes.error) { setError(schemaRes.error.message); setLoading(false); return; }
    if (!projRes.data) { setError('Project not found'); setLoading(false); return; }

    const proj = projRes.data as ProjectRow;
    setProject(proj);
    setEditName(proj.project_name);
    setEditDesc(proj.description ?? '');

    const docRows = (docRes.data ?? []) as DocumentRow[];
    setDocs(sortDocumentsByUploadedAt(docRows));

    const schemaRows = (schemaRes.data ?? []) as SchemaRow[];
    setSchemas(schemaRows);
    setSelectedSchemaId((prev) => {
      if (prev && schemaRows.some((schema) => schema.schema_id === prev)) return prev;
      return schemaRows[0]?.schema_id ?? null;
    });

    // Fetch runs for all documents in this project
    const convUids = docRows.filter((d) => d.conv_uid).map((d) => d.conv_uid!);
    if (convUids.length > 0) {
      const { data: runData } = await supabase
        .from(TABLES.runs)
        .select('*')
        .in('conv_uid', convUids)
        .order('started_at', { ascending: false });
      setRuns((runData ?? []) as RunRow[]);
    } else {
      setRuns([]);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel(`project-documents-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLES.documents,
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as DocumentRow;
            setDocs((prev) => prev.filter((doc) => doc.source_uid !== oldRow.source_uid));
            return;
          }

          const newRow = payload.new as DocumentRow;
          if (!newRow?.source_uid) return;

          setDocs((prev) => {
            const existing = prev.filter((doc) => doc.source_uid !== newRow.source_uid);
            return sortDocumentsByUploadedAt([...existing, newRow]);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const selectedSchema = useMemo(
    () => (selectedSchemaId
      ? schemas.find((schema) => schema.schema_id === selectedSchemaId) ?? null
      : null),
    [schemas, selectedSchemaId],
  );

  const runsInScope = useMemo(
    () => (selectedSchemaId ? runs.filter((run) => run.schema_id === selectedSchemaId) : runs),
    [runs, selectedSchemaId],
  );

  const runIdsInScope = useMemo(
    () => runsInScope.map((run) => run.run_id),
    [runsInScope],
  );

  const schemaRefById = new Map(schemas.map((schema) => [schema.schema_id, schema.schema_ref]));

  useEffect(() => {
    const documentsInScope = selectedSchemaId
      ? new Set(runsInScope.map((run) => run.conv_uid)).size
      : docs.length;

    if (runIdsInScope.length === 0) {
      setSummary({
        documents: documentsInScope,
        totalBlocks: 0,
        confirmed: 0,
        staged: 0,
        pending: 0,
        failed: 0,
      });
      return;
    }

    let cancelled = false;
    supabase
      .from(TABLES.overlays)
      .select('status, run_id')
      .in('run_id', runIdsInScope)
      .then(({ data, error: overlayError }) => {
        if (cancelled || overlayError) return;
        let confirmed = 0;
        let staged = 0;
        let pending = 0;
        let failed = 0;

        for (const row of data ?? []) {
          const status = (row as { status: string }).status;
          if (status === 'confirmed') confirmed += 1;
          else if (status === 'ai_complete') staged += 1;
          else if (status === 'pending' || status === 'claimed') pending += 1;
          else if (status === 'failed') failed += 1;
        }

        setSummary({
          documents: documentsInScope,
          totalBlocks: (data ?? []).length,
          confirmed,
          staged,
          pending,
          failed,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [docs.length, runIdsInScope, runsInScope, selectedSchemaId]);

  const handleApplySchemaToAll = async () => {
    if (!selectedSchemaId) {
      notifications.show({ color: 'yellow', title: 'Select schema', message: 'Choose a schema first.' });
      return;
    }

    const ingestedDocs = docs.filter((doc) => doc.status === 'ingested' && !!doc.conv_uid);
    const alreadyBound = new Set(
      runs
        .filter((run) => run.schema_id === selectedSchemaId)
        .map((run) => run.conv_uid),
    );
    const targets = ingestedDocs.filter((doc) => doc.conv_uid && !alreadyBound.has(doc.conv_uid));

    if (targets.length === 0) {
      notifications.show({
        color: 'blue',
        title: 'No new runs needed',
        message: 'All ingested documents already have a run for this schema.',
      });
      return;
    }

    setApplyingSchema(true);
    let created = 0;
    let failed = 0;

    try {
      await mapWithConcurrency(targets, 5, async (doc) => {
        try {
          await edgeJson<{ run_id: string; total_blocks: number }>('runs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conv_uid: doc.conv_uid,
              schema_id: selectedSchemaId,
            }),
          });
          created += 1;
        } catch {
          failed += 1;
        }
      });

      notifications.show({
        color: failed === 0 ? 'green' : 'yellow',
        title: 'Schema applied across project',
        message: `${created} run(s) created, ${failed} failed.`,
      });
      await load();
    } finally {
      setApplyingSchema(false);
    }
  };

  const handleRunAllPending = async () => {
    if (!selectedSchemaId) {
      notifications.show({ color: 'yellow', title: 'Select schema', message: 'Choose a schema first.' });
      return;
    }

    const candidateRunIds = runs
      .filter((run) => run.schema_id === selectedSchemaId && run.status !== 'cancelled')
      .map((run) => run.run_id);

    if (candidateRunIds.length === 0) {
      notifications.show({ color: 'blue', title: 'No runs found', message: 'No runs exist for this schema in this project.' });
      return;
    }

    setRunningAllPending(true);
    let totalClaimed = 0;
    let failedDispatches = 0;
    let rounds = 0;

    try {
      let activeRunIds = [...candidateRunIds];

      while (activeRunIds.length > 0 && rounds < 10) {
        rounds += 1;
        const results = await mapWithConcurrency(activeRunIds, 5, async (runId) => {
          try {
            const result = await edgeJson<{
              run_id: string;
              claimed: number;
              remaining_pending: number;
            }>('worker', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                run_id: runId,
                batch_size: 100,
              }),
            });
            return { ...result, ok: true };
          } catch {
            return { run_id: runId, claimed: 0, remaining_pending: 0, ok: false };
          }
        });

        totalClaimed += results.reduce((sum, result) => sum + (result.claimed ?? 0), 0);
        failedDispatches += results.filter((result) => !result.ok).length;
        activeRunIds = results
          .filter((result) => (result.remaining_pending ?? 0) > 0)
          .map((result) => result.run_id);
      }

      notifications.show({
        color: failedDispatches === 0 ? 'green' : 'yellow',
        title: 'Run All Pending dispatched',
        message: `${totalClaimed} block claim(s) dispatched across ${rounds} round(s). ${failedDispatches} run dispatch failures.`,
      });
      await load();
    } finally {
      setRunningAllPending(false);
    }
  };

  const handleConfirmAll = async () => {
    if (!selectedSchemaId) {
      notifications.show({ color: 'yellow', title: 'Select schema', message: 'Choose a schema first.' });
      return;
    }

    const runIds = runs.filter((run) => run.schema_id === selectedSchemaId).map((run) => run.run_id);
    if (runIds.length === 0) {
      notifications.show({ color: 'blue', title: 'No runs found', message: 'No runs to confirm for this schema.' });
      return;
    }

    setConfirmingAll(true);
    let confirmedCount = 0;
    let failedRuns = 0;

    try {
      const { data: stagedRows, error: stagedError } = await supabase
        .from(TABLES.overlays)
        .select('run_id')
        .in('run_id', runIds)
        .eq('status', 'ai_complete');

      if (stagedError) throw new Error(stagedError.message);
      const runIdsWithStaged = Array.from(
        new Set((stagedRows ?? []).map((row) => (row as { run_id: string }).run_id)),
      );

      if (runIdsWithStaged.length === 0) {
        notifications.show({ color: 'blue', title: 'Nothing to confirm', message: 'No staged overlays found.' });
        return;
      }

      await mapWithConcurrency(runIdsWithStaged, 5, async (runId) => {
        const { data, error: rpcError } = await supabase.rpc('confirm_overlays', {
          p_run_id: runId,
          p_block_uids: null,
        });
        if (rpcError) {
          failedRuns += 1;
          return;
        }
        confirmedCount += Number(data ?? 0);
      });

      notifications.show({
        color: failedRuns === 0 ? 'green' : 'yellow',
        title: 'Bulk confirmation complete',
        message: `${confirmedCount} overlay(s) confirmed. ${failedRuns} run(s) failed.`,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConfirmingAll(false);
    }
  };

  const handleExportAllZip = async () => {
    if (!selectedSchemaId) {
      notifications.show({ color: 'yellow', title: 'Select schema', message: 'Choose a schema first.' });
      return;
    }

    const runsForSchema = runs.filter((run) => run.schema_id === selectedSchemaId);
    if (runsForSchema.length === 0) {
      notifications.show({ color: 'blue', title: 'No runs found', message: 'No runs to export for this schema.' });
      return;
    }

    // Keep newest run per document (runs are sorted descending by started_at in load()).
    const latestRunByConvUid = new Map<string, RunRow>();
    for (const run of runsForSchema) {
      if (!latestRunByConvUid.has(run.conv_uid)) {
        latestRunByConvUid.set(run.conv_uid, run);
      }
    }
    const exportRuns = Array.from(latestRunByConvUid.values());

    setExportingAll(true);
    try {
      const docsByConvUid = new Map(
        docs
          .filter((doc) => !!doc.conv_uid)
          .map((doc) => [doc.conv_uid as string, doc]),
      );

      const exportedFiles = await mapWithConcurrency(exportRuns, 3, async (run) => {
        const resp = await edgeFetch(`export-jsonl?run_id=${encodeURIComponent(run.run_id)}`, {
          method: 'GET',
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`Export failed for run ${run.run_id.slice(0, 8)}: HTTP ${resp.status} ${text.slice(0, 200)}`);
        }
        const jsonl = await resp.text();
        const doc = docsByConvUid.get(run.conv_uid);
        const titleBase = doc?.doc_title ?? doc?.source_uid ?? run.conv_uid;
        const safeTitle = sanitizeFilename(titleBase);
        const runSuffix = run.run_id.slice(0, 8);
        return {
          filename: `${safeTitle}-${runSuffix}.jsonl`,
          content: jsonl.endsWith('\n') ? jsonl : `${jsonl}\n`,
        };
      });

      const zip = new JSZip();
      for (const file of exportedFiles) {
        zip.file(file.filename, file.content);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      const schemaLabel = selectedSchema?.schema_ref ?? selectedSchemaId;
      link.href = blobUrl;
      link.download = `project-${projectId}-${sanitizeFilename(schemaLabel)}-exports.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      notifications.show({
        color: 'green',
        title: 'Export complete',
        message: `ZIP exported with ${exportRuns.length} per-document JSONL file(s).`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExportingAll(false);
    }
  };

  const handleSave = async () => {
    if (!projectId || !editName.trim()) return;
    setSaving(true);
    const { error: err } = await supabase
      .from(TABLES.projects)
      .update({ project_name: editName.trim(), description: editDesc.trim() || null })
      .eq('project_id', projectId);
    if (err) { setError(err.message); setSaving(false); return; }
    setProject((p) => p ? { ...p, project_name: editName.trim(), description: editDesc.trim() || null } : p);
    notifications.show({ color: 'green', title: 'Saved', message: 'Project updated' });
    setSaving(false);
    closeEdit();
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeletingProject(true);
    try {
      const { error: err } = await supabase.rpc('delete_project', { p_project_id: projectId });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'green', title: 'Deleted', message: 'Project and all contents removed' });
      navigate('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeletingProject(false);
      closeDeleteProject();
    }
  };

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  return (
    <>
      <AppBreadcrumbs items={[
        { label: 'Projects', href: '/app' },
        { label: project.project_name },
      ]} />

      <PageHeader title={project.project_name} subtitle={project.description ?? undefined}>
        <Button variant="subtle" size="xs" leftSection={<IconPencil size={14} />} onClick={openEdit}>
          Edit
        </Button>
        <Button leftSection={<IconUpload size={16} />} onClick={() => navigate(`/app/projects/${projectId}/upload`)}>
          Upload document
        </Button>
        <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={openDeleteProject}>
          Delete project
        </Button>
      </PageHeader>

      <Paper p="sm" withBorder mb="md">
        <Stack gap="xs">
          <Group justify="space-between" wrap="wrap">
            <Group gap="xs" wrap="wrap">
              <Select
                label="Schema scope"
                placeholder={schemas.length > 0 ? 'Select schema' : 'No schemas yet'}
                data={schemas.map((schema) => ({
                  value: schema.schema_id,
                  label: schema.schema_ref,
                }))}
                value={selectedSchemaId}
                onChange={setSelectedSchemaId}
                searchable
                clearable
                w={280}
              />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCheck size={14} />}
                onClick={handleApplySchemaToAll}
                loading={applyingSchema}
                disabled={!selectedSchemaId || docs.length === 0}
              >
                Apply Schema to All
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconBolt size={14} />}
                onClick={handleRunAllPending}
                loading={runningAllPending}
                disabled={!selectedSchemaId || runsInScope.length === 0}
              >
                Run All Pending
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconCheck size={14} />}
                onClick={handleConfirmAll}
                loading={confirmingAll}
                disabled={!selectedSchemaId || runsInScope.length === 0}
              >
                Confirm All
              </Button>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={14} />}
                onClick={handleExportAllZip}
                loading={exportingAll}
                disabled={!selectedSchemaId || runsInScope.length === 0}
              >
                Export All (ZIP)
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              {selectedSchema ? `Active schema: ${selectedSchema.schema_ref}` : 'Select a schema to use bulk actions'}
            </Text>
          </Group>

          <Group justify="space-between" wrap="wrap">
            <Text size="xs" c="dimmed">
              {summary.documents} document(s) • {summary.totalBlocks} block overlay(s)
            </Text>
            <Group gap={6}>
              <Badge size="xs" color="green" variant="light">{summary.confirmed} confirmed</Badge>
              <Badge size="xs" color="yellow" variant="light">{summary.staged} staged</Badge>
              <Badge size="xs" color="blue" variant="light">{summary.pending} pending</Badge>
              <Badge size="xs" color="red" variant="light">{summary.failed} failed</Badge>
            </Group>
          </Group>

          {summary.totalBlocks > 0 && (
            <Progress.Root size="sm">
              <Progress.Section value={(summary.confirmed / summary.totalBlocks) * 100} color="green" />
              <Progress.Section value={(summary.staged / summary.totalBlocks) * 100} color="yellow" />
              <Progress.Section value={(summary.pending / summary.totalBlocks) * 100} color="blue" />
              <Progress.Section value={(summary.failed / summary.totalBlocks) * 100} color="red" />
            </Progress.Root>
          )}
        </Stack>
      </Paper>

      {error && <ErrorAlert message={error} />}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* Documents */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light"><IconFileText size={14} /></ThemeIcon>
              <Text fw={600} size="sm">Documents ({docs.length})</Text>
            </Group>
          </Group>
          {docs.length === 0 ? (
            <Center py="lg">
              <Stack align="center" gap="xs">
                <Text size="sm" c="dimmed">No documents yet.</Text>
                <Button size="xs" variant="light" leftSection={<IconUpload size={14} />}
                  onClick={() => navigate(`/app/projects/${projectId}/upload`)}>
                  Upload first document
                </Button>
              </Stack>
            </Center>
          ) : (
            <Stack gap="xs">
              {docs.map((d) => (
                <Card key={d.source_uid} withBorder padding="xs" radius="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor
                      component={Link}
                      to={`/app/projects/${projectId}/documents/${d.source_uid}`}
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
                  <Text size="xs" c="dimmed" mt={2}>
                    {d.source_type} &middot; {new Date(d.uploaded_at).toLocaleDateString()}
                  </Text>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Runs */}
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="violet"><IconPlayerPlay size={14} /></ThemeIcon>
              <Text fw={600} size="sm">Runs ({runs.length})</Text>
            </Group>
          </Group>
          {runs.length === 0 ? (
            <Center py="lg">
              <Text size="sm" c="dimmed">No runs yet. Upload a document and start an annotation run.</Text>
            </Center>
          ) : (
            <Stack gap="xs">
              {runs.map((r) => (
                <Card key={r.run_id} withBorder padding="xs" radius="sm">
                  <Group justify="space-between" wrap="nowrap">
                    <Anchor component={Link} to={`/app/projects/${projectId}/runs/${r.run_id}`} size="sm" fw={500} ff="monospace">
                      {r.run_id.slice(0, 12)}...
                    </Anchor>
                    <Badge size="xs" variant="light" color={STATUS_COLOR[r.status] ?? 'gray'}>
                      {r.status}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed" mt={2}>
                    {(schemaRefById.get(r.schema_id) ?? 'unknown schema')} • {r.completed_blocks}/{r.total_blocks} blocks
                    {r.failed_blocks > 0 && <Text span c="red" size="xs"> ({r.failed_blocks} failed)</Text>}
                  </Text>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </SimpleGrid>

      <Modal opened={editOpened} onClose={closeEdit} title="Edit Project" centered>
        <Stack gap="md">
          <TextInput label="Project name" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} />
          <Textarea label="Description (optional)" value={editDesc} onChange={(e) => setEditDesc(e.currentTarget.value)} minRows={2} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeEdit}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} disabled={!editName.trim()}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={closeDeleteProject} title="Delete project" centered>
        <Stack gap="md">
          <Text size="sm">
            This will permanently delete <Text span fw={600}>{project.project_name}</Text> and all its documents, blocks, runs, and overlays. This cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeDeleteProject}>Cancel</Button>
            <Button color="red" onClick={handleDeleteProject} loading={deletingProject}>Delete project</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
