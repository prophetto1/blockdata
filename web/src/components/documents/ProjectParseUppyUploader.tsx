import { useRef, useEffect, useState } from 'react';
import { FileUpload as ArkFileUpload } from '@ark-ui/react/file-upload';
import Dashboard from '@uppy/react/dashboard';
import { FileIcon, UploadIcon, XIcon, AlertCircleIcon, CheckIcon, Loader2Icon, CloudIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUppyTransport, type UploadBatchResult, type FileState } from './useUppyTransport';

import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';

export type { UploadBatchResult };

type ProjectParseUppyUploaderProps = {
  projectId: string;
  ingestMode?: 'ingest' | 'upload_only';
  onBatchUploaded?: (result: UploadBatchResult) => void | Promise<void>;
  enableRemoteSources?: boolean;
  companionUrl?: string;
  hideHeader?: boolean;
};

function FileStatusIcon({ status }: { status: FileState['status'] }) {
  switch (status) {
    case 'uploading':
      return <Loader2Icon className="h-3.5 w-3.5 animate-spin text-primary" />;
    case 'done':
      return <CheckIcon className="h-3.5 w-3.5 text-green-500" />;
    case 'error':
      return <AlertCircleIcon className="h-3.5 w-3.5 text-destructive" />;
    default:
      return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectParseUppyUploader({
  projectId,
  ingestMode = 'upload_only',
  onBatchUploaded,
  enableRemoteSources = false,
  companionUrl,
  hideHeader = false,
}: ProjectParseUppyUploaderProps) {
  const {
    uppy,
    fileStates,
    status,
    error,
    remoteWarning,
    remoteSourcesActive,
    allowedExtensions,
    addFiles,
    removeFile,
    startUpload,
  } = useUppyTransport({ projectId, ingestMode, onBatchUploaded, enableRemoteSources, companionUrl });

  const [showRemotePicker, setShowRemotePicker] = useState(false);
  const dashboardHostRef = useRef<HTMLDivElement>(null);

  // Close the remote picker when Dashboard completes or user navigates away
  useEffect(() => {
    if (!uppy || !showRemotePicker) return;
    const handleComplete = () => setShowRemotePicker(false);
    uppy.on('complete', handleComplete);
    return () => { uppy.off('complete', handleComplete); };
  }, [uppy, showRemotePicker]);

  const files = Array.from(fileStates.values());
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const hasFiles = files.length > 0;

  const summaryText = status === 'uploading'
    ? `Uploading ${uploadingCount + doneCount} of ${files.length}`
    : status === 'complete'
      ? `${doneCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      : hasFiles
        ? `${files.length} file${files.length === 1 ? '' : 's'} ready`
        : null;

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  const acceptMap: Record<string, string[]> = {};
  for (const ext of allowedExtensions) {
    acceptMap[`application/${ext.replace('.', '')}`] = [ext];
  }

  return (
    <div className="flex flex-col gap-0">
      {!hideHeader && (
        <div className="flex h-(--shell-pane-header-height,50px) items-center px-2.5 text-sm font-bold text-foreground">
          Add Documents
        </div>
      )}

      <ArkFileUpload.Root
        maxFiles={20}
        accept={acceptMap}
        onFileChange={(details) => {
          addFiles(details.acceptedFiles);
        }}
        className="flex flex-col gap-0"
      >
        <ArkFileUpload.Dropzone
          className={cn(
            'flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center',
            'cursor-pointer transition-colors duration-150',
            'hover:bg-muted/50',
            'data-dragging:border-primary data-dragging:border-solid data-dragging:bg-primary/5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          )}
        >
          <UploadIcon className="h-8 w-8 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Drag files here or click to browse
          </span>
          <span className="text-xs text-muted-foreground">
            {allowedExtensions.map((e) => e.replace('.', '').toUpperCase()).join(', ')}
          </span>
        </ArkFileUpload.Dropzone>
        <ArkFileUpload.HiddenInput />
      </ArkFileUpload.Root>

      {/* Cloud import button — opens Uppy Dashboard for remote source picker */}
      {remoteSourcesActive && (
        <button
          type="button"
          onClick={() => setShowRemotePicker((v) => !v)}
          className={cn(
            'mt-1.5 flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground',
            'cursor-pointer transition-colors hover:bg-muted/50 hover:text-foreground',
            showRemotePicker && 'bg-muted/50 text-foreground',
          )}
        >
          <CloudIcon className="h-3.5 w-3.5" />
          Import from cloud
        </button>
      )}

      {/* Hidden Uppy Dashboard — only rendered when remote picker is open */}
      {remoteSourcesActive && showRemotePicker && uppy && (
        <div ref={dashboardHostRef} className="mt-1.5 rounded-lg border border-border overflow-hidden">
          <Dashboard
            uppy={uppy}
            height={320}
            width="100%"
            showSelectedFiles
            plugins={['GoogleDrive']}
            proudlyDisplayPoweredByUppy={false}
            hideProgressDetails={false}
            theme="dark"
          />
        </div>
      )}

      {/* Summary bar + upload action */}
      {hasFiles && (
        <div className="flex items-center justify-between px-1 py-1.5">
          <span className="text-xs text-muted-foreground">{summaryText}</span>
          {pendingCount > 0 && status !== 'uploading' && (
            <button
              type="button"
              onClick={startUpload}
              className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Upload
            </button>
          )}
        </div>
      )}

      {/* Scrollable compact file list */}
      {hasFiles && (
        <div className="max-h-48 overflow-y-auto">
          <ul className="flex flex-col">
            {files.map((file) => (
              <li
                key={file.id}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border px-1 py-1.5',
                  file.status === 'error' && 'bg-destructive/5',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileIcon className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                  <span className="truncate text-xs text-foreground">{file.name}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatBytes(file.size)}</span>
                <FileStatusIcon status={file.status} />
                {file.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground cursor-pointer border-none bg-transparent"
                    aria-label={`Remove ${file.name}`}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Aggregate progress bar */}
      {status === 'uploading' && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${files.length > 0 ? Math.round(files.reduce((sum, f) => sum + f.progress, 0) / files.length) : 0}%` }}
          />
        </div>
      )}

      {remoteWarning && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-2 text-xs text-yellow-600 dark:text-yellow-400">
          {remoteWarning}
        </div>
      )}
    </div>
  );
}
