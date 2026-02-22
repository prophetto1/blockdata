import { useEffect, useState } from 'react';
import { Button, Group, Paper, Stack } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { ProjectParseUppyUploader } from '@/components/documents/ProjectParseUppyUploader';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState<string>('');

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

  useShellHeaderTitle({
    title: 'Upload',
    subtitle: projectName ? `Project: ${projectName}` : undefined,
  });

  if (!projectId) return null;

  return (
    <>
      <AppBreadcrumbs
        items={[
          { label: 'Projects', href: '/app/projects' },
          { label: projectName || 'Project', href: `/app/projects/${projectId}` },
          { label: 'Upload' },
        ]}
      />
      <Group mb="sm" justify="space-between">
        <Button
          size="xs"
          variant="default"
          onClick={() => navigate(`/app/projects/${projectId}`)}
        >
          Back to project
        </Button>
        <Button
          size="xs"
          variant="light"
          onClick={() => navigate(`/app/projects/${projectId}/upload-uppy-demo`)}
        >
          Open Uppy Library Demo
        </Button>
      </Group>
      <Paper withBorder p="lg" maw={760}>
        <Stack gap="xs">
          <ProjectParseUppyUploader
            projectId={projectId}
            ingestMode="upload_only"
            enableRemoteSources
            companionUrl={import.meta.env.VITE_UPPY_COMPANION_URL as string | undefined}
            height={420}
          />
        </Stack>
      </Paper>
    </>
  );
}
