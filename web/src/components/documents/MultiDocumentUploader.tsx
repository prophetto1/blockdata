import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ActionIcon, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconFileText, IconUpload, IconX } from '@tabler/icons-react';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { edgeJson } from '@/lib/edge';

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

type MultiDocumentUploaderProps = {
  projectId: string;
  title?: string | null;
  subtitle?: string | null;
  maxWidth?: number | string;
  framed?: boolean;
  dropzoneSquare?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  onBatchUploaded?: () => void | Promise<void>;
};

export function MultiDocumentUploader({
  projectId,
  title = 'Upload documents',
  subtitle,
  maxWidth,
  framed = true,
  dropzoneSquare = false,
  showBackButton = false,
  onBack,
  onBatchUploaded,
}: MultiDocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [entries, setEntries] = useState<UploadEntry[]>([]);
  const [statuses, setStatuses] = useState<Record<string, UploadStatus>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxFiles, setMaxFiles] = useState(10);
  const [allowedExtensions, setAllowedExtensions] = useState<string[]>([
    '.md',
    '.docx',
    '.pdf',
    '.pptx',
    '.xlsx',
    '.html',
    '.csv',
    '.txt',
  ]);

  const subtitleText = subtitle === null ? null : (subtitle ?? `Drag files here or browse. Up to ${maxFiles} files per batch.`);

  const statusColor: Record<UploadStatus, string> = {
    ready: 'gray',
    uploading: 'blue',
    uploaded: 'yellow',
    ingested: 'green',
    failed: 'red',
  };

  useEffect(() => {
    edgeJson<{ upload: { max_files_per_batch: number; allowed_extensions: string[] } }>('upload-policy', { method: 'GET' })
      .then((data) => {
        if (typeof data.upload.max_files_per_batch === 'number' && data.upload.max_files_per_batch > 0) {
          setMaxFiles(data.upload.max_files_per_batch);
        }
        if (Array.isArray(data.upload.allowed_extensions) && data.upload.allowed_extensions.length > 0) {
          setAllowedExtensions(
            data.upload.allowed_extensions.map((ext) => {
              const lower = ext.trim().toLowerCase();
              return lower.startsWith('.') ? lower : `.${lower}`;
            }),
          );
        }
      })
      .catch(() => {
        // Keep fallback values if runtime policy endpoint is unavailable.
      });
  }, []);

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
    form.set('project_id', projectId);
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
    if (entries.length === 0) {
      setError('Add at least one file first.');
      return;
    }

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

      if (onBatchUploaded) {
        await onBatchUploaded();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const openFilePicker = () => {
    if (!uploading) inputRef.current?.click();
  };

  const queueRows = entries.map((entry) => {
    const status = statuses[entry.id] ?? 'ready';
    const message = messages[entry.id];

    return (
      <Paper
        key={entry.id}
        withBorder
        p="sm"
        radius="sm"
        onClick={(event) => event.stopPropagation()}
      >
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
                onClick={async (event) => {
                  event.stopPropagation();
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
              onClick={(event) => {
                event.stopPropagation();
                removeEntry(entry.id);
              }}
            >
              <IconX size={14} />
            </ActionIcon>
          </Group>
        </Group>
      </Paper>
    );
  });

  const content = (
    <Stack gap="md">
        {title ? <Text fw={600} size="lg">{title}</Text> : null}
        {subtitleText ? (
          <Text size="sm" c="dimmed">
            {subtitleText}
          </Text>
        ) : null}

        <Paper
          withBorder
          p="xl"
          radius="md"
          style={{
            borderStyle: 'dashed',
            cursor: uploading ? 'not-allowed' : 'pointer',
            backgroundColor: dragActive ? 'var(--mantine-color-blue-light)' : undefined,
            opacity: uploading ? 0.65 : 1,
            aspectRatio: dropzoneSquare ? '1 / 1' : undefined,
            minHeight: dropzoneSquare ? 320 : undefined,
            display: dropzoneSquare ? 'flex' : undefined,
            alignItems: dropzoneSquare ? (entries.length === 0 ? 'center' : 'stretch') : undefined,
            justifyContent: dropzoneSquare ? (entries.length === 0 ? 'center' : 'flex-start') : undefined,
          }}
          onClick={openFilePicker}
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
          {entries.length === 0 ? (
            <Stack align="center" gap="xs" style={dropzoneSquare ? { width: '100%' } : undefined}>
              <IconFileText size={28} />
              <Text size="sm" fw={500}>Drop files to add them</Text>
              <Text size="xs" c="dimmed">
                Supported: {allowedExtensions.join(', ')}
              </Text>
              <Button
                variant="light"
                size="xs"
                disabled={uploading}
                onClick={(event) => {
                  event.stopPropagation();
                  openFilePicker();
                }}
              >
                Browse files
              </Button>
            </Stack>
          ) : (
            <Stack gap="xs" style={{ width: '100%' }}>
              <Group justify="space-between" align="center">
                <Text size="xs" c="dimmed" fw={600}>
                  Upload queue
                </Text>
                <Badge variant="light" color="blue">
                  {entries.length} file(s) selected
                </Badge>
              </Group>

              <Stack gap="xs" style={{ width: '100%', maxHeight: dropzoneSquare ? 240 : 260, overflowY: 'auto' }}>
                {queueRows}
              </Stack>

              <Group justify="center">
                <Button
                  variant="light"
                  size="xs"
                  disabled={uploading}
                  onClick={(event) => {
                    event.stopPropagation();
                    openFilePicker();
                  }}
                >
                  Add more files
                </Button>
              </Group>
            </Stack>
          )}
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={allowedExtensions.join(',')}
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />
        </Paper>

        {error && <ErrorAlert message={error} />}

        <Group justify={showBackButton ? 'space-between' : 'center'}>
          {showBackButton ? (
            <Button variant="default" onClick={onBack}>
              Back to project
            </Button>
          ) : null}
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
  );

  if (!framed) {
    return <div style={{ maxWidth }}>{content}</div>;
  }

  return (
    <Paper p="lg" withBorder maw={maxWidth}>
      {content}
    </Paper>
  );
}
