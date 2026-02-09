import { useEffect, useState } from 'react';
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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconFileText,
  IconPlayerPlay,
  IconArrowLeft,
  IconPencil,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { ProjectRow, DocumentRow, RunRow } from '@/lib/types';
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

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!projectId) return;

    const [projRes, docRes] = await Promise.all([
      supabase.from(TABLES.projects).select('*').eq('project_id', projectId).maybeSingle(),
      supabase.from(TABLES.documents).select('*').eq('project_id', projectId).order('uploaded_at', { ascending: false }),
    ]);

    if (projRes.error) { setError(projRes.error.message); setLoading(false); return; }
    if (!projRes.data) { setError('Project not found'); setLoading(false); return; }

    const proj = projRes.data as ProjectRow;
    setProject(proj);
    setEditName(proj.project_name);
    setEditDesc(proj.description ?? '');

    const docRows = (docRes.data ?? []) as DocumentRow[];
    setDocs(docRows);

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
  };

  useEffect(() => { load(); }, [projectId]);

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

  if (loading) return <Center mt="xl"><Loader /></Center>;
  if (!project) return <ErrorAlert message={error ?? 'Project not found'} />;

  return (
    <>
      <Group mb="xs">
        <Anchor component={Link} to="/app" size="sm" c="dimmed">
          <Group gap={4}>
            <IconArrowLeft size={14} />
            Projects
          </Group>
        </Anchor>
      </Group>

      <PageHeader title={project.project_name} subtitle={project.description ?? undefined}>
        <Button variant="subtle" size="xs" leftSection={<IconPencil size={14} />} onClick={openEdit}>
          Edit
        </Button>
        <Button leftSection={<IconUpload size={16} />} onClick={() => navigate(`/app/projects/${projectId}/upload`)}>
          Upload document
        </Button>
      </PageHeader>

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
                    {r.completed_blocks}/{r.total_blocks} blocks
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
    </>
  );
}
