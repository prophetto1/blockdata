import { useState } from 'react';
import type { PipelineSource, RuntimeProbeRun } from '@/lib/pipelineService';

function formatBytes(value?: number) {
  if (!value || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 10) return `${kb.toFixed(2)} KB`;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 10) return `${mb.toFixed(2)} MB`;
  return `${mb.toFixed(1)} MB`;
}

export function IndexJobFilesTab({
  sources,
  selectedSourceUids,
  sourcesLoading,
  sourcesError,
  browserUploadProbeRun,
  onToggleSource,
  onUpload,
  onRemoveSource,
}: {
  sources: PipelineSource[];
  selectedSourceUids: string[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  browserUploadProbeRun?: RuntimeProbeRun | null;
  onToggleSource: (sourceUid: string) => void;
  onUpload: (files: File[]) => Promise<void>;
  onRemoveSource: (sourceUid: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedSources = sources.filter((source) => selectedSourceUids.includes(source.source_uid));
  const totalSize = selectedSources.reduce((sum, source) => sum + (source.byte_size ?? 0), 0);
  const proofSourceId = typeof browserUploadProbeRun?.evidence?.pipeline_source_id === 'string'
    ? browserUploadProbeRun.evidence.pipeline_source_id
    : null;

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const mdFiles = Array.from(fileList).filter(
      (file) => file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.type === 'text/markdown',
    );
    if (mdFiles.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    onUpload(mdFiles)
      .catch((error) => {
        setUploadError(error instanceof Error ? error.message : 'Upload failed.');
      })
      .finally(() => setIsUploading(false));
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
      <div className="space-y-4">
        {browserUploadProbeRun ? (
          <div className={`rounded-md border px-3 py-2 text-sm ${
            browserUploadProbeRun.result === 'ok'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}>
            <div className="font-medium">
              {browserUploadProbeRun.result === 'ok'
                ? 'Latest backend upload proof verified pipeline source registration.'
                : (browserUploadProbeRun.failure_reason ?? 'The latest backend upload proof failed.')}
            </div>
            {proofSourceId ? (
              <div className="mt-1 text-xs opacity-90">
                Pipeline source registered: {proofSourceId}
              </div>
            ) : null}
          </div>
        ) : null}

        <label
          htmlFor="index-job-file-input"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            addFiles(event.dataTransfer.files);
          }}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? 'border-primary/50 bg-primary/5'
              : 'border-border bg-background/40 hover:bg-background/60'
          }`}
        >
          <span className="text-sm font-medium text-foreground">
            Drop markdown files here
          </span>
          <span className="text-xs text-muted-foreground">
            or click to browse
          </span>
          <span className="text-[11px] text-muted-foreground">
            Accepted: .md, .markdown
          </span>
          <input
            id="index-job-file-input"
            type="file"
            multiple
            accept=".md,.markdown,text/markdown"
            onChange={(event) => {
              addFiles(event.currentTarget.files);
              event.currentTarget.value = '';
            }}
            className="sr-only"
          />
        </label>

        {isUploading ? (
          <div className="text-sm text-muted-foreground">Uploading...</div>
        ) : null}
        {uploadError ? (
          <div className="text-sm text-destructive">{uploadError}</div>
        ) : null}

        {sourcesLoading ? (
          <div className="text-sm text-muted-foreground">Loading files...</div>
        ) : null}
        {sourcesError ? (
          <div className="text-sm text-destructive">{sourcesError}</div>
        ) : null}

        {!sourcesLoading && sources.length > 0 ? (
          <div className="overflow-hidden rounded-md border border-border/60 bg-background/40">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-background/80 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-24 px-3 py-2 font-medium">Include</th>
                  <th className="px-3 py-2 font-medium">Filename</th>
                  <th className="w-28 px-3 py-2 font-medium">Size</th>
                  <th className="w-28 px-3 py-2 font-medium">State</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const isSelected = selectedSourceUids.includes(source.source_uid);
                  return (
                    <tr
                      key={source.source_uid}
                      className={isSelected ? 'bg-primary/5' : 'bg-transparent'}
                    >
                      <td className="px-3 py-2 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSource(source.source_uid)}
                          aria-label={`Include ${source.doc_title}`}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{source.doc_title}</div>
                          <div className="text-xs text-muted-foreground">
                            {isSelected ? 'Included in this job' : 'Available in this project'}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-xs text-muted-foreground">
                        {formatBytes(source.byte_size)}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {isSelected ? (
                          <button
                            type="button"
                            onClick={() => onRemoveSource(source.source_uid)}
                            className="text-xs font-medium text-muted-foreground hover:text-destructive"
                            aria-label={`Remove ${source.doc_title}`}
                          >
                            Remove
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Available</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {selectedSourceUids.length > 0 ? (
          <div className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
            <span>{selectedSourceUids.length} file{selectedSourceUids.length === 1 ? '' : 's'} selected</span>
            <span>Total size: {formatBytes(totalSize)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
