import { useEffect, useState } from 'react';
import {
  Button,
  Group,
  FileInput,
  TextInput,
  Text,
  Paper,
  Stack,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';
import { IconUpload, IconFileText } from '@tabler/icons-react';
import { edgeJson } from '@/lib/edge';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/lib/tables';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AppBreadcrumbs } from '@/components/common/AppBreadcrumbs';

type IngestResponse = {
  source_uid: string;
  conv_uid: string | null;
  status: string;
  blocks_count?: number;
  error?: string;
};

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleUpload = async () => {
    if (!file) { setError('Choose a file first.'); return; }
    if (!projectId) { setError('No project context.'); return; }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      if (docTitle.trim()) form.set('doc_title', docTitle.trim());
      form.set('project_id', projectId);
      const resp = await edgeJson<IngestResponse>('ingest', { method: 'POST', body: form });
      notifications.show({ color: 'green', title: 'Uploaded', message: `${resp.blocks_count ?? 0} blocks extracted` });
      navigate(`/app/projects/${projectId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <AppBreadcrumbs items={[
      { label: 'Projects', href: '/app' },
      { label: projectName || 'Project', href: `/app/projects/${projectId}` },
      { label: 'Upload' },
    ]} />
    <Paper p="lg" withBorder maw={600}>
      <Stack gap="md">
        <Text fw={600} size="lg">Upload document</Text>
        <FileInput
          label="Document file"
          placeholder="Choose .md, .docx, .pdf, .pptx, .txt"
          accept=".md,.docx,.pdf,.pptx,.txt"
          value={file}
          onChange={(f) => { setFile(f); setError(null); }}
          leftSection={<IconFileText size={16} />}
          size="md"
        />
        <TextInput
          label="Title (optional)"
          placeholder="Defaults to filename"
          value={docTitle}
          onChange={(e) => setDocTitle(e.currentTarget.value)}
          size="md"
        />
        {error && <ErrorAlert message={error} />}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => navigate(`/app/projects/${projectId}`)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={uploading}
            disabled={!file}
            leftSection={<IconUpload size={16} />}
          >
            Upload
          </Button>
        </Group>
      </Stack>
    </Paper>
    </>
  );
}