import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { OperationalReadinessActionPanel } from '@/components/superuser/OperationalReadinessActionPanel';
import { OperationalReadinessDependencyPanel } from '@/components/superuser/OperationalReadinessDependencyPanel';
import { OperationalReadinessProbeHistoryPanel } from '@/components/superuser/OperationalReadinessProbeHistoryPanel';
import type {
  OperationalReadinessCheck,
  OperationalReadinessNextStep,
  OperationalReadinessStatus,
  OperationalReadinessSurface,
  OperationalReadinessVerifyTarget,
} from '@/lib/operationalReadiness';

const STATUS_DOT: Record<OperationalReadinessStatus, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  fail: 'bg-rose-500',
  unknown: 'bg-slate-400',
};

const STATUS_ROW: Record<OperationalReadinessStatus, string> = {
  ok: '',
  warn: 'bg-amber-500/[0.04]',
  fail: 'bg-rose-500/[0.05]',
  unknown: '',
};

const STATUS_BADGE: Record<OperationalReadinessStatus, string> = {
  ok: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  fail: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  unknown: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300',
};

const SURFACE_TREATMENT: Record<OperationalReadinessSurface['id'], string> = {
  shared: 'bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_55%)]',
  blockdata: 'bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_55%)]',
  agchain: 'bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.15),transparent_55%)]',
};

const CATEGORY_LABELS: Record<OperationalReadinessCheck['category'], string> = {
  process: 'Process',
  config: 'Config',
  credential: 'Credential',
  connectivity: 'Connectivity',
  'browser-dependent': 'Browser dependent',
  observability: 'Observability',
  product: 'Product',
};

const ACTIONABILITY_LABELS: Record<OperationalReadinessCheck['actionability'], string> = {
  backend_action: 'Backend action',
  backend_probe: 'Backend probe',
  external_change: 'External change',
  info_only: 'Info only',
};

const STEP_KIND_LABELS: Record<OperationalReadinessNextStep['step_kind'], string> = {
  rerun_after_action: 'Rerun after action',
  inspect_dependency: 'Inspect dependency',
  manual_fix: 'Manual fix',
  escalate: 'Escalate',
};

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleString();
}

function formatEvidenceKey(key: string): string {
  return key
    .replace(/[_\.]+/g, ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function formatEvidenceValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderEvidence(evidence: Record<string, unknown>) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence returned.</p>;
  }

  return (
    <dl className="space-y-2 text-sm">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid gap-1 border-b border-border/50 pb-2 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,180px)_1fr]"
        >
          <dt className="font-medium text-muted-foreground">{formatEvidenceKey(key)}</dt>
          <dd className="min-w-0 break-words text-foreground">{formatEvidenceValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function isNoActionRequiredStep(step: OperationalReadinessNextStep): boolean {
  return step.step_kind === 'manual_fix' && step.description.trim().toLowerCase() === 'no action required.';
}

function getMeaningfulNextSteps(steps: OperationalReadinessNextStep[]): OperationalReadinessNextStep[] {
  return steps.filter((step) => !isNoActionRequiredStep(step));
}

function hasExpandableDetails(check: OperationalReadinessCheck): boolean {
  return (
    check.depends_on.length > 0 ||
    check.blocked_by.length > 0 ||
    check.available_actions.length > 0 ||
    check.verify_after.length > 0 ||
    getMeaningfulNextSteps(check.next_if_still_failing).length > 0
  );
}

function getPrimaryCause(check: OperationalReadinessCheck): string {
  if (check.cause && check.cause.trim()) return check.cause;
  return check.summary;
}

function getNextActionSummary(check: OperationalReadinessCheck): string {
  if (check.available_actions[0]) return check.available_actions[0].label;
  const nextSteps = getMeaningfulNextSteps(check.next_if_still_failing);
  if (nextSteps[0]) return nextSteps[0].label;
  return check.actionability === 'info_only' ? 'No action' : 'No backend action returned';
}

function VerificationPanel({ verifyAfter }: { verifyAfter: OperationalReadinessVerifyTarget[] }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Verification</h3>
        <p className="text-sm text-muted-foreground">
          Explicit proof targets the operator should run after remediation.
        </p>
      </div>

      {verifyAfter.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          No verification targets returned.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {verifyAfter.map((target) => (
            <li key={`${target.probe_kind}-${target.route}`} className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3">
              <p className="font-medium text-foreground">{target.label}</p>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {target.probe_kind}
              </p>
              <p className="mt-3 break-all font-mono text-[12px] text-muted-foreground">{target.route}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function NextStepsPanel({ steps }: { steps: OperationalReadinessNextStep[] }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Next if still failing</h3>
        <p className="text-sm text-muted-foreground">
          Escalation and follow-up guidance when the current proof still stays red.
        </p>
      </div>

      {steps.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
          No follow-up guidance returned.
        </div>
      ) : (
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li key={`${step.step_kind}-${step.label}`} className="rounded-2xl border border-border/70 bg-background/85 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{step.label}</p>
                <span className="rounded-full border border-border/70 bg-card/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {STEP_KIND_LABELS[step.step_kind]}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function CausePanel({ check }: { check: OperationalReadinessCheck }) {
  return (
    <article className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-foreground">Cause</h3>
          <p className="text-sm text-muted-foreground">
            Most recent backend explanation and evidence for this readiness state.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${STATUS_BADGE[check.status]}`}>
            {check.status}
          </span>
          <span className="rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {check.cause_confidence ? `${check.cause_confidence} confidence` : 'No confidence'}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-foreground">
        {check.cause ?? 'No explicit backend cause returned yet.'}
      </p>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Evidence</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Checked {formatTimestamp(check.checked_at)}
          </p>
        </div>
        <div className="mt-3">{renderEvidence(check.evidence)}</div>
      </div>
    </article>
  );
}

export function OperationalReadinessCheckGrid({
  surface,
}: {
  surface: OperationalReadinessSurface;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(checkId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(checkId)) next.delete(checkId);
      else next.add(checkId);
      return next;
    });
  }

  return (
    <section className={`overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-sm ${SURFACE_TREATMENT[surface.id]}`}>
      <div className="flex flex-col gap-4 border-b border-border/60 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {surface.id} surface
          </p>
          <h2 className="text-xl font-semibold text-foreground">{surface.label}</h2>
          <p className="text-sm text-muted-foreground">
            Proof-backed checks for this surface. Expand a row to inspect cause, blockers, actions, and latest proof state.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['ok', 'warn', 'fail', 'unknown'] as const).map((status) => (
            <div key={status} className="rounded-2xl border border-border/70 bg-background/80 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{status}</p>
              <p className="mt-1 font-semibold tabular-nums text-foreground">{surface.summary[status]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-background/70 text-left">
              <th className="w-10 px-3 py-3" />
              <th className="w-28 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Check
              </th>
              <th className="hidden px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:table-cell">
                Cause
              </th>
              <th className="hidden px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground xl:table-cell">
                Next Action
              </th>
              <th className="hidden w-56 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:table-cell">
                Last Proof
              </th>
            </tr>
          </thead>
          <tbody>
            {surface.checks.map((check) => {
              const expanded = expandedIds.has(check.check_id);
              const detailId = `readiness-detail-${check.check_id}`;
              const hasDependencies = check.depends_on.length > 0 || check.blocked_by.length > 0;
              const hasActions = check.available_actions.length > 0;
              const hasVerification = check.verify_after.length > 0;
              const meaningfulNextSteps = getMeaningfulNextSteps(check.next_if_still_failing);
              const hasMeaningfulNextSteps = meaningfulNextSteps.length > 0;
              const hasLatestHistory = false;
              const expandable = hasExpandableDetails(check);

              return (
                <tr
                  key={check.check_id}
                  className={`border-b border-border/60 last:border-b-0 ${STATUS_ROW[check.status]}`}
                >
                  <td colSpan={6} className="p-0">
                    <div className="w-full">
                      <div className="grid grid-cols-[40px_112px_minmax(0,1.2fr)_minmax(0,1fr)] items-start md:grid-cols-[40px_112px_minmax(0,1.15fr)_220px] lg:grid-cols-[40px_112px_minmax(0,1fr)_minmax(0,1fr)_220px] xl:grid-cols-[40px_112px_minmax(0,0.95fr)_minmax(0,1fr)_220px_220px]">
                        <div className="flex items-start justify-center px-3 py-3.5">
                          {expandable ? (
                            <button
                              type="button"
                              aria-expanded={expanded}
                              aria-controls={detailId}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              onClick={() => toggle(check.check_id)}
                            >
                              <ChevronRight
                                aria-hidden="true"
                                className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
                              />
                            </button>
                          ) : (
                            <span className={`mt-2 h-2.5 w-2.5 rounded-full ${STATUS_DOT[check.status]}`} />
                          )}
                        </div>

                        <div className="flex w-28 shrink-0 flex-col gap-2 px-3 py-3.5">
                        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${STATUS_BADGE[check.status]}`}>
                          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[check.status]}`} />
                          {check.status}
                        </span>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {ACTIONABILITY_LABELS[check.actionability]}
                        </span>
                        </div>

                        <div className="min-w-0 px-3 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{check.label}</span>
                            <span className="rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {CATEGORY_LABELS[check.category]}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground lg:hidden">{getPrimaryCause(check)}</p>
                        </div>

                        <div className="hidden min-w-0 px-3 py-3.5 lg:block">
                          <p className="text-sm text-muted-foreground">{getPrimaryCause(check)}</p>
                        </div>

                        <div className="hidden min-w-0 px-3 py-3.5 xl:block">
                          <p className="text-sm text-foreground">{getNextActionSummary(check)}</p>
                        </div>

                        <div className="hidden px-3 py-3.5 md:block">
                          <p className="text-sm text-foreground">{check.summary}</p>
                          <p className="mt-2 text-[12px] text-muted-foreground">
                            Checked {formatTimestamp(check.checked_at)}
                          </p>
                        </div>
                      </div>

                    {expandable && expanded ? (
                      <div id={detailId} className="border-t border-border/60 bg-background/60 px-4 py-4 md:px-5">
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(320px,5fr)]">
                          <div className="grid gap-4">
                            <CausePanel check={check} />
                            {hasDependencies ? (
                              <OperationalReadinessDependencyPanel
                                dependsOn={check.depends_on}
                                blockedBy={check.blocked_by}
                              />
                            ) : null}
                            {hasMeaningfulNextSteps ? <NextStepsPanel steps={meaningfulNextSteps} /> : null}
                          </div>

                          <div className="grid gap-4">
                            {hasActions ? (
                              <OperationalReadinessActionPanel
                                actionability={check.actionability}
                                actions={check.available_actions}
                              />
                            ) : null}
                            {hasVerification ? <VerificationPanel verifyAfter={check.verify_after} /> : null}
                            {hasLatestHistory ? <OperationalReadinessProbeHistoryPanel /> : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}

            {surface.checks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No checks returned for this surface in the current authoritative snapshot.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
