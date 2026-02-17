import { useEffect, useState } from 'react';
import { Button, Group } from '@mantine/core';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';
import { MultiDocumentUploader } from '@/components/documents/MultiDocumentUploader';
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
      <Group mb="sm">
        <Button
          size="xs"
          variant="light"
          onClick={() => navigate(`/app/projects/${projectId}/upload-uppy-demo`)}
        >
          Open Uppy Library Demo
        </Button>
      </Group>
      <MultiDocumentUploader
        projectId={projectId}
        maxWidth={760}
        showBackButton
        onBack={() => navigate(`/app/projects/${projectId}`)}
      />
    </>
  );
}
