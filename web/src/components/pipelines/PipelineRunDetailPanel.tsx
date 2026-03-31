import { useState } from 'react';
import { IconDownload, IconUpload, IconSettings } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import type { PipelineRunRow } from './PipelineRunsTable';

/* ------------------------------------------------------------------ */
/*  Stage definitions                                                  */
/* ------------------------------------------------------------------ */

const STAGES = [
  { value: 'loading_sources', label: 'Loading sources' },
  { value: 'consolidating', label: 'Consolidating' },
  { value: 'parsing', label: 'Parsing' },
  { value: 'normalizing', label: 'Normalizing' },
  { value: 'structuring', label: 'Structuring' },
  { value: 'chunking', label: 'Chunking' },
  { value: 'lexical_indexing', label: 'Lexical indexing' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'packaging', label: 'Packaging' },
] as const;

type StageState = 'pending' | 'active' | 'done' | 'failed';

function resolveStageState(
  run: PipelineRunDetailData,
  stageValue: string,
): StageState {
  const currentStage = run.status === 'failed'
    ? (run.failure_stage ?? run.stage)
    : run.stage;
  const currentIdx = STAGES.findIndex((s) => s.value === currentStage);
  const stageIdx = STAGES.findIndex((s) => s.value === stageValue);

  if (run.status === 'complete') return 'done';
  if (currentIdx === -1 || stageIdx === -1) return 'pending';
  if (run.status === 'failed') {
    if (stageIdx < currentIdx) return 'done';
    if (stageIdx === currentIdx) return 'failed';
    return 'pending';
  }
  if (stageIdx < currentIdx) return 'done';
  if (stageIdx === currentIdx) return 'active';
  return 'pending';
}

function stageBg(state: StageState) {
  if (state === 'done') return 'border-emerald-500/30 bg-emerald-500/8';
  if (state === 'active') return 'border-sky-500/30 bg-sky-500/8';
  if (state === 'failed') return 'border-destructive/30 bg-destructive/8';
  return 'border-border/60 bg-background/40';
}

function stageLabel(state: StageState) {
  if (state === 'done') return 'done';
  if (state === 'active') return 'in progress';
  if (state === 'failed') return 'failed';
  return 'pending';
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PipelineRunFile = {
  source_uid: string;
  filename: string;
  byte_size: number;
};

export type PipelineRunDetailData = PipelineRunRow & {
  stage: string;
  failure_stage?: string | null;
  error_message?: string | null;
  section_count?: number | null;
  chunk_count?: number | null;
  files?: PipelineRunFile[];
};

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: PipelineRunRow['status'] }) {
  const styles: Record<PipelineRunRow['status'], string> = {
    queued: 'bg-muted/60 text-muted-foreground',
    running: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
    complete: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    failed: 'bg-destructive/15 text-destructive',
    draft: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

type DraftTab = 'files' | 'config';

/* ------------------------------------------------------------------ */
/*  Draft view — files + config toggle                                 */
/* ------------------------------------------------------------------ */

function DraftView({
  run,
  onStart,
}: {
  run: PipelineRunDetailData;
  onStart: () => void;
}) {
  const [activeTab, setActiveTab] = useState<DraftTab>('files');
  const [dragOver, setDragOver] = useState(false);

  return (
    <>
      {/* Tab toggle */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab('files')}
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'files'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <IconUpload size={13} />
          Files
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'config'
              ? 'border-b-2 border-primary text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <IconSettings size={13} />
          Config
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'files' ? (
          <div className="space-y-3">
            {/* Drop zone for adding more files */}
            <label
              htmlFor="draft-file-input"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                // add files wiring TBD
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-4 text-center transition-colors ${
                dragOver
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-background/40 hover:bg-background/60'
              }`}
            >
              <span className="text-xs font-medium text-foreground">
                Drop .md files or click to add
              </span>
              <input
                id="draft-file-input"
                type="file"
                multiple
                accept=".md,.markdown,text/markdown"
                onChange={() => { /* wiring TBD */ }}
                className="sr-only"
              />
            </label>

            {/* Uploaded files list */}
            {run.files && run.files.length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {run.files.length} file{run.files.length === 1 ? '' : 's'} uploaded
                </div>
                <ul className="space-y-1">
                  {run.files.map((file) => (
                    <li
                      key={file.source_uid}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                    >
                      <span className="min-w-0 truncate text-xs text-foreground">{file.filename}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {(file.byte_size / 1024).toFixed(1)}KB
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No files uploaded yet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Pipeline configuration for this run.
            </p>
            {/* Config fields will go here as needed per pipeline kind */}
            <div className="rounded-md border border-dashed border-border bg-background/40 px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground">
                Default settings — no configuration required.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer — Start button */}
      <div className="border-t border-border px-4 py-3">
        <Button
          type="button"
          className="w-full"
          disabled={!run.files || run.files.length === 0}
          onClick={onStart}
        >
          Start
        </Button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Job view — progress, errors, stats, outputs                        */
/* ------------------------------------------------------------------ */

function JobView({ run }: { run: PipelineRunDetailData }) {
  return (
    <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Progress
      </h4>
      <div className="space-y-1.5">
        {STAGES.map((stage) => {
          const state = resolveStageState(run, stage.value);
          return (
            <div
              key={stage.value}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${stageBg(state)}`}
            >
              <span className="text-xs font-medium text-foreground">{stage.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stageLabel(state)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {run.status === 'failed' && run.error_message ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-medium text-destructive">
            Failed at: {run.failure_stage ?? run.stage}
          </p>
          <p className="mt-1 text-xs text-destructive/80">{run.error_message}</p>
        </div>
      ) : null}

      {/* Stats */}
      {run.status === 'complete' && (run.section_count != null || run.chunk_count != null) ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {run.section_count != null ? (
            <div className="rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sections</div>
              <div className="mt-1 text-sm font-medium text-foreground">{run.section_count}</div>
            </div>
          ) : null}
          {run.chunk_count != null ? (
            <div className="rounded-md border border-border bg-background/60 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Chunks</div>
              <div className="mt-1 text-sm font-medium text-foreground">{run.chunk_count}</div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Outputs */}
      {run.status === 'complete' && run.deliverables.length > 0 ? (
        <div className="mt-3 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Outputs
          </h4>
          {run.deliverables.map((d) => (
            <button
              key={d.deliverable_kind}
              type="button"
              onClick={() => {
                // download wiring TBD
              }}
              className="flex w-full items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-left transition-colors hover:bg-accent/30"
            >
              <IconDownload size={14} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-foreground">{d.filename}</div>
                <div className="text-[10px] text-muted-foreground">{d.deliverable_kind}</div>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

export function PipelineRunDetailPanel({
  run,
  onStart,
}: {
  run: PipelineRunDetailData;
  onStart?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Run header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{run.label}</h3>
          <StatusBadge status={run.status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {new Date(run.created_at).toLocaleString()}
        </p>
      </div>

      {/* Body — draft view or job view */}
      {run.status === 'draft' ? (
        <DraftView run={run} onStart={onStart ?? (() => {})} />
      ) : (
        <JobView run={run} />
      )}
    </div>
  );
}