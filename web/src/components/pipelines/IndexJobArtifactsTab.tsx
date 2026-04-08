import { Button } from '@/components/ui/button';
import type { PipelineDeliverable, PipelineJob, RuntimeProbeRun } from '@/lib/pipelineService';

function formatBytes(value: number | undefined) {
  if (!value || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatTimestamp(iso: string | undefined) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function IndexJobArtifactsTab({
  job,
  onDownload,
  downloadError,
  downloadingKind,
  jobExecutionProbeRun,
}: {
  job: PipelineJob | null;
  onDownload: (deliverable: PipelineDeliverable) => Promise<void>;
  downloadError: string | null;
  downloadingKind: string | null;
  jobExecutionProbeRun?: RuntimeProbeRun | null;
}) {
  const verifiedDeliverableKind = typeof jobExecutionProbeRun?.evidence?.deliverable_kind === 'string'
    ? jobExecutionProbeRun.evidence.deliverable_kind
    : null;

  const proofBanner = jobExecutionProbeRun ? (
    <div className={`rounded-md border px-3 py-2 text-sm ${
      jobExecutionProbeRun.result === 'ok'
        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
        : 'border-destructive/30 bg-destructive/10 text-destructive'
    }`}>
      <div className="font-medium">
        {jobExecutionProbeRun.result === 'ok'
          ? 'Latest backend job proof verified deliverable download.'
          : (jobExecutionProbeRun.failure_reason ?? 'The latest backend job proof failed.')}
      </div>
      {verifiedDeliverableKind ? (
        <div className="mt-1 text-xs opacity-90">
          Deliverable download verified: {verifiedDeliverableKind}
        </div>
      ) : null}
    </div>
  ) : null;

  if (!job || job.status !== 'complete') {
    return (
      <div className="space-y-4 px-4 py-4">
        {proofBanner}
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No artifacts yet - run this job to generate outputs.
          </p>
        </div>
      </div>
    );
  }

  const deliverables = job.deliverables ?? [];

  if (deliverables.length === 0) {
    return (
      <div className="space-y-4 px-4 py-4">
        {proofBanner}
        <div className="flex flex-1 items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">
            This run completed but produced no artifacts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {proofBanner}
      {deliverables.map((deliverable) => (
        <div
          key={deliverable.deliverable_kind}
          className="flex flex-col gap-3 rounded-md border border-border bg-background/60 px-3 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-foreground">{deliverable.filename}</div>
            <div className="text-[10px] text-muted-foreground">
              {deliverable.deliverable_kind} | {formatBytes(deliverable.byte_size)}
              {deliverable.created_at ? ` | ${formatTimestamp(deliverable.created_at)}` : ''}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={downloadingKind === deliverable.deliverable_kind}
            onClick={() => { void onDownload(deliverable); }}
            aria-label={`Download ${deliverable.filename}`}
          >
            {downloadingKind === deliverable.deliverable_kind ? 'Downloading...' : 'Download'}
          </Button>
        </div>
      ))}

      {downloadError ? (
        <div className="text-sm text-destructive">{downloadError}</div>
      ) : null}
    </div>
  );
}
