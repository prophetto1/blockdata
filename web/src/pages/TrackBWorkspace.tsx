import { useEffect, useState } from 'react';
import { Center, Loader, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

type TrackBProjectRow = {
  project_id: string;
  project_name: string;
  workspace_id: string | null;
  updated_at: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString();
}

export default function TrackBWorkspace() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<TrackBProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from(TABLES.projects)
        .select('project_id, project_name, workspace_id, updated_at')
        .not('workspace_id', 'is', null)
        .order('updated_at', { ascending: false });
      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }
      setProjects((data ?? []) as TrackBProjectRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <PageHeader
        title="Track B Projects"
        subtitle="Select a project to open its workbench."
      />

      {error && <ErrorAlert message={error} />}

      {projects.length === 0 && !error && (
        <Text size="sm" c="dimmed">No Track B-enabled projects yet.</Text>
      )}

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {projects.map((project) => (
          <Paper
            key={project.project_id}
            withBorder
            p="sm"
            radius="md"
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/app/projects/${project.project_id}/track-b/workbench`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                navigate(`/app/projects/${project.project_id}/track-b/workbench`);
              }
            }}
          >
            <Stack gap={4}>
              <Text fw={600} size="sm">{project.project_name}</Text>
              <Text size="xs" c="dimmed">Updated {formatDate(project.updated_at)}</Text>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </>
  );
}