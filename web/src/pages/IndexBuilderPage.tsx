import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useShellHeaderTitle } from '@/components/common/useShellHeaderTitle';
import { Button } from '@/components/ui/button';
import { PipelineRunsTable } from '@/components/pipelines/PipelineRunsTable';
import {
  PipelineRunDetailPanel,
  type PipelineRunDetailData,
} from '@/components/pipelines/PipelineRunDetailPanel';
import { PipelineNewRunForm } from '@/components/pipelines/PipelineNewRunForm';

/* ------------------------------------------------------------------ */
/*  Mock data — replace with real API wiring later                     */
/* ------------------------------------------------------------------ */

const MOCK_RUNS_FULL: PipelineRunDetailData[] = [
  {
    job_id: 'job-001',
    label: 'Legal corpus v2',
    status: 'complete',
    created_at: '2026-03-30T14:22:00Z',
    stage: 'packaging',
    section_count: 47,
    chunk_count: 312,
    deliverables: [
      { deliverable_kind: 'lexical_sqlite', filename: 'asset.lexical.sqlite' },
      { deliverable_kind: 'semantic_zip', filename: 'asset.semantic.zip' },
    ],
  },
  {
    job_id: 'job-002',
    label: 'Onboarding docs',
    status: 'running',
    created_at: '2026-03-30T15:01:00Z',
    stage: 'embedding',
    deliverables: [],
  },
  {
    job_id: 'job-003',
    label: 'API reference batch',
    status: 'failed',
    created_at: '2026-03-30T12:45:00Z',
    stage: 'embedding',
    failure_stage: 'embedding',
    error_message: 'Embedding API returned 401: invalid API key.',
    deliverables: [],
  },
  {
    job_id: 'job-004',
    label: 'Internal wiki export',
    status: 'queued',
    created_at: '2026-03-30T15:10:00Z',
    stage: 'loading_sources',
    deliverables: [],
  },
  {
    job_id: 'job-005',
    label: 'Compliance handbook',
    status: 'draft',
    created_at: '2026-03-30T15:30:00Z',
    stage: '',
    deliverables: [],
    files: [
      { source_uid: 'src-a', filename: 'handbook-part1.md', byte_size: 24576 },
      { source_uid: 'src-b', filename: 'handbook-part2.md', byte_size: 18432 },
      { source_uid: 'src-c', filename: 'appendix-a.md', byte_size: 8192 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type RightPanelState =
  | { mode: 'empty' }
  | { mode: 'new-run' }
  | { mode: 'detail'; jobId: string };

export default function IndexBuilderPage() {
  useShellHeaderTitle({ breadcrumbs: ['Pipeline Services', 'Index Builder'] });

  const [rightPanel, setRightPanel] = useState<RightPanelState>({ mode: 'empty' });
  const selectedJobId = rightPanel.mode === 'detail' ? rightPanel.jobId : null;

  const selectedRun = selectedJobId
    ? MOCK_RUNS_FULL.find((r) => r.job_id === selectedJobId) ?? null
    : null;

  return (
    <div className="flex h-full min-h-0 gap-3 p-3">
      {/* Left column — 34% */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border bg-card">
        {rightPanel.mode === 'empty' ? (
          <div className="flex flex-1 flex-col px-5 py-6">
            <h3 className="text-base font-semibold text-foreground">Index Builder</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Upload owned markdown documents, lock them into an ordered processing set, and queue
              a backend job that consolidates, structures, and packages retrieval-ready artifacts.
              Each completed run produces a lexical SQLite index and a semantic embeddings archive
              for downstream search and RAG workflows.
            </p>
            <dl className="mt-4 space-y-2 text-xs">
              <div>
                <dt className="font-medium text-muted-foreground">Outputs</dt>
                <dd className="mt-0.5 text-foreground">SQLite full-text index + semantic embeddings archive</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Source types</dt>
                <dd className="mt-0.5 text-foreground">Markdown (.md, .markdown)</dd>
              </div>
            </dl>
            <div className="mt-6">
              <Button type="button" size="sm" onClick={() => setRightPanel({ mode: 'new-run' })}>
                <IconPlus size={14} />
                New Run
              </Button>
            </div>
          </div>
        ) : null}

        {rightPanel.mode === 'new-run' ? (
          <PipelineNewRunForm
            onSave={(label, files) => {
              // wiring TBD — would upload files, create source set as draft, add row to table
              console.log('Save draft:', label, files);
            }}
          />
        ) : null}

        {rightPanel.mode === 'detail' && selectedRun ? (
          <PipelineRunDetailPanel
            run={selectedRun}
            onStart={() => {
              // wiring TBD — would create job from draft source set
              console.log('Start run:', selectedRun.job_id);
            }}
          />
        ) : null}
      </div>

      {/* Right column — 66% */}
      <div className="flex min-h-0 min-w-0 flex-[2] flex-col">
        <PipelineRunsTable
          runs={MOCK_RUNS_FULL}
          selectedJobId={selectedJobId}
          onSelectRun={(jobId) => setRightPanel({ mode: 'detail', jobId })}
        />
      </div>
    </div>
  );
}
