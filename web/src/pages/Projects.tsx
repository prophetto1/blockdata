import { useEffect, useState } from 'react';
import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Button,
  Stack,
  TextInput,
  Textarea,
  Modal,
  Center,
  ThemeIcon,
  Loader,
  Badge,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { IconFolderPlus, IconFolder, IconFileText, IconClock } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { ProjectRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type ProjectWithCounts = ProjectRow & { doc_count: number };

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const loadProjects = async () => {
    const { data, error: err } = await supabase
      .from(TABLES.projects)
      .select('project_id, owner_id, project_name, description, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (err) { setError(err.message); setLoading(false); return; }
    const rows = (data ?? []) as ProjectRow[];

    // Get doc counts per project
    const { data: docs } = await supabase
      .from(TABLES.documents)
      .select('project_id');

    const counts: Record<string, number> = {};
    for (const d of docs ?? []) {
      const pid = (d as { project_id: string | null }).project_id;
      if (pid) counts[pid] = (counts[pid] || 0) + 1;
    }

    setProjects(rows.map((p) => ({ ...p, doc_count: counts[p.project_id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { loadProjects(); }, []);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Project name is required.'); return; }
    setCreating(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setCreating(false); return; }

    const { data, error: err } = await supabase
      .from(TABLES.projects)
      .insert({ owner_id: user.id, project_name: name.trim(), description: desc.trim() || null })
      .select()
      .single();

    if (err) { setError(err.message); setCreating(false); return; }
    notifications.show({ color: 'green', title: 'Project created', message: name.trim() });
    setName('');
    setDesc('');
    close();
    setCreating(false);
    navigate(`/app/projects/${(data as ProjectRow).project_id}`);
  };

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <PageHeader title="Projects" subtitle="Organize your documents and annotation runs.">
        <Button leftSection={<IconFolderPlus size={16} />} onClick={open}>
          New project
        </Button>
      </PageHeader>

      {error && <ErrorAlert message={error} />}

      {projects.length === 0 && (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={80} radius="xl" variant="light">
              <IconFolder size={40} />
            </ThemeIcon>
            <Text size="lg" fw={600}>No projects yet</Text>
            <Text size="sm" c="dimmed" maw={400} ta="center">
              Create a project to start uploading documents and running annotations.
            </Text>
            <Button size="lg" leftSection={<IconFolderPlus size={18} />} onClick={open}>
              Create your first project
            </Button>
          </Stack>
        </Center>
      )}

      {projects.length > 0 && (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {projects.map((p) => (
            <Card
              key={p.project_id}
              withBorder
              padding="lg"
              radius="md"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/app/projects/${p.project_id}`)}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={600} lineClamp={1}>{p.project_name}</Text>
                <Badge size="sm" variant="light">
                  <Group gap={4}>
                    <IconFileText size={12} />
                    {p.doc_count}
                  </Group>
                </Badge>
              </Group>
              {p.description && (
                <Text size="sm" c="dimmed" lineClamp={2} mb="xs">
                  {p.description}
                </Text>
              )}
              <Group gap={4} mt="auto">
                <IconClock size={12} color="var(--mantine-color-dimmed)" />
                <Text size="xs" c="dimmed">
                  {new Date(p.updated_at).toLocaleDateString()}
                </Text>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      <Modal opened={opened} onClose={close} title="New Project" centered>
        <Stack gap="md">
          <TextInput
            label="Project name"
            placeholder="e.g., SCOTUS Analysis"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            data-autofocus
          />
          <Textarea
            label="Description (optional)"
            placeholder="Brief description of this project"
            value={desc}
            onChange={(e) => setDesc(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} disabled={!name.trim()}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
