import { FileUpload } from '@ark-ui/react/file-upload';
import {
  IconLoader2,
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconBrandGoogleDrive,
  IconBrandDropbox,
  IconDatabase,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDirectUpload, type StagedFile } from '@/hooks/useDirectUpload';
import { useGoogleDrivePicker } from '@/hooks/useGoogleDrivePicker';
import { useDropboxChooser } from '@/hooks/useDropboxChooser';
import { edgeJson } from '@/lib/edge';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { UploadSourceCards, type UploadSource } from './UploadSourceCards';

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
  const [uploadSource, setUploadSource] = useState<UploadSource>('local');

  const {
    files: stagedFiles,
    uploadStatus,
    pendingCount,
    addFiles,
    removeFile,
    clearDone,
    startUpload,
  } = useDirectUpload(projectId);

  // Use a ref so the effect only fires on uploadStatus transitions, not when
  // the callback prop changes reference (which loops when it's an inline arrow).
  const onCompleteRef = useRef(onUploadComplete);
  onCompleteRef.current = onUploadComplete;
  useEffect(() => {
    if (uploadStatus === 'done') onCompleteRef.current();
  }, [uploadStatus]);

  // Google Drive import
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const { openPicker, isReady: pickerReady } = useGoogleDrivePicker({
    onFilesSelected: async (files, accessToken) => {
      setImporting(true);
      setImportError(null);
      try {
        const result = await edgeJson<{
          results: Array<{ file_id: string; status: string; error?: string }>;
        }>('google-drive-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            google_access_token: accessToken,
            files,
            ingest_mode: 'upload_only',
          }),
        });
        const failures = result.results.filter((r) => r.status === 'error');
        if (failures.length > 0) {
          setImportError(`${failures.length} file(s) failed to import`);
        }
        onUploadComplete();
      } catch (e) {
        setImportError(e instanceof Error ? e.message : 'Import failed');
      } finally {
        setImporting(false);
      }
    },
  });

  // Dropbox import
  const [dropboxImporting, setDropboxImporting] = useState(false);

  const { openChooser, isReady: dropboxReady } = useDropboxChooser({
    onFilesSelected: async (files) => {
      setDropboxImporting(true);
      setImportError(null);
      try {
        const result = await edgeJson<{
          results: Array<{ file_id: string; status: string; error?: string }>;
        }>('dropbox-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId,
            files,
            ingest_mode: 'upload_only',
          }),
        });
        const failures = result.results.filter((r) => r.status === 'error');
        if (failures.length > 0) {
          setImportError(`${failures.length} file(s) failed to import`);
        }
        onUploadComplete();
      } catch (e) {
        setImportError(e instanceof Error ? e.message : 'Import failed');
      } finally {
        setDropboxImporting(false);
      }
    },
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden p-4">
      {/* Source selection cards */}
      <UploadSourceCards value={uploadSource} onValueChange={setUploadSource} />

      {/* Local file upload */}
      {uploadSource === 'local' && (
        <>
          <FileUpload.Root
            maxFiles={25}
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
                Any file format
              </span>
            </FileUpload.Dropzone>
            <FileUpload.HiddenInput />
          </FileUpload.Root>

          {pendingCount > 0 && uploadStatus !== 'uploading' && (
            <Button size="sm" onClick={() => void startUpload()}>
              Upload {pendingCount} file{pendingCount === 1 ? '' : 's'}
            </Button>
          )}

          {uploadStatus === 'done' && stagedFiles.some((f) => f.status === 'done') && (
            <Button variant="outline" size="sm" onClick={clearDone}>
              Clear completed
            </Button>
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
        </>
      )}

      {/* Cloud storage */}
      {uploadSource === 'cloud' && (
        <div className="flex flex-col gap-3">
          {pickerReady && (
            <Button
              variant="outline"
              size="sm"
              onClick={openPicker}
              disabled={importing}
              className="h-9 justify-start gap-2 text-sm"
            >
              {importing ? (
                <IconLoader2 size={16} className="animate-spin" />
              ) : (
                <IconBrandGoogleDrive size={16} />
              )}
              {importing ? 'Importing\u2026' : 'Google Drive'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={dropboxReady ? openChooser : undefined}
            disabled={!dropboxReady || dropboxImporting}
            className="h-9 justify-start gap-2 text-sm"
          >
            {dropboxImporting ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconBrandDropbox size={16} />
            )}
            {dropboxImporting ? 'Importing\u2026' : 'Dropbox'}
            {!dropboxReady && (
              <span className="ml-auto text-[10px] font-normal text-muted-foreground">Not configured</span>
            )}
          </Button>

          {!pickerReady && !dropboxReady && (
            <p className="text-xs text-muted-foreground">
              Configure cloud storage credentials to enable imports.
            </p>
          )}

          {importError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              {importError}
            </div>
          )}
        </div>
      )}

      {/* Database */}
      {uploadSource === 'database' && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-6 text-center">
          <IconDatabase size={28} className="text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Database Import</span>
          <span className="text-xs text-muted-foreground">
            Connect to a database to import structured records. Coming soon.
          </span>
        </div>
      )}
    </div>
  );
}
