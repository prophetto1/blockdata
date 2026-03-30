import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { PipelineServiceViewModel } from './PipelineCatalogPanel';

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function PipelineUploadPanel({
  service,
  projectId,
  onUpload,
}: {
  service: PipelineServiceViewModel;
  projectId: string | null;
  onUpload: (files: File[]) => Promise<void>;
}) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const readySummary = useMemo(() => {
    if (pendingFiles.length === 0) return null;
    return `${pendingFiles.length} file${pendingFiles.length === 1 ? '' : 's'} ready for upload.`;
  }, [pendingFiles]);

  async function handleUpload() {
    if (pendingFiles.length === 0) return;
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadNotice(null);
      await onUpload(pendingFiles);
      setUploadNotice('Upload complete.');
    } catch (error) {
      setUploadError(toErrorMessage(error, 'Unable to upload the selected markdown files.'));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-6 shadow-sm">
      <div className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Pipeline Service
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {service.label}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {service.description}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-background/70 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Pipeline kind
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">{service.pipelineKind}</div>
          </article>
          <article className="rounded-xl border border-border bg-background/70 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Deliverables
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">
              {service.deliverableKinds.join(', ')}
            </div>
          </article>
          <article className="rounded-xl border border-border bg-background/70 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Source types
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">
              {service.eligibleSourceTypes.join(', ')}
            </div>
          </article>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-foreground">Upload</h2>
            <div className="text-sm text-muted-foreground">
              Upload stays manual in this phase and does not auto-start processing.
            </div>
          </div>

          <label
            htmlFor="pipeline-upload-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/70 px-6 py-10 text-center"
          >
            <div className="text-sm font-medium text-foreground">
              Drop markdown files here or click to upload
            </div>
            <div className="text-sm text-muted-foreground">
              Markdown only: `.md`, `.markdown`, or `text/markdown`
            </div>
            <input
              id="pipeline-upload-input"
              aria-label="Add markdown files"
              type="file"
              multiple
              accept=".md,.markdown,text/markdown"
              onChange={(event) => {
                setPendingFiles(Array.from(event.currentTarget.files ?? []));
                setUploadNotice(null);
                setUploadError(null);
              }}
              className="sr-only"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/60 px-4 py-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                {readySummary ?? 'No files selected yet.'}
              </div>
              <div className="text-xs text-muted-foreground">
                {projectId
                  ? 'Upload several markdown files now, then compose the processing set below.'
                  : 'Select a project before uploading markdown files.'}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => { void handleUpload(); }}
              disabled={!projectId || pendingFiles.length === 0 || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload files'}
            </Button>
          </div>

          {pendingFiles.length > 0 ? (
            <div className="rounded-xl border border-border bg-background/40 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Ready to upload
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                {pendingFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3">
                    <span>{file.name}</span>
                    <span className="text-xs text-muted-foreground">{file.type || 'text/markdown'}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {uploadNotice ? <div className="text-sm text-foreground">{uploadNotice}</div> : null}
          {uploadError ? <div className="text-sm text-destructive">{uploadError}</div> : null}
        </div>
      </div>
    </section>
  );
}
