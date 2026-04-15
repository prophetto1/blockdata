import { useMemo, useState } from 'react';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { BlockViewerGridRDG } from '@/components/blocks/BlockViewerGridRDG';
import { useRuns } from '@/hooks/useRuns';
import type { RunWithSchema } from '@/lib/types';

// ============================================================================
// DEMO MOCK - DELETE-ME-BLOCK-START
// Delete this block (+ the "Load demo mock" button below) to remove mock mode.
// ============================================================================
const DEMO_MOCK_CONV_UID = '__demo_mock_conv__';
const DEMO_MOCK_RUN: RunWithSchema = {
  run_id: '__demo_mock_run__',
  owner_id: '__demo_mock_owner__',
  conv_uid: DEMO_MOCK_CONV_UID,
  schema_id: '__demo_mock_schema__',
  status: 'complete',
  total_blocks: 0,
  completed_blocks: 0,
  failed_blocks: 0,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  model_config: null,
  schemas: {
    schema_ref: 'demo/mock',
    schema_uid: '__demo_mock_schema_uid__',
    schema_jsonb: { fields: [] },
  },
};
// DEMO MOCK - DELETE-ME-BLOCK-END =============================================

export function Component() {
  const [convInput, setConvInput] = useState('');
  const [convUid, setConvUid] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [mockRun, setMockRun] = useState<RunWithSchema | null>(null); // DEMO MOCK

  const { runs, loading, error } = useRuns(convUid || null);

  const selectedRun = useMemo(
    () => mockRun ?? runs.find((r) => r.run_id === selectedRunId) ?? null,
    [mockRun, runs, selectedRunId],
  );

  return (
    <WorkbenchPage
      eyebrow="DEMO"
      title="Block Viewer Grid (demo)"
      description="Wired demo surface for BlockViewerGridRDG. Paste a conversation UID, then pick a run."
      hideHeader
      contentClassName="gap-4 p-0 md:p-0"
    >
      <div
        data-testid="block-viewer-grid-page-content"
        className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-3"
      >
        <div
          data-testid="block-viewer-grid-controls"
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card/50 p-4"
        >
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.16em]">Conversation UID</span>
            <input
              type="text"
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              placeholder="paste conv_uid..."
              className="min-w-[320px] rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => { setConvUid(convInput.trim()); setSelectedRunId(null); setMockRun(null); }}
            className="rounded-md border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Load runs
          </button>
          {/* DEMO MOCK - DELETE-ME-BUTTON-START */}
          <button
            type="button"
            onClick={() => {
              setConvInput(DEMO_MOCK_CONV_UID);
              setConvUid(DEMO_MOCK_CONV_UID);
              setSelectedRunId(DEMO_MOCK_RUN.run_id);
              setMockRun(DEMO_MOCK_RUN);
            }}
            className="rounded-md border border-dashed border-amber-500/70 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-500/20"
          >
            Load demo mock
          </button>
          {/* DEMO MOCK - DELETE-ME-BUTTON-END */}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.16em]">Run</span>
            <select
              value={selectedRunId ?? ''}
              onChange={(e) => setSelectedRunId(e.target.value || null)}
              disabled={!convUid || runs.length === 0}
              className="min-w-[320px] rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
            >
              <option value="">{loading ? 'Loading runs...' : runs.length === 0 ? 'No runs' : 'Select run'}</option>
              {runs.map((r) => (
                <option key={r.run_id} value={r.run_id}>
                  {r.run_id} {r.started_at ? `- ${new Date(r.started_at).toLocaleString()}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <ErrorAlert message={error} /> : null}

        {convUid && selectedRun ? (
          <BlockViewerGridRDG
            convUid={convUid}
            selectedRunId={selectedRunId}
            selectedRun={selectedRun}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/30 p-8 text-center text-sm text-muted-foreground">
            {!convUid
              ? 'Enter a conversation UID and click Load runs.'
              : 'Pick a run from the dropdown to render the grid.'}
          </div>
        )}
      </div>
    </WorkbenchPage>
  );
}
