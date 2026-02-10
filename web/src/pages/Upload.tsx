import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  Button,
  Group,
  Text,
  Paper,
  Stack,
  Badge,
  ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate, useParams } from 'react-router-dom';
import { IconUpload, IconFileText, IconX } from '@tabler/icons-react';
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

type UploadStatus = 'ready' | 'uploading' | 'uploaded' | 'ingested' | 'failed';

type UploadEntry = {
  id: string;
  file: File;
};

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  const maxFiles = 10;
  const allowedExtensions = ['.md', '.docx', '.pdf', '.txt'];
  const statusColor: Record<UploadStatus, string> = {
    ready: 'gray',
    uploading: 'blue',
    uploaded: 'yellow',
    ingested: 'green',
    failed: 'red',
  };

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

  const isAccepted = (file: File) => {
    const lower = file.name.toLowerCase();
    return allowedExtensions.some((ext) => lower.endsWith(ext));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const addFiles = (candidateFiles: File[]) => {
    if (candidateFiles.length === 0) return;

    const validFiles = candidateFiles.filter(isAccepted);
    const rejectedCount = candidateFiles.length - validFiles.length;

    if (rejectedCount > 0) {
      notifications.show({
        color: 'red',
        title: 'Unsupported file type',
        message: `${rejectedCount} file(s) were skipped. Allowed: ${allowedExtensions.join(', ')}`,
      });
    }

    const remaining = maxFiles - entries.length;
    if (remaining <= 0) {
      setError(`Maximum ${maxFiles} files per batch.`);
      return;
    }

    const filesToAdd = validFiles.slice(0, remaining);
    if (validFiles.length > remaining) {
      notifications.show({
        color: 'yellow',
        title: 'File limit reached',
        message: `Only the first ${remaining} additional file(s) were added.`,
      });
    }

    const newEntries = filesToAdd.map((file, index) => {
      const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${index}`;
      return {
        id: `${uniqueId}-${file.name}-${file.lastModified}-${file.size}`,
        file,
      };
    });

    setEntries((prev) => [...prev, ...newEntries]);
    setStatuses((prev) => {
      const next = { ...prev };
      for (const entry of newEntries) next[entry.id] = 'ready';
      return next;
    });
    setMessages((prev) => {
      const next = { ...prev };
      for (const entry of newEntries) next[entry.id] = 'Ready to upload';
      return next;
    });
    setError(null);
  };

  const onFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.currentTarget.files ?? []);
    addFiles(selected);
    event.currentTarget.value = '';
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setMessages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const uploadOne = async (entry: UploadEntry) => {
    setStatuses((prev) => ({ ...prev, [entry.id]: 'uploading' }));
    setMessages((prev) => ({ ...prev, [entry.id]: 'Uploading...' }));
    const form = new FormData();
    form.set('file', entry.file);
    form.set('project_id', projectId as string);
    const resp = await edgeJson<IngestResponse>('ingest', { method: 'POST', body: form });

    if (resp.status === 'ingested') {
      setStatuses((prev) => ({ ...prev, [entry.id]: 'ingested' }));
      setMessages((prev) => ({
        ...prev,
        [entry.id]: `${resp.blocks_count ?? 0} blocks extracted`,
      }));
      return;
    }

    if (resp.status === 'conversion_failed' || resp.status === 'ingest_failed') {
      setStatuses((prev) => ({ ...prev, [entry.id]: 'failed' }));
      setMessages((prev) => ({
        ...prev,
        [entry.id]: resp.error || 'Ingest failed',
      }));
      return;
    }

    setStatuses((prev) => ({ ...prev, [entry.id]: 'uploaded' }));
    setMessages((prev) => ({
      ...prev,
      [entry.id]: 'Uploaded. Conversion/ingest is in progress.',
    }));
  };

  const handleUpload = async () => {
    if (entries.length === 0) { setError('Add at least one file first.'); return; }
    if (!projectId) { setError('No project context.'); return; }

    const candidates = entries.filter((entry) => {
      const status = statuses[entry.id];
      return status === 'ready' || status === 'failed';
    });
    if (candidates.length === 0) {
      setError('No files are ready to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const results = await Promise.all(
        candidates.map(async (entry) => {
          try {
            await uploadOne(entry);
            return { id: entry.id, ok: true };
          } catch (e) {
            setStatuses((prev) => ({ ...prev, [entry.id]: 'failed' }));
            setMessages((prev) => ({
              ...prev,
              [entry.id]: e instanceof Error ? e.message : String(e),
            }));
            return { id: entry.id, ok: false };
          }
        }),
      );

      const successCount = results.filter((result) => result.ok).length;
      const failureCount = results.length - successCount;
      notifications.show({
        color: failureCount === 0 ? 'green' : 'yellow',
        title: failureCount === 0 ? 'Batch uploaded' : 'Batch uploaded with errors',
        message: `${successCount} succeeded, ${failureCount} failed.`,
      });
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
      <Paper p="lg" withBorder maw={760}>
        <Stack gap="md">
          <Text fw={600} size="lg">Upload documents</Text>
          <Text size="sm" c="dimmed">
            Drag files here or browse. Up to {maxFiles} files per batch.
          </Text>

          <Paper
            withBorder
            p="xl"
            radius="md"
            style={{
              borderStyle: 'dashed',
              cursor: uploading ? 'not-allowed' : 'pointer',
              backgroundColor: dragActive ? 'var(--mantine-color-blue-light)' : undefined,
              opacity: uploading ? 0.65 : 1,
            }}
            onClick={() => {
              if (!uploading) inputRef.current?.click();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!uploading) setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={onDrop}
          >
            <Stack align="center" gap="xs">
              <IconFileText size={28} />
              <Text size="sm" fw={500}>Drop files to add them</Text>
              <Text size="xs" c="dimmed">
                Supported: {allowedExtensions.join(', ')}
              </Text>
              <Button variant="light" size="xs" disabled={uploading}>
                Browse files
              </Button>
            </Stack>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={allowedExtensions.join(',')}
              style={{ display: 'none' }}
              onChange={onFileInputChange}
            />
          </Paper>

          {entries.length > 0 && (
            <Stack gap="xs">
              {entries.map((entry) => {
                const status = statuses[entry.id] ?? 'ready';
                const message = messages[entry.id];
                return (
                  <Paper key={entry.id} withBorder p="sm" radius="sm">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                      <Stack gap={2} style={{ minWidth: 0 }}>
                        <Text size="sm" fw={500} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.file.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatBytes(entry.file.size)}
                        </Text>
                        {message && (
                          <Text size="xs" c={status === 'failed' ? 'red' : 'dimmed'}>
                            {message}
                          </Text>
                        )}
                      </Stack>

                      <Group gap="xs">
                        <Badge variant="light" color={statusColor[status]}>
                          {status}
                        </Badge>
                        {status === 'failed' && !uploading && (
                          <Button
                            size="compact-xs"
                            variant="light"
                            onClick={async () => {
                              if (!projectId) return;
                              try {
                                await uploadOne(entry);
                              } catch (e) {
                                setStatuses((prev) => ({ ...prev, [entry.id]: 'failed' }));
                                setMessages((prev) => ({
                                  ...prev,
                                  [entry.id]: e instanceof Error ? e.message : String(e),
                                }));
                              }
                            }}
                          >
                            Retry
                          </Button>
                        )}
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          disabled={uploading || status === 'uploading'}
                          onClick={() => removeEntry(entry.id)}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
          )}

          {error && <ErrorAlert message={error} />}

          <Group justify="space-between">
            <Button variant="default" onClick={() => navigate(`/app/projects/${projectId}`)}>
              Back to project
            </Button>
            <Group>
              <Button
                variant="default"
                onClick={() => {
                  if (uploading) return;
                  setEntries([]);
                  setStatuses({});
                  setMessages({});
                  setError(null);
                }}
                disabled={uploading || entries.length === 0}
              >
                Clear
              </Button>
              <Button
                onClick={handleUpload}
                loading={uploading}
                disabled={entries.length === 0}
                leftSection={<IconUpload size={16} />}
              >
                Upload selected
              </Button>
            </Group>
          </Group>
        </Stack>
      </Paper>
    </>
  );
}
