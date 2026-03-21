import { FileUpload as ArkFileUpload } from '@ark-ui/react/file-upload';
import { AlertCircleIcon, CheckIcon, FileIcon, Loader2Icon, UploadIcon, XIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useDirectUpload, type StagedFile } from '@/hooks/useDirectUpload';
import { cn } from '@/lib/utils';

export type UploadBatchResult = {
  uploadedSourceUids: string[];
};

type ProjectParseUploaderProps = {
  projectId: string;
  onBatchUploaded?: (result: UploadBatchResult) => void | Promise<void>;
  hideHeader?: boolean;
};

function FileStatusIcon({ status }: { status: StagedFile['status'] }) {
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

export function ProjectParseUploader({
  projectId,
  onBatchUploaded,
  hideHeader = false,
}: ProjectParseUploaderProps) {
  const {
    files,
    uploadStatus,
    pendingCount,
    addFiles,
    removeFile,
    clearDone,
    startUpload,
  } = useDirectUpload(projectId);

  const handleStartUpload = useCallback(async () => {
    const uploadedSourceUids = await startUpload();
    if (uploadedSourceUids.length > 0 && onBatchUploaded) {
      await onBatchUploaded({ uploadedSourceUids });
    }
  }, [onBatchUploaded, startUpload]);

  const uploadingCount = files.filter((file) => file.status === 'uploading').length;
  const doneCount = files.filter((file) => file.status === 'done').length;
  const errorCount = files.filter((file) => file.status === 'error').length;
  const hasFiles = files.length > 0;

  const summaryText = uploadStatus === 'uploading'
    ? `Uploading ${uploadingCount + doneCount} of ${files.length}`
    : uploadStatus === 'done'
      ? `${doneCount} uploaded${errorCount > 0 ? `, ${errorCount} failed` : ''}`
      : hasFiles
        ? `${files.length} file${files.length === 1 ? '' : 's'} ready`
        : null;

  return (
    <div className="flex flex-col gap-0">
      {!hideHeader && (
        <div className="flex h-(--shell-pane-header-height,50px) items-center px-2.5 text-sm font-bold text-foreground">
          Add Documents
        </div>
      )}

      <ArkFileUpload.Root
        maxFiles={20}
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
            Any file format
          </span>
        </ArkFileUpload.Dropzone>
        <ArkFileUpload.HiddenInput />
      </ArkFileUpload.Root>

      {hasFiles && (
        <div className="flex items-center justify-between px-1 py-1.5">
          <span className="text-xs text-muted-foreground">{summaryText}</span>
          <div className="flex items-center gap-2">
            {doneCount > 0 && uploadStatus === 'done' && (
              <button
                type="button"
                onClick={clearDone}
                className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-muted/50"
              >
                Clear completed
              </button>
            )}
            {pendingCount > 0 && uploadStatus !== 'uploading' && (
              <button
                type="button"
                onClick={() => void handleStartUpload()}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Upload
              </button>
            )}
          </div>
        </div>
      )}

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
                <div className="flex min-w-0 items-center gap-2">
                  <FileIcon className="h-3.5 w-3.5 flex-none text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="block truncate text-xs text-foreground">{file.file.name}</span>
                    {file.status === 'error' && file.error && (
                      <span className="block truncate text-[10px] text-destructive">{file.error}</span>
                    )}
                  </div>
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">{formatBytes(file.file.size)}</span>
                <FileStatusIcon status={file.status} />
                {file.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="flex h-5 w-5 items-center justify-center rounded border-none bg-transparent text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${file.file.name}`}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
