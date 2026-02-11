import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  IconArrowRight,
  IconFileText,
  IconFolder,
  IconFolderPlus,
  IconSchema,
  IconUpload,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { DocumentRow, ProjectRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type ProjectWithCount = ProjectRow & { doc_count: number };
type RecentDocument = Pick<DocumentRow, 'source_uid' | 'project_id' | 'doc_title' | 'status' | 'uploaded_at'>;

const DOC_STATUS_COLOR: Record<DocumentRow['status'], string> = {
  uploaded: 'gray',
  converting: 'yellow',
  ingested: 'green',
  conversion_failed: 'red',
  ingest_failed: 'red',
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function WorkspaceHome() {
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [documents, setDocuments] = useState<Array<Pick<DocumentRow, 'project_id' | 'status'>>>([]);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const [
        { data: projectRows, error: projectsErr },
        { data: docRows, error: docsErr },
        { data: recentDocRows, error: recentDocsErr },
      ] = await Promise.all([
        supabase
          .from(TABLES.projects)
          .select('project_id, owner_id, project_name, description, created_at, updated_at')
          .order('updated_at', { ascending: false }),
        supabase
          .from(TABLES.documents)
          .select('project_id, status'),
        supabase
          .from(TABLES.documents)
          .select('source_uid, project_id, doc_title, status, uploaded_at')
          .order('uploaded_at', { ascending: false })
          .limit(6),
      ]);

      if (projectsErr || docsErr || recentDocsErr) {
        setError(projectsErr?.message || docsErr?.message || recentDocsErr?.message || 'Failed to load workspace.');
        setLoading(false);
        return;
      }

      const baseProjects = (projectRows ?? []) as ProjectRow[];
      const docs = (docRows ?? []) as Array<Pick<DocumentRow, 'project_id' | 'status'>>;
      const docCounts: Record<string, number> = {};

      for (const doc of docs) {
        if (doc.project_id) docCounts[doc.project_id] = (docCounts[doc.project_id] || 0) + 1;
      }

      setProjects(baseProjects.map((project) => ({
        ...project,
        doc_count: docCounts[project.project_id] || 0,
      })));
      setDocuments(docs);
      setRecentDocuments((recentDocRows ?? []) as RecentDocument[]);
      setLoading(false);
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const ingestedDocs = documents.filter((doc) => doc.status === 'ingested').length;
    const convertingDocs = documents.filter((doc) => doc.status === 'converting' || doc.status === 'uploaded').length;

    return {
      totalProjects: projects.length,
      totalDocs,
      ingestedDocs,
      convertingDocs,
    };
  }, [documents, projects.length]);

  const firstProject = projects[0] ?? null;
  const projectNameById = useMemo(() => {
    return new Map(projects.map((project) => [project.project_id, project.project_name]));
  }, [projects]);

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <PageHeader title="Workspace" subtitle="Compact launch surface for projects, schemas, and processing status.">
        <Button size="xs" leftSection={<IconFolderPlus size={14} />} onClick={() => navigate('/app/projects')}>
          New project
        </Button>
      </PageHeader>

      {error && <ErrorAlert message={error} />}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm" mb="md">
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Projects</Text>
          <Text fw={700} size="lg">{stats.totalProjects}</Text>
        </Card>
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Documents</Text>
          <Text fw={700} size="lg">{stats.totalDocs}</Text>
        </Card>
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Ingested</Text>
          <Text fw={700} size="lg">{stats.ingestedDocs}</Text>
        </Card>
        <Card withBorder p="sm">
          <Text size="xs" c="dimmed">Processing</Text>
          <Text fw={700} size="lg">{stats.convertingDocs}</Text>
        </Card>
      </SimpleGrid>

      <Paper withBorder p="sm" mb="md">
        <Group gap="xs" wrap="wrap">
          <Button size="xs" variant="light" leftSection={<IconFolder size={14} />} onClick={() => navigate('/app/projects')}>
            Open projects
          </Button>
          <Button size="xs" variant="light" leftSection={<IconSchema size={14} />} onClick={() => navigate('/app/schemas')}>
            Open schemas
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconUpload size={14} />}
            disabled={!firstProject}
            onClick={() => {
              if (!firstProject) return;
              navigate(`/app/projects/${firstProject.project_id}/upload`);
            }}
          >
            Upload to latest project
          </Button>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Paper withBorder p="sm">
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={700}>Recent Projects</Text>
            <Button
              variant="subtle"
              size="compact-xs"
              rightSection={<IconArrowRight size={12} />}
              onClick={() => navigate('/app/projects')}
            >
              View all
            </Button>
          </Group>
          <Stack gap={6}>
            {projects.slice(0, 6).map((project) => (
              <Group
                key={project.project_id}
                justify="space-between"
                wrap="nowrap"
                p={6}
                style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => navigate(`/app/projects/${project.project_id}`)}
              >
                <div style={{ minWidth: 0 }}>
                  <Text size="sm" fw={600} truncate>{project.project_name}</Text>
                  <Text size="xs" c="dimmed">{formatDate(project.updated_at)}</Text>
                </div>
                <Badge variant="light" size="sm">{project.doc_count} docs</Badge>
              </Group>
            ))}
            {projects.length === 0 && (
              <Text size="xs" c="dimmed">No projects yet.</Text>
            )}
          </Stack>
        </Paper>

        <Paper withBorder p="sm">
          <Text size="sm" fw={700} mb="xs">Recent Documents</Text>
          <Stack gap={6}>
            {recentDocuments.map((doc) => (
              <Group
                key={doc.source_uid}
                justify="space-between"
                wrap="nowrap"
                p={6}
                style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => navigate(`/app/projects/${doc.project_id}/documents/${doc.source_uid}`)}
              >
                <div style={{ minWidth: 0 }}>
                  <Group gap={6} wrap="nowrap">
                    <IconFileText size={12} />
                    <Text size="sm" fw={600} truncate>{doc.doc_title}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {projectNameById.get(doc.project_id) || 'Project'} • {formatDate(doc.uploaded_at)}
                  </Text>
                </div>
                <Badge size="xs" variant="light" color={DOC_STATUS_COLOR[doc.status]}>
                  {doc.status}
                </Badge>
              </Group>
            ))}
            {recentDocuments.length === 0 && (
              <Text size="xs" c="dimmed">No documents uploaded yet.</Text>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>
    </>
  );
}
