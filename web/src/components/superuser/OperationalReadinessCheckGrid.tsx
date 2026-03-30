import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { OperationalReadinessStatus, OperationalReadinessSurface } from '@/lib/operationalReadiness';

const STATUS_DOT: Record<OperationalReadinessStatus, string> = {
  ok: 'bg-emerald-400',
  warn: 'bg-amber-400',
  fail: 'bg-rose-400',
  unknown: 'bg-slate-400',
};

const STATUS_ROW: Record<OperationalReadinessStatus, string> = {
  ok: '',
  warn: '',
  fail: 'bg-rose-500/5',
  unknown: '',
};

function renderEvidence(evidence: Record<string, unknown>) {
  const entries = Object.entries(evidence);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No evidence returned.</p>;
  }

  return (
    <dl className="space-y-1 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="grid grid-cols-[minmax(0,140px)_1fr] gap-2">
          <dt className="font-medium text-muted-foreground">{key}</dt>
          <dd className="truncate text-foreground">{String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OperationalReadinessCheckGrid({
  surface,
}: {
  surface: OperationalReadinessSurface;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{surface.label}</h2>
        <p className="text-sm text-muted-foreground">
          {surface.summary.ok} ok, {surface.summary.warn} warn, {surface.summary.fail} fail, {surface.summary.unknown} unknown
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card/70 text-left">
              <th className="w-8 px-3 py-2" />
              <th className="w-16 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Check
              </th>
              <th className="hidden px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:table-cell">
                Summary
              </th>
            </tr>
          </thead>
          <tbody>
            {surface.checks.map((check) => {
              const expanded = expandedIds.has(check.id);
              return (
                <tr
                  key={check.id}
                  className={`border-b border-border/60 last:border-b-0 ${STATUS_ROW[check.status]}`}
                >
                  <td colSpan={4} className="p-0">
                    <button
                      type="button"
                      className="flex w-full items-start text-left hover:bg-card/40"
                      onClick={() => toggle(check.id)}
                    >
                      <span className="flex w-8 shrink-0 items-center justify-center px-3 py-2.5">
                        {expanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </span>
                      <span className="flex w-16 shrink-0 items-center gap-2 px-3 py-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[check.status]}`} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {check.status}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 px-3 py-2.5 font-medium text-foreground">
                        {check.label}
                        <span className="ml-2 font-normal text-muted-foreground md:hidden">
                          {' '}— {check.summary}
                        </span>
                      </span>
                      <span className="hidden min-w-0 flex-1 px-3 py-2.5 text-muted-foreground md:block">
                        {check.summary}
                      </span>
                    </button>

                    {expanded ? (
                      <div className="space-y-3 border-t border-border/40 bg-background/40 px-10 py-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Evidence
                          </p>
                          <div className="mt-1">{renderEvidence(check.evidence)}</div>
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Remediation
                          </p>
                          <p className="mt-1 text-sm text-foreground">{check.remediation}</p>
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}

            {surface.checks.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  No checks returned for this surface in the current snapshot.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
