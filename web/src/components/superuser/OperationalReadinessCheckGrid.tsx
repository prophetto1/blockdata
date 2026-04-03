import type {
  OperationalReadinessCheck,
  OperationalReadinessStatus,
  OperationalReadinessSurface,
} from '@/lib/operationalReadiness';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

/* ── Status ring SVG (inspired by pipeline builder reference) ──────────── */

const RING_COLORS: Record<OperationalReadinessStatus, { stroke: string; fill: string }> = {
  ok: { stroke: 'stroke-emerald-500', fill: 'fill-emerald-500' },
  warn: { stroke: 'stroke-amber-500', fill: 'fill-amber-500' },
  fail: { stroke: 'stroke-rose-500', fill: 'fill-rose-500' },
  unknown: { stroke: 'stroke-slate-400', fill: 'fill-slate-400' },
};

function StatusRing({ status, size = 20 }: { status: OperationalReadinessStatus; size?: number }) {
  const { stroke, fill } = RING_COLORS[status];
  const r = size / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} className={`${stroke} fill-none`} strokeWidth={2} />
      {status === 'ok' ? (
        <circle cx={cx} cy={cy} r={r - 3} className={fill} />
      ) : status === 'fail' ? (
        <>
          <line x1={cx - 3} y1={cy - 3} x2={cx + 3} y2={cy + 3} className={stroke} strokeWidth={2} strokeLinecap="round" />
          <line x1={cx + 3} y1={cy - 3} x2={cx - 3} y2={cy + 3} className={stroke} strokeWidth={2} strokeLinecap="round" />
        </>
      ) : status === 'warn' ? (
        <>
          <line x1={cx} y1={cy - 3} x2={cx} y2={cy + 1} className={stroke} strokeWidth={2} strokeLinecap="round" />
          <circle cx={cx} cy={cy + 3.5} r={1} className={fill} />
        </>
      ) : (
        <circle cx={cx} cy={cy} r={2} className={fill} />
      )}
    </svg>
  );
}

/* ── Constants ─────────────────────────────────────────────────────────── */

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
  'browser-dependent': 'Browser',
  observability: 'Observability',
  product: 'Product',
};

const INLINE_FACT_KEYS = [
  'service_name',
  'revision_name',
  'service_account_email',
  'bucket_name',
  'signing_mode',
  'error_reason',
  'error_service',
  'cors_rule_count',
  'allowed_origins',
  'allowed_methods',
] as const;

/* ── Helpers ───────────────────────────────────────────────────────────── */

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unavailable';
  return parsed.toLocaleString();
}

function formatEvidenceKey(key: string): string {
  return key.replace(/[_\.]+/g, ' ').replace(/\b\w/g, (v) => v.toUpperCase());
}

function formatEvidenceValue(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function formatCompactFactValue(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((entry) => formatEvidenceValue(entry)).filter(Boolean);
    if (items.length === 0) return 'None';
    const visible = items.slice(0, 2);
    return items.length > visible.length
      ? `${visible.join(', ')} (+${items.length - visible.length} more)`
      : visible.join(', ');
  }
  return formatEvidenceValue(value);
}

function getInlineFacts(check: OperationalReadinessCheck): Array<{ label: string; value: string }> {
  return INLINE_FACT_KEYS
    .map((key) => {
      const value = check.evidence[key];
      if (value === null || value === undefined) return null;
      if (Array.isArray(value) && value.length === 0) return null;
      if (typeof value === 'string' && !value.trim()) return null;
      return {
        label: formatEvidenceKey(key),
        value: formatCompactFactValue(value),
      };
    })
    .filter((fact): fact is { label: string; value: string } => fact !== null)
    .slice(0, 3);
}

function isNoActionRemediation(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return !lower || lower === 'no action required.' || lower === 'no action required';
}

/* ── Component ─────────────────────────────────────────────────────────── */

export function OperationalReadinessCheckGrid({
  surface,
}: {
  surface: OperationalReadinessSurface;
}) {
  const allOk = surface.checks.every((c) => c.status === 'ok');

  const summaryLine = allOk
    ? `${surface.label} — ${surface.checks.length}/${surface.checks.length} OK`
    : `${surface.label} — ${surface.summary.fail} fail, ${surface.summary.warn} warn, ${surface.summary.ok} ok`;

  return (
    <details
      open={!allOk}
      className={`overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-sm ${SURFACE_TREATMENT[surface.id]}`}
    >
      {/* ── Surface summary header ───────────────────────────────────── */}
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusRing status={allOk ? 'ok' : (surface.summary.fail > 0 ? 'fail' : 'warn')} />
            <span className="text-base font-semibold text-foreground">{summaryLine}</span>
          </div>
          <div className="flex gap-2">
            {(['ok', 'warn', 'fail', 'unknown'] as const).filter((s) => surface.summary[s] > 0).map((s) => (
              <span key={s} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${STATUS_BADGE[s]}`}>
                {surface.summary[s]} {s}
              </span>
            ))}
          </div>
        </div>
      </summary>

      {/* ── Timeline check list ──────────────────────────────────────── */}
      <div className="border-t border-border/60 px-4 py-3">
        <div className="relative">
          {surface.checks.length > 1 ? (
            <div
              aria-hidden="true"
              className="absolute left-[9px] top-[20px] w-px bg-border/60"
              style={{ bottom: 20 }}
            />
          ) : null}

          <div className="space-y-0">
            {surface.checks.map((check, idx) => {
              const evidenceEntries = Object.entries(check.evidence);
              const inlineFacts = getInlineFacts(check);
              const isLast = idx === surface.checks.length - 1;
              const hasRemediation = !isNoActionRemediation(check.remediation);
              const showCause = (check.status === 'fail' || check.status === 'warn') && Boolean(check.cause);
              const hasExpandedSections =
                evidenceEntries.length > 0 ||
                check.available_actions.length > 0 ||
                check.verify_after.length > 0 ||
                check.next_if_still_failing.length > 0;

              return (
                <CollapsibleRoot key={check.check_id} className="relative rounded-none border-0 bg-transparent">
                  {/* ── Check row ─────────────────────────────────── */}
                  <CollapsibleTrigger
                    className={`group flex w-full items-start gap-3 rounded-xl px-0 py-2.5 text-left transition-colors hover:bg-accent/30 ${
                      check.status === 'fail' ? 'bg-rose-500/[0.04]' : check.status === 'warn' ? 'bg-amber-500/[0.03]' : ''
                    }`}
                  >
                    {/* Status ring (timeline node) */}
                    <div className="relative z-10 mt-0.5 flex shrink-0 items-center justify-center rounded-full bg-card" style={{ width: 20 }}>
                      <StatusRing status={check.status} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-foreground">{check.label}</span>
                        <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                          {CATEGORY_LABELS[check.category]}
                        </span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_BADGE[check.status]}`}>
                          {check.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{check.summary}</p>
                      {showCause ? (
                        <p className="mt-1 text-sm text-foreground">
                          <span className="font-medium text-muted-foreground">Cause: </span>
                          {check.cause}
                        </p>
                      ) : null}
                      {inlineFacts.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="font-medium text-muted-foreground">Key facts:</span>
                          {inlineFacts.map((fact) => (
                            <span
                              key={`${check.check_id}-${fact.label}`}
                              className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-foreground"
                            >
                              <span className="text-muted-foreground">{fact.label}: </span>
                              <span className="font-medium">{fact.value}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {hasRemediation ? (
                        <p className="mt-1 text-sm text-foreground">
                          <span className="font-medium text-muted-foreground">Fix: </span>
                          {check.remediation}
                        </p>
                      ) : null}
                    </div>
                  </CollapsibleTrigger>

                  {/* ── Expanded evidence ── */}
                  {hasExpandedSections ? (
                    <CollapsibleContent className={`ml-[28px] ${isLast ? 'mb-1' : 'mb-2'} rounded-xl border border-border/60 bg-background/80 p-3 dark:bg-background/40`}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Check detail</span>
                        <span className="text-[11px] text-muted-foreground">Checked {formatTimestamp(check.checked_at)}</span>
                      </div>

                      {evidenceEntries.length > 0 ? (
                        <div>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Evidence</span>
                          <div className="mt-2 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(0,160px)_1fr]">
                            {evidenceEntries.map(([key, value]) => (
                              <div key={key} className="contents">
                                <dt className="text-muted-foreground">{formatEvidenceKey(key)}</dt>
                                <dd className="min-w-0 break-words font-medium text-foreground">{formatEvidenceValue(value)}</dd>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {check.available_actions.length > 0 ? (
                        <div className="mt-4">
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Available actions</h4>
                          <ul className="mt-2 space-y-2 text-sm">
                            {check.available_actions.map((action) => (
                              <li key={`${check.check_id}-${action.action_kind}`} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                <p className="font-medium text-foreground">{action.label}</p>
                                <p className="mt-1 text-muted-foreground">{action.description}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {check.verify_after.length > 0 ? (
                        <div className="mt-4">
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Verify after</h4>
                          <ul className="mt-2 space-y-2 text-sm">
                            {check.verify_after.map((target) => (
                              <li key={`${check.check_id}-${target.probe_kind}-${target.route}`} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                <p className="font-medium text-foreground">{target.label}</p>
                                <p className="mt-1 text-muted-foreground">{target.route}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {check.next_if_still_failing.length > 0 ? (
                        <div className="mt-4">
                          <h4 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next if still failing</h4>
                          <ul className="mt-2 space-y-2 text-sm">
                            {check.next_if_still_failing.map((step) => (
                              <li key={`${check.check_id}-${step.step_kind}-${step.label}`} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                                <p className="font-medium text-foreground">{step.label}</p>
                                <p className="mt-1 text-muted-foreground">{step.description}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </CollapsibleContent>
                  ) : null}
                </CollapsibleRoot>
              );
            })}
          </div>
        </div>

        {surface.checks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No checks returned for this surface.
          </p>
        ) : null}
      </div>
    </details>
  );
}
