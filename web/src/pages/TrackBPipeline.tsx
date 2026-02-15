import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Center, Group, Loader, Paper, Select, Stack, Text } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { CopyUid } from '@/components/common/CopyUid';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { PageHeader } from '@/components/common/PageHeader';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import type { TrackBRunRow } from '@/lib/types';

type ProjectNameRow = {
  project_id: string;
  project_name: string;
};

const RUN_STATUS_COLOR: Record<string, string> = {
  queued: 'gray',
  running: 'blue',
  partial_success: 'yellow',
  success: 'green',
  failed: 'red',
  cancelled: 'gray',
};

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function shortUid(value: string): string {
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function TrackBPipeline() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<TrackBRunRow[]>([]);
  const [projectNameById, setProjectNameById] = useState<Map<string, string>>(new Map());
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const [runRes, projectRes] = await Promise.all([
        supabase
          .from('unstructured_workflow_runs_v2')
          .select('run_uid, workspace_id, project_id, workflow_uid, flow_mode, status, accepted_count, rejected_count, error, started_at, ended_at, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(60),
        supabase
          .from(TABLES.projects)
          .select('project_id, project_name'),
      ]);

      if (runRes.error) {
        setError(runRes.error.message);
        setLoading(false);
        return;
      }
      if (projectRes.error) {
        setError(projectRes.error.message);
        setLoading(false);
        return;
      }

      const runRows = (runRes.data ?? []) as TrackBRunRow[];
      const projectRows = (projectRes.data ?? []) as ProjectNameRow[];
      setRuns(runRows);
      setProjectNameById(new Map(projectRows.map((project) => [project.project_id, project.project_name])));
      setLoading(false);
    };
    void load();
  }, []);

  const projectOptions = useMemo(() => {
    const ids = Array.from(new Set(runs.map((run) => run.project_id)));
    return [
      { value: 'all', label: 'All projects' },
      ...ids.map((projectId) => ({
        value: projectId,
        label: projectNameById.get(projectId) ?? projectId,
      })),
    ];
  }, [projectNameById, runs]);

  const filteredRuns = useMemo(
    () => projectFilter === 'all'
      ? runs
      : runs.filter((run) => run.project_id === projectFilter),
    [projectFilter, runs],
  );

  if (loading) return <Center mt="xl"><Loader /></Center>;

  return (
    <>
      <AppBreadcrumbs items={[{ label: 'Track B' }, { label: 'Pipeline' }]} />

      <PageHeader
        title="Track B Pipeline"
        subtitle="Recent run execution stream across Track B projects."
      />

      {error && <ErrorAlert message={error} />}

      <Paper withBorder p="md" radius="md" mb="md">
        <Select
          label="Project Filter"
          value={projectFilter}
          onChange={(value) => setProjectFilter(value ?? 'all')}
          data={projectOptions}
          searchable
        />
      </Paper>

      <Stack gap="sm">
        {filteredRuns.length === 0 && (
          <Paper withBorder p="md" radius="md">
            <Text size="sm" c="dimmed">No Track B runs found.</Text>
          </Paper>
        )}
        {filteredRuns.map((run) => (
          <Paper key={run.run_uid} withBorder p="sm" radius="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <Group gap="xs">
                <Badge variant="light" color={RUN_STATUS_COLOR[run.status] ?? 'gray'}>{run.status}</Badge>
                <Text size="xs" c="dimmed">{run.flow_mode}</Text>
                <Text size="xs" c="dimmed">{projectNameById.get(run.project_id) ?? run.project_id}</Text>
                <Text size="xs" c="dimmed">accepted {run.accepted_count} | rejected {run.rejected_count}</Text>
              </Group>
              <Group gap="xs">
                <Button size="compact-xs" variant="light" onClick={() => navigate(`/app/projects/${run.project_id}/track-b/runs/${run.run_uid}`)}>
                  Open Run
                </Button>
                <Button size="compact-xs" variant="default" onClick={() => navigate(`/app/projects/${run.project_id}/track-b/transform`)}>
                  Workspace
                </Button>
              </Group>
            </Group>
            <Group gap={4} mt={4}>
              <CopyUid value={run.run_uid} display={shortUid(run.run_uid)} size="10px" />
              <Text size="10px" c="dimmed">| {formatRelativeTime(run.created_at)}</Text>
            </Group>
          </Paper>
        ))}
      </Stack>
    </>
  );
}
