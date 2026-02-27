import { useMemo } from 'react';
import { IconPlugConnected, IconPlayerPlay } from '@tabler/icons-react';

type Props = {
  projectId: string | null;
  scriptLabel?: string | null;
};

const DLT_PULL_ENTRYPOINTS = [
  'dlt.sources.* (connectors)',
  'dlt.extract.* (extract pipeline)',
  'dlt.pipeline(...).extract(...)',
] as const;

export function DltPullPanel({ projectId, scriptLabel }: Props) {
  const header = useMemo(() => {
    const suffix = projectId ? `Project ${projectId}` : 'No project selected';
    const script = (scriptLabel ?? '').trim();
    const scriptSuffix = script.length > 0 ? ` | ${script}` : '';
    return `Pull (DLT)${scriptSuffix} | ${suffix}`;
  }, [projectId, scriptLabel]);

  return (
    <div className="flex h-full w-full min-h-0 flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{header}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Configure a source and pull data into the pipeline state (extract step).
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
            Run pull
          </button>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <IconPlugConnected size={14} />
          Sources (connectors)
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          APIs, filesystems, databases, SaaS (DLT sources). This is the pull/extract surface area we wrap.
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-3">
        <div className="text-xs font-semibold">Core Python entrypoints (what we wrap)</div>
        <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {DLT_PULL_ENTRYPOINTS.map((item) => (
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
