import { useMemo } from 'react';
import { IconPlayerPlay } from '@tabler/icons-react';

type Props = {
  projectId: string | null;
};

const DLT_CORE_ENTRYPOINTS = [
  'dlt.pipeline(...)',
  'Pipeline.run(...)',
  'dlt.destinations.* (loaders)',
  'dlt._workspace.cli (dlt CLI)',
] as const;

export function DltLoadPanel({ projectId }: Props) {
  const header = useMemo(() => {
    const suffix = projectId ? `Project ${projectId}` : 'No project selected';
    return `Load (DLT) • ${suffix}`;
  }, [projectId]);

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{header}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Configure destinations and load pipeline data (DLT runtime; not the conversion service).
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground opacity-70"
            title="Wiring not implemented yet"
            aria-label="Run pull (disabled)"
          >
            <IconPlayerPlay size={14} />
            Run load
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-3">
        <div className="text-xs font-semibold">Destinations (load)</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Postgres, DuckDB, BigQuery, Snowflake, etc (via `dlt.destinations`).
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-3">
        <div className="text-xs font-semibold">Core Python entrypoints (what we wrap)</div>
        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {DLT_CORE_ENTRYPOINTS.map((item) => (
            <div key={item} className="font-mono">
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 rounded-md border border-border bg-card p-3">
        <div className="text-xs font-semibold">Run events</div>
        <div className="mt-2 text-xs text-muted-foreground">
          No runs yet (this will stream from `service_runs` + `service_run_events`).
        </div>
      </div>
    </div>
  );
}
