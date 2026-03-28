import { useMemo, useState } from 'react';
import type { PipelineSource } from '@/lib/pipelineService';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import type { PipelineServiceViewModel } from './PipelineCatalogPanel';

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function PipelineUploadPanel({
  service,
  projectId,
  sources,
  sourcesLoading,
  sourcesError,
  selectedSourceUid,
  onSelectSource,
  onTrigger,
  onUpload,
  isTriggering,
}: {
  service: PipelineServiceViewModel;
  projectId: string | null;
  sources: PipelineSource[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  selectedSourceUid: string | null;
  onSelectSource: (sourceUid: string) => void;
  onTrigger: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  isTriggering: boolean;
}) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const options = useMemo(() => {
    const base = [{ value: '', label: 'Select an owned markdown source', disabled: sources.length === 0 }];
    return base.concat(
      sources.map((source) => ({
        value: source.source_uid,
        label: source.doc_title,
      })),
    );
  }, [sources]);

  async function handleUpload() {
    if (!pendingFile) return;
    try {
      setIsUploading(true);
      setUploadError(null);
      setUploadNotice(null);
      await onUpload(pendingFile);
      setUploadNotice('Upload complete.');
      setPendingFile(null);
    } catch (error) {
      setUploadError(toErrorMessage(error, 'Unable to upload the selected markdown file.'));
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

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <label htmlFor="pipeline-upload-input" className="text-sm font-medium text-foreground">
              Upload markdown source
            </label>
            <input
              id="pipeline-upload-input"
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={(event) => {
                setPendingFile(event.currentTarget.files?.[0] ?? null);
                setUploadNotice(null);
                setUploadError(null);
              }}
              className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <div className="text-sm text-muted-foreground">
              Upload stays manual in this phase and does not auto-start processing.
            </div>
            <Button
              type="button"
              onClick={() => { void handleUpload(); }}
              disabled={!projectId || !pendingFile || isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload file'}
            </Button>
            {!projectId ? (
              <div className="text-sm text-muted-foreground">Select a project to upload or process sources.</div>
            ) : null}
            {uploadNotice ? <div className="text-sm text-foreground">{uploadNotice}</div> : null}
            {uploadError ? <div className="text-sm text-destructive">{uploadError}</div> : null}
          </div>

          <div className="space-y-3">
            <label htmlFor="pipeline-owned-source" className="text-sm font-medium text-foreground">
              Owned markdown source
            </label>
            <NativeSelect
              id="pipeline-owned-source"
              aria-label="Owned markdown source"
              value={selectedSourceUid ?? ''}
              onChange={(event) => onSelectSource(event.currentTarget.value)}
              options={options}
            />
            {sourcesLoading ? <div className="text-sm text-muted-foreground">Loading owned markdown sources...</div> : null}
            {!sourcesLoading && sources.length === 0 ? (
              <div className="text-sm text-muted-foreground">No owned markdown sources are available yet.</div>
            ) : null}
            {sourcesError ? <div className="text-sm text-destructive">{sourcesError}</div> : null}
            <Button
              type="button"
              onClick={() => { void onTrigger(); }}
              disabled={!projectId || !selectedSourceUid || isTriggering}
            >
              {isTriggering ? 'Starting...' : 'Start processing'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
