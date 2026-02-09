import { useEffect, useState } from 'react';
import {
  Stepper,
  Button,
  Group,
  FileInput,
  TextInput,
  Select,
  Text,
  Paper,
  Stack,
  Badge,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';
import {
  IconUpload,
  IconFileText,
  IconSchema,
  IconPlayerPlay,
  IconCheck,
} from '@tabler/icons-react';
import { supabase } from '@/lib/supabase';
import { edgeJson } from '@/lib/edge';
import { TABLES } from '@/lib/tables';
import type { SchemaRow } from '@/lib/types';
import { PageHeader } from '@/components/common/PageHeader';
import { ErrorAlert } from '@/components/common/ErrorAlert';

type IngestResponse = {
  source_uid: string;
  conv_uid: string | null;
  status: string;
  blocks_count?: number;
  error?: string;
};

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  // Step 1 state
  const [file, setFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<IngestResponse | null>(null);

  // Step 2 state
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [schemaRef, setSchemaRef] = useState('');
  const [uploadingSchema, setUploadingSchema] = useState(false);

  // Step 3 state
  const [creatingRun, setCreatingRun] = useState(false);
  const [runResult, setRunResult] = useState<{ run_id: string; total_blocks: number } | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Load schemas for step 2
  useEffect(() => {
    supabase
      .from(TABLES.schemas)
      .select('schema_id, schema_ref, schema_uid, created_at, owner_id, schema_jsonb')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setSchemas((data ?? []) as SchemaRow[]));
  }, []);

  // Step 1: Upload document
  const handleUpload = async () => {
    if (!file) { setError('Choose a file first.'); return; }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      if (docTitle.trim()) form.set('doc_title', docTitle.trim());
      if (projectId) form.set('project_id', projectId);
      const resp = await edgeJson<IngestResponse>('ingest', { method: 'POST', body: form });
      setUploadResult(resp);
      notifications.show({ color: 'green', title: 'Uploaded', message: `${resp.blocks_count ?? 0} blocks extracted` });
      setActive(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  // Step 2: Upload new schema (optional)
  const handleSchemaUpload = async () => {
    if (!schemaFile) { setError('Choose a schema JSON file.'); return; }
    setUploadingSchema(true);
    setError(null);
    try {
      const form = new FormData();
      if (schemaRef.trim()) form.set('schema_ref', schemaRef.trim());
      form.set('schema', schemaFile);
      const result = await edgeJson<SchemaRow>('schemas', { method: 'POST', body: form });
      setSchemas((prev) => [result, ...prev]);
      setSelectedSchemaId(result.schema_id);
      setSchemaFile(null);
      notifications.show({ color: 'green', title: 'Schema uploaded', message: result.schema_ref });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingSchema(false);
    }
  };

  // Step 3: Create run
  const handleCreateRun = async () => {
    if (!uploadResult?.conv_uid) { setError('Document has no conv_uid.'); return; }
    if (!selectedSchemaId) { setError('Select a schema first.'); return; }
    setCreatingRun(true);
    setError(null);
    try {
      const resp = await edgeJson<{ run_id: string; total_blocks: number }>('runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conv_uid: uploadResult.conv_uid, schema_id: selectedSchemaId }),
      });
      setRunResult(resp);
      notifications.show({ color: 'green', title: 'Run created', message: `${resp.total_blocks} blocks queued` });
      setActive(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreatingRun(false);
    }
  };

  const selectedSchema = schemas.find((s) => s.schema_id === selectedSchemaId);

  return (
    <>
      <PageHeader title="New Annotation" subtitle="Upload a document, choose a schema, and start a run.">
        {projectId && (
          <Button variant="subtle" size="xs" onClick={() => navigate(`/app/projects/${projectId}`)}>
            Back to project
          </Button>
        )}
      </PageHeader>

      <Paper p="lg" withBorder maw={700}>
        <Stepper active={active} onStepClick={(step) => { if (step < active) setActive(step); }}>
          {/* Step 1: Upload */}
          <Stepper.Step
            label="Upload"
            description="Choose a document"
            icon={<IconUpload size={18} />}
          >
            <Stack mt="md" gap="md">
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
                <Button
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!file}
                  leftSection={<IconUpload size={16} />}
                >
                  Upload & extract blocks
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 2: Schema */}
          <Stepper.Step
            label="Schema"
            description="Select or upload"
            icon={<IconSchema size={18} />}
          >
            <Stack mt="md" gap="md">
              {uploadResult && (
                <Alert color="green" icon={<IconCheck size={16} />}>
                  Document ingested: {uploadResult.blocks_count ?? 0} blocks extracted.
                </Alert>
              )}
              <Select
                label="Choose an existing schema"
                placeholder="Select schema..."
                data={schemas.map((s) => ({ value: s.schema_id, label: `${s.schema_ref} (${s.schema_uid.slice(0, 8)}...)` }))}
                value={selectedSchemaId}
                onChange={setSelectedSchemaId}
                searchable
                size="md"
              />
              <Text size="sm" c="dimmed" ta="center">or upload a new one</Text>
              <Group grow>
                <TextInput
                  placeholder="schema_ref (optional)"
                  value={schemaRef}
                  onChange={(e) => setSchemaRef(e.currentTarget.value)}
                  size="sm"
                />
                <FileInput
                  placeholder="Choose .json schema"
                  accept="application/json,.json"
                  value={schemaFile}
                  onChange={setSchemaFile}
                  size="sm"
                />
                <Button variant="light" onClick={handleSchemaUpload} loading={uploadingSchema} disabled={!schemaFile} size="sm">
                  Upload
                </Button>
              </Group>
              {error && <ErrorAlert message={error} />}
              <Group justify="space-between">
                <Button variant="default" onClick={() => setActive(0)}>Back</Button>
                <Group gap="sm">
                  {uploadResult?.source_uid && (
                    <Button
                      variant="subtle"
                      onClick={() => navigate(`/app/projects/${projectId}/documents/${uploadResult.source_uid}`)}
                    >
                      Skip to viewer
                    </Button>
                  )}
                  <Button
                    onClick={() => { setError(null); setActive(2); }}
                    disabled={!selectedSchemaId}
                    rightSection={<IconPlayerPlay size={16} />}
                  >
                    Next
                  </Button>
                </Group>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Step 3: Create Run */}
          <Stepper.Step
            label="Run"
            description="Start annotation"
            icon={<IconPlayerPlay size={18} />}
          >
            <Stack mt="md" gap="md">
              <Paper p="md" withBorder>
                <Stack gap="xs">
                  <Group gap="xs">
                    <Text size="sm" fw={600}>Document:</Text>
                    <Text size="sm">{docTitle || file?.name || 'Untitled'}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>Blocks:</Text>
                    <Badge size="sm">{uploadResult?.blocks_count ?? '?'}</Badge>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={600}>Schema:</Text>
                    <Badge size="sm" variant="light" color="violet">{selectedSchema?.schema_ref ?? 'none'}</Badge>
                  </Group>
                </Stack>
              </Paper>
              {error && <ErrorAlert message={error} />}
              <Group justify="space-between">
                <Button variant="default" onClick={() => setActive(1)}>Back</Button>
                <Button
                  onClick={handleCreateRun}
                  loading={creatingRun}
                  leftSection={<IconPlayerPlay size={16} />}
                  color="green"
                >
                  Create run
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          {/* Completed */}
          <Stepper.Completed>
            <Stack mt="md" gap="md" align="center">
              <ThemeIcon size={60} radius="xl" color="green" variant="light">
                <IconCheck size={32} />
              </ThemeIcon>
              <Text size="lg" fw={600}>Run created</Text>
              {runResult && (
                <Text size="sm" c="dimmed">{runResult.total_blocks} blocks queued for annotation.</Text>
              )}
              <Group>
                <Button
                  variant="light"
                  onClick={() => navigate(`/app/projects/${projectId}/documents/${uploadResult?.source_uid}`)}
                >
                  Open Block Viewer
                </Button>
                <Button
                  variant="subtle"
                  onClick={() => {
                    setActive(0);
                    setFile(null);
                    setDocTitle('');
                    setUploadResult(null);
                    setSelectedSchemaId(null);
                    setRunResult(null);
                  }}
                >
                  Upload another
                </Button>
              </Group>
            </Stack>
          </Stepper.Completed>
        </Stepper>
      </Paper>
    </>
  );
}
