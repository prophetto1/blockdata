import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { notifications } from '@mantine/notifications';
import { IconFileText, IconUpload, IconX } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
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

const statusVariant: Record<UploadStatus, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  ready: 'gray',
  uploading: 'blue',
  uploaded: 'yellow',
  ingested: 'green',
  failed: 'red',
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

  const btnClass = 'rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';
  const btnDefault = `${btnClass} border bg-background hover:bg-accent`;
  const btnLight = `${btnClass} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
  const btnPrimary = `${btnClass} bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5`;

  const queueRows = entries.map((entry) => {
    const status = statuses[entry.id] ?? 'ready';
    const message = messages[entry.id];

    return (
      <div
        key={entry.id}
        className="rounded-sm border p-2"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{entry.file.name}</span>
            <span className="text-xs text-muted-foreground">{formatBytes(entry.file.size)}</span>
            {message && (
              <span className={`text-xs ${status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[status]}>{status}</Badge>
            {status === 'failed' && !uploading && (
              <button
                type="button"
                className={btnLight}
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
              </button>
            )}
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              disabled={uploading || status === 'uploading'}
              onClick={(event) => {
                event.stopPropagation();
                removeEntry(entry.id);
              }}
            >
              <IconX size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  });

  const content = (
    <div className="flex flex-col gap-4">
      {title ? <span className="text-lg font-semibold">{title}</span> : null}
      {subtitleText ? (
        <span className="text-sm text-muted-foreground">{subtitleText}</span>
      ) : null}

      <div
        className="rounded-md border border-dashed p-6"
        style={{
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: dragActive ? 'hsl(var(--accent))' : undefined,
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
          <div className="flex flex-col items-center gap-2" style={dropzoneSquare ? { width: '100%' } : undefined}>
            <IconFileText size={28} />
            <span className="text-sm font-medium">Drop files to add them</span>
            <span className="text-xs text-muted-foreground">
              Supported: {allowedExtensions.join(', ')}
            </span>
            <button
              type="button"
              className={btnLight}
              disabled={uploading}
              onClick={(event) => {
                event.stopPropagation();
                openFilePicker();
              }}
            >
              Browse files
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Upload queue</span>
              <Badge variant="blue">{entries.length} file(s) selected</Badge>
            </div>

            <div className="flex w-full flex-col gap-2 overflow-y-auto" style={{ maxHeight: dropzoneSquare ? 240 : 260 }}>
              {queueRows}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                className={btnLight}
                disabled={uploading}
                onClick={(event) => {
                  event.stopPropagation();
                  openFilePicker();
                }}
              >
                Add more files
              </button>
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={allowedExtensions.join(',')}
          style={{ display: 'none' }}
          onChange={onFileInputChange}
        />
      </div>

      {error && <ErrorAlert message={error} />}

      <div className={`flex ${showBackButton ? 'justify-between' : 'justify-center'}`}>
        {showBackButton ? (
          <button type="button" className={btnDefault} onClick={onBack}>
            Back to project
          </button>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            className={btnDefault}
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
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={handleUpload}
            disabled={uploading || entries.length === 0}
          >
            {uploading ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <IconUpload size={16} />}
            Upload selected
          </button>
        </div>
      </div>
    </div>
  );

  if (!framed) {
    return <div style={{ maxWidth }}>{content}</div>;
  }

  return (
    <div className="rounded-md border p-6" style={{ maxWidth }}>
      {content}
    </div>
  );
}
