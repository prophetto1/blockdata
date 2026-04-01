import { useState } from 'react';
import type { PipelineSource } from '@/lib/pipelineService';

function formatBytes(value?: number) {
  if (!value || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function IndexJobFilesTab({
  sources,
  selectedSourceUids,
  sourcesLoading,
  sourcesError,
  onToggleSource,
  onUpload,
  onRemoveSource,
}: {
  sources: PipelineSource[];
  selectedSourceUids: string[];
  sourcesLoading: boolean;
  sourcesError: string | null;
  onToggleSource: (sourceUid: string) => void;
  onUpload: (files: File[]) => Promise<void>;
  onRemoveSource: (sourceUid: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const selectedSources = sources.filter((s) => selectedSourceUids.includes(s.source_uid));
  const totalSize = selectedSources.reduce((sum, s) => sum + (s.byte_size ?? 0), 0);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const mdFiles = Array.from(fileList).filter(
      (f) => f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.type === 'text/markdown',
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
        {/* Drop zone */}
        <label
          htmlFor="index-job-file-input"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            addFiles(e.dataTransfer.files);
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
            onChange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ''; }}
            className="sr-only"
          />
        </label>

        {isUploading ? (
          <div className="text-sm text-muted-foreground">Uploading...</div>
        ) : null}
        {uploadError ? (
          <div className="text-sm text-destructive">{uploadError}</div>
        ) : null}

        {/* Source loading / error */}
        {sourcesLoading ? (
          <div className="text-sm text-muted-foreground">Loading files...</div>
        ) : null}
        {sourcesError ? (
          <div className="text-sm text-destructive">{sourcesError}</div>
        ) : null}

        {/* File list */}
        {!sourcesLoading && sources.length > 0 ? (
          <div className="space-y-1">
            {sources.map((source) => {
              const isSelected = selectedSourceUids.includes(source.source_uid);
              return (
                <div
                  key={source.source_uid}
                  className={`flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 ${
                    isSelected
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border/60 bg-background/40'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleSource(source.source_uid)}
                      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40 bg-background hover:border-primary/60'
                      }`}
                      aria-label={isSelected ? `Deselect ${source.doc_title}` : `Select ${source.doc_title}`}
                    >
                      {isSelected ? (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </button>
                    <span className="min-w-0 truncate text-xs text-foreground">{source.doc_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatBytes(source.byte_size)}
                    </span>
                    {isSelected ? (
                      <button
                        type="button"
                        onClick={() => onRemoveSource(source.source_uid)}
                        className="shrink-0 text-[10px] text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${source.doc_title}`}
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Footer summary */}
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
