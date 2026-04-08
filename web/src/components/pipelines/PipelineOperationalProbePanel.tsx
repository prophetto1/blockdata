import { Button } from '@/components/ui/button';
import type { RuntimeProbeRun } from '@/lib/pipelineService';

type PipelineOperationalProbePanelProps = {
  serviceLabel: string;
  browserUploadRun: RuntimeProbeRun | null;
  jobExecutionRun: RuntimeProbeRun | null;
  isRunningBrowserUpload: boolean;
  isRunningJobExecution: boolean;
  onRunBrowserUpload: () => void | Promise<void>;
  onRunJobExecution: () => void | Promise<void>;
};

function statusLabel(run: RuntimeProbeRun | null) {
  if (!run) return 'Unverified';
  return run.result === 'ok' ? 'Verified' : 'Failed';
}

function statusClass(run: RuntimeProbeRun | null) {
  if (!run) return 'border-border bg-background text-muted-foreground';
  return run.result === 'ok'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    : 'border-destructive/30 bg-destructive/10 text-destructive';
}

function browserUploadSummary(run: RuntimeProbeRun | null) {
  if (!run) {
    return 'No persisted browser-upload proof exists yet for this mounted pipeline surface.';
  }
  if (run.result === 'ok') {
    return 'Latest backend upload proof verified pipeline source registration.';
  }
  return run.failure_reason ?? 'The latest backend upload proof failed.';
}

function jobExecutionSummary(run: RuntimeProbeRun | null) {
  if (!run) {
    return 'No persisted job-execution proof exists yet for this mounted pipeline surface.';
  }
  if (run.result === 'ok') {
    return 'Latest backend job proof verified source-set persistence, job execution, and deliverable download.';
  }
  return run.failure_reason ?? 'The latest backend job proof failed.';
}

function ProbeCard({
  title,
  run,
  summary,
  detail,
  isRunning,
  buttonLabel,
  onRun,
}: {
  title: string;
  run: RuntimeProbeRun | null;
  summary: string;
  detail: string | null;
  isRunning: boolean;
  buttonLabel: string;
  onRun: () => void | Promise<void>;
}) {
  return (
    <article className="rounded-xl border border-border bg-card/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${statusClass(run)}`}>
              {statusLabel(run)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{summary}</p>
          {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={isRunning} onClick={() => { void onRun(); }}>
          {isRunning ? 'Running...' : buttonLabel}
        </Button>
      </div>
    </article>
  );
}

export function PipelineOperationalProbePanel({
  serviceLabel,
  browserUploadRun,
  jobExecutionRun,
  isRunningBrowserUpload,
  isRunningJobExecution,
  onRunBrowserUpload,
  onRunJobExecution,
}: PipelineOperationalProbePanelProps) {
  const browserEvidence = browserUploadRun?.evidence ?? {};
  const jobEvidence = jobExecutionRun?.evidence ?? {};
  const browserSourceId = typeof browserEvidence.pipeline_source_id === 'string'
    ? browserEvidence.pipeline_source_id
    : null;
  const verifiedDeliverableKind = typeof jobEvidence.deliverable_kind === 'string'
    ? jobEvidence.deliverable_kind
    : null;

  return (
    <section className="rounded-2xl border border-border bg-card px-6 py-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          Operational proof
        </p>
        <h2 className="text-xl font-semibold text-foreground">Operational proof</h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {serviceLabel} backend proof for the mounted upload, source-set, job, and deliverable seams.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <ProbeCard
          title="Browser upload"
          run={browserUploadRun}
          summary={browserUploadSummary(browserUploadRun)}
          detail={browserSourceId ? `Pipeline source registered: ${browserSourceId}` : null}
          isRunning={isRunningBrowserUpload}
          buttonLabel="Run browser upload probe"
          onRun={onRunBrowserUpload}
        />
        <ProbeCard
          title="Job execution"
          run={jobExecutionRun}
          summary={jobExecutionSummary(jobExecutionRun)}
          detail={verifiedDeliverableKind ? `Deliverable download verified: ${verifiedDeliverableKind}` : null}
          isRunning={isRunningJobExecution}
          buttonLabel="Run job execution probe"
          onRun={onRunJobExecution}
        />
      </div>
    </section>
  );
}
