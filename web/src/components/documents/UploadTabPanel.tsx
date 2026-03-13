import { FileUpload } from '@ark-ui/react/file-upload';
import {
  IconLoader2,
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useDirectUpload, type StagedFile } from '@/hooks/useDirectUpload';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

function FileStatusIcon({ status }: { status: StagedFile['status'] }) {
  switch (status) {
    case 'uploading':
      return <IconLoader2 size={14} className="animate-spin text-primary" />;
    case 'done':
      return <IconCheck size={14} className="text-green-500" />;
    case 'error':
      return <IconAlertCircle size={14} className="text-destructive" />;
    default:
      return null;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadTabPanelProps {
  projectId: string;
  onUploadComplete: () => void;
}

export function UploadTabPanel({ projectId, onUploadComplete }: UploadTabPanelProps) {
  const {
    files: stagedFiles,
    uploadStatus,
    pendingCount,
    addFiles,
    removeFile,
    clearDone,
    startUpload,
  } = useDirectUpload(projectId);

  useEffect(() => {
    if (uploadStatus === 'done') onUploadComplete();
  }, [uploadStatus, onUploadComplete]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      <FileUpload.Root
        maxFiles={25}
        accept={{
          'text/*': ['.md', '.markdown', '.txt', '.csv', '.html', '.htm', '.rst', '.org'],
          'application/pdf': ['.pdf'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
          'application/vnd.oasis.opendocument.text': ['.odt'],
          'application/epub+zip': ['.epub'],
          'application/rtf': ['.rtf'],
          'application/x-tex': ['.tex', '.latex'],
        }}
        onFileChange={(details) => addFiles(details.acceptedFiles)}
        className="flex flex-col gap-0"
      >
        <FileUpload.Dropzone
          className={cn(
            'flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-center',
            'cursor-pointer transition-colors duration-150',
            'hover:bg-muted/50',
            'data-dragging:border-primary data-dragging:border-solid data-dragging:bg-primary/5',
          )}
        >
          <IconUpload size={32} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Drag files here or click to browse
          </span>
          <span className="text-xs text-muted-foreground">
            MD, TXT, CSV, HTML, RST, PDF, DOCX, XLSX, PPTX, ODT, EPUB, RTF, TEX, ORG
          </span>
        </FileUpload.Dropzone>
        <FileUpload.HiddenInput />
      </FileUpload.Root>

      {pendingCount > 0 && uploadStatus !== 'uploading' && (
        <button
          type="button"
          onClick={() => void startUpload()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Upload {pendingCount} file{pendingCount === 1 ? '' : 's'}
        </button>
      )}

      {uploadStatus === 'done' && stagedFiles.some((f) => f.status === 'done') && (
        <button
          type="button"
          onClick={clearDone}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Clear completed
        </button>
      )}

      {stagedFiles.length > 0 && (
        <ScrollArea className="min-h-0 flex-1" viewportClass="h-full overflow-auto">
          <ul className="flex flex-col">
            {stagedFiles.map((sf) => (
              <li
                key={sf.id}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b border-border px-1 py-1.5',
                  sf.status === 'error' && 'bg-destructive/5',
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <IconFile size={14} className="flex-none text-muted-foreground" />
                  <div className="min-w-0">
                    <span className="block truncate text-xs text-foreground">{sf.file.name}</span>
                    {sf.status === 'error' && sf.error && (
                      <span className="block truncate text-[10px] text-destructive">{sf.error}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatSize(sf.file.size)}
                </span>
                <FileStatusIcon status={sf.status} />
                {sf.status !== 'uploading' && (
                  <button
                    type="button"
                    onClick={() => removeFile(sf.id)}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                    aria-label={`Remove ${sf.file.name}`}
                  >
                    <IconX size={12} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
