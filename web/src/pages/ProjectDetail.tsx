import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Text,
  Title,
  Group,
  Badge,
  Stack,
  Button,
  Anchor,
  Center,
  Loader,
  ThemeIcon,
  TextInput,
  Modal,
  Select,
  Checkbox,
  Table,
  Divider,
  Flex,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconFileText,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { edgeJson } from '@/lib/edge';
import type { ProjectRow, DocumentRow, RunRow, SchemaRow } from '@/lib/types';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { MultiDocumentUploader } from '@/components/documents/MultiDocumentUploader';

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

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [schemaSelectionBySourceUid, setSchemaSelectionBySourceUid] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editingField, setEditingField] = useState<'title' | 'description' | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteOpened, { open: openDeleteProject, close: closeDeleteProject }] = useDisclosure(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [selectedSourceUids, setSelectedSourceUids] = useState<string[]>([]);
  const [applyingSourceUid, setApplyingSourceUid] = useState<string | null>(null);

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
    setSelectedSourceUids((prev) => {
      if (prev.length === 0) return prev;
      const validIds = new Set(docs.map((doc) => doc.source_uid));
      const next = prev.filter((sourceUid) => validIds.has(sourceUid));
      return next.length === prev.length ? prev : next;
    });
  }, [docs]);

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

  const selectableDocs = useMemo(
    () => docs.filter((doc) => doc.status === 'ingested' && !!doc.conv_uid),
    [docs],
  );

  const selectedSourceUidSet = useMemo(
    () => new Set(selectedSourceUids),
    [selectedSourceUids],
  );

  const selectedSelectableCount = useMemo(
    () => selectableDocs.filter((doc) => selectedSourceUidSet.has(doc.source_uid)).length,
    [selectableDocs, selectedSourceUidSet],
  );

  const allSelectableChecked = selectableDocs.length > 0 && selectedSelectableCount === selectableDocs.length;
  const selectableIndeterminate = selectedSelectableCount > 0 && selectedSelectableCount < selectableDocs.length;

  const schemaOptions = useMemo(
    () => schemas.map((schema) => ({ value: schema.schema_id, label: schema.schema_ref })),
    [schemas],
  );

  const latestRunByConvAndSchema = useMemo(() => {
    const byConvAndSchema = new Map<string, RunRow>();
    for (const run of runs) {
      const key = `${run.conv_uid}::${run.schema_id}`;
      if (!byConvAndSchema.has(key)) byConvAndSchema.set(key, run);
    }
    return byConvAndSchema;
  }, [runs]);

  useEffect(() => {
    const validSchemaIds = new Set(schemas.map((schema) => schema.schema_id));
    const fallbackSchemaId = schemas[0]?.schema_id ?? null;
    setSchemaSelectionBySourceUid((prev) => {
      const next: Record<string, string | null> = {};
      for (const doc of docs) {
        const previous = prev[doc.source_uid];
        next[doc.source_uid] = previous && validSchemaIds.has(previous) ? previous : fallbackSchemaId;
      }
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && prevKeys.every((key) => prev[key] === next[key])) return prev;
      return next;
    });
  }, [docs, schemas]);

  const handleRunSchemaForDoc = async (doc: DocumentRow) => {
    const schemaId = schemaSelectionBySourceUid[doc.source_uid] ?? null;
    if (!schemaId) {
      notifications.show({ color: 'yellow', title: 'Select schema', message: 'Pick a schema for this document first.' });
      return;
    }
    if (!doc.conv_uid || doc.status !== 'ingested') {
      notifications.show({ color: 'yellow', title: 'Document not ready', message: 'Only ingested documents can run a schema.' });
      return;
    }
    const runKey = `${doc.conv_uid}::${schemaId}`;
    if (latestRunByConvAndSchema.has(runKey)) {
      notifications.show({ color: 'blue', title: 'Already exists', message: 'This document already has a run for the selected schema.' });
      return;
    }

    setApplyingSourceUid(doc.source_uid);
    try {
      await edgeJson<{ run_id: string; total_blocks: number }>('runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conv_uid: doc.conv_uid,
          schema_id: schemaId,
        }),
      });
      notifications.show({ color: 'green', title: 'Success', message: 'Run started.' });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApplyingSourceUid((current) => (current === doc.source_uid ? null : current));
    }
  };

  const persistProjectMetadata = async () => {
    if (!projectId) return false;
    const nextName = editName.trim();
    if (!nextName) {
      notifications.show({ color: 'yellow', title: 'Project name required', message: 'Title cannot be empty.' });
      return false;
    }
    setSaving(true);
    const { error: err } = await supabase
      .from(TABLES.projects)
      .update({ project_name: nextName, description: editDesc.trim() || null })
      .eq('project_id', projectId);
    if (err) {
      setError(err.message);
      setSaving(false);
      return false;
    }
    setProject((p) => p ? { ...p, project_name: nextName, description: editDesc.trim() || null } : p);
    setSaving(false);
    setEditingField(null);
    notifications.show({ color: 'green', title: 'Saved', message: 'Project updated' });
    return true;
  };

  const beginInlineEdit = (field: 'title' | 'description') => {
    if (!project || saving) return;
    setEditName(project.project_name);
    setEditDesc(project.description ?? '');
    setEditingField(field);
  };

  const cancelInlineEdit = () => {
    if (!project) return;
    setEditName(project.project_name);
    setEditDesc(project.description ?? '');
    setEditingField(null);
  };

  const onInlineEditKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      await persistProjectMetadata();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelInlineEdit();
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    setDeletingProject(true);
    try {
      const { error: err } = await supabase.rpc('delete_project', { p_project_id: projectId });
      if (err) throw new Error(err.message);
      notifications.show({ color: 'green', title: 'Deleted', message: 'Project and all contents removed' });
      navigate('/app/projects');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeletingProject(false);
      closeDeleteProject();
    }
  };

  const toggleDocSelection = (sourceUid: string, checked: boolean) => {
    setSelectedSourceUids((prev) => {
      if (checked) {
        if (prev.includes(sourceUid)) return prev;
        return [...prev, sourceUid];
      }
      return prev.filter((id) => id !== sourceUid);
    });
  };

  const toggleSelectAllSelectable = (checked: boolean) => {
    if (checked) {
      setSelectedSourceUids(selectableDocs.map((doc) => doc.source_uid));
      return;
    }
    setSelectedSourceUids([]);
  };

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  return (
    <>
      <Group justify="space-between" align="flex-start" mb="lg">
        <Box style={{ minWidth: 0, flex: 1 }}>
          {editingField === 'title' ? (
            <TextInput
              value={editName}
              onChange={(event) => setEditName(event.currentTarget.value)}
              onKeyDown={(event) => {
                void onInlineEditKeyDown(event);
              }}
              onBlur={() => cancelInlineEdit()}
              autoFocus
              disabled={saving}
              size="md"
            />
          ) : (
            <Title
              order={2}
              onDoubleClick={() => beginInlineEdit('title')}
              style={{ cursor: 'text' }}
            >
              {project.project_name}
            </Title>
          )}

          {editingField === 'description' ? (
            <TextInput
              value={editDesc}
              onChange={(event) => setEditDesc(event.currentTarget.value)}
              onKeyDown={(event) => {
                void onInlineEditKeyDown(event);
              }}
              onBlur={() => cancelInlineEdit()}
              autoFocus
              disabled={saving}
              size="sm"
              mt={4}
            />
          ) : (
            <Text
              size="sm"
              c="dimmed"
              mt={4}
              onDoubleClick={() => beginInlineEdit('description')}
              style={{ cursor: 'text' }}
            >
              {project.description ?? 'Double-click to add description'}
            </Text>
          )}
        </Box>

        <Button variant="subtle" color="red" size="xs" onClick={openDeleteProject}>
          Delete project
        </Button>
      </Group>

      {error && <ErrorAlert message={error} />}
      <Box style={{ marginInline: 'calc(var(--mantine-spacing-md) * -1)' }}>
        <Divider my="md" />
        <Flex direction={{ base: 'column', lg: 'row' }} gap={0} align="stretch">
          <Box w={{ base: '100%', lg: '32%' }} px="md">
            <MultiDocumentUploader
              projectId={project.project_id}
              title="Upload documents"
              subtitle={null}
              framed={false}
              dropzoneSquare
              onBatchUploaded={load}
            />
          </Box>
          <Divider orientation="vertical" visibleFrom="lg" style={{ alignSelf: 'stretch' }} />
          <Divider hiddenFrom="lg" my="sm" />
          <Box style={{ flex: 1, minWidth: 0 }} px="md">
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light"><IconFileText size={14} /></ThemeIcon>
                <Text fw={600} size="sm">Documents</Text>
              </Group>
            </Group>
            {docs.length === 0 ? (
              <Center py="lg">
                <Stack align="center" gap="xs">
                  <Text size="sm" c="dimmed">No documents yet.</Text>
                  <Text size="xs" c="dimmed">Use the uploader on the left to add files to this project.</Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="xs">
                <Table.ScrollContainer minWidth={1060}>
                  <Table striped highlightOnHover withTableBorder withColumnBorders style={{ width: '100%' }}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 44 }}>
                          <Checkbox
                            aria-label="Select all ingested"
                            checked={allSelectableChecked}
                            indeterminate={selectableIndeterminate}
                            onChange={(event) => toggleSelectAllSelectable(event.currentTarget.checked)}
                          />
                        </Table.Th>
                        <Table.Th>Document</Table.Th>
                        <Table.Th>Doc Status</Table.Th>
                        <Table.Th>Schema Status</Table.Th>
                        <Table.Th>Uploaded</Table.Th>
                        <Table.Th>User Schema</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {docs.map((d) => {
                        const selectable = d.status === 'ingested' && !!d.conv_uid;
                        const checked = selectedSourceUidSet.has(d.source_uid);
                        const selectedSchemaIdForDoc = schemaSelectionBySourceUid[d.source_uid] ?? null;
                        const run = d.conv_uid && selectedSchemaIdForDoc
                          ? (latestRunByConvAndSchema.get(`${d.conv_uid}::${selectedSchemaIdForDoc}`) ?? null)
                          : null;
                        const gridPath = run
                          ? `/app/projects/${projectId}/documents/${d.source_uid}?runId=${run.run_id}`
                          : `/app/projects/${projectId}/documents/${d.source_uid}`;
                        return (
                          <Table.Tr key={d.source_uid}>
                            <Table.Td>
                              <Checkbox
                                checked={checked}
                                disabled={!selectable}
                                onChange={(event) => toggleDocSelection(d.source_uid, event.currentTarget.checked)}
                                aria-label={`Select ${d.doc_title}`}
                              />
                            </Table.Td>
                            <Table.Td>
                              <Anchor
                                component={Link}
                                to={`/app/projects/${projectId}/documents/${d.source_uid}`}
                                size="sm"
                                fw={500}
                              >
                                {d.doc_title}
                              </Anchor>
                              <Text size="xs" c="dimmed">{d.source_type}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge size="xs" variant="light" color={STATUS_COLOR[d.status] ?? 'gray'}>
                                {d.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              {!selectedSchemaIdForDoc ? (
                                <Badge size="xs" variant="light" color="gray">Select schema</Badge>
                              ) : !selectable ? (
                                <Badge size="xs" variant="light" color="gray">Not ingest-ready</Badge>
                              ) : !run ? (
                                <Badge size="xs" variant="light" color="gray">Not started</Badge>
                              ) : (
                                <Group gap={6} wrap="nowrap">
                                  <Badge size="xs" variant="light" color={STATUS_COLOR[run.status] ?? 'gray'}>
                                    {run.status}
                                  </Badge>
                                  <Text size="xs" c="dimmed">{run.completed_blocks}/{run.total_blocks}</Text>
                                </Group>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="dimmed">{new Date(d.uploaded_at).toLocaleDateString()}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap={6} wrap="nowrap">
                                <Select
                                  size="xs"
                                  placeholder={schemas.length > 0 ? 'Select schema' : 'No schemas'}
                                  data={schemaOptions}
                                  value={selectedSchemaIdForDoc}
                                  onChange={(value) =>
                                    setSchemaSelectionBySourceUid((prev) => ({ ...prev, [d.source_uid]: value }))
                                  }
                                  searchable
                                  clearable
                                  w={210}
                                />
                                <Button
                                  size="compact-xs"
                                  variant="light"
                                  leftSection={<IconPlayerPlay size={12} />}
                                  onClick={() => handleRunSchemaForDoc(d)}
                                  loading={applyingSourceUid === d.source_uid}
                                  disabled={!selectable || !selectedSchemaIdForDoc}
                                >
                                  Run
                                </Button>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Button
                                size="compact-xs"
                                variant="default"
                                component={Link}
                                to={gridPath}
                              >
                                Enter Grid
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Stack>
            )}
          </Box>
        </Flex>
      </Box>

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

