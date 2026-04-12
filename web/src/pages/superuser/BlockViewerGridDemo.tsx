import { useMemo, useState } from 'react';
import { WorkbenchPage } from '@/components/common/WorkbenchPage';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { BlockViewerGridRDG } from '@/components/blocks/BlockViewerGridRDG';
import { useRuns } from '@/hooks/useRuns';

export default function BlockViewerGridDemo() {
  const [convInput, setConvInput] = useState('');
  const [convUid, setConvUid] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { runs, loading, error } = useRuns(convUid || null);

  const selectedRun = useMemo(
    () => runs.find((r) => r.run_id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  return (
    <WorkbenchPage
      eyebrow="DEMO"
      title="Block Viewer Grid (demo)"
      description="Wired demo surface for BlockViewerGridRDG. Paste a conversation UID, then pick a run."
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/70 bg-card/50 p-4">
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
            onClick={() => { setConvUid(convInput.trim()); setSelectedRunId(null); }}
            className="rounded-md border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Load runs
          </button>
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
