import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type AgchainBenchmarkRegistryRow } from '@/lib/agchainBenchmarks';

type AgchainBenchmarksTableProps = {
  items: AgchainBenchmarkRegistryRow[];
  loading: boolean;
};

function formatState(value: AgchainBenchmarkRegistryRow['state']) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatVersionStatus(value: AgchainBenchmarkRegistryRow['version_status']) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateTime(value: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

function formatIssueCount(value: number) {
  if (value === 0) return 'No issues';
  if (value === 1) return '1 issue';
  return `${value} issues`;
}

function stateBadgeVariant(value: AgchainBenchmarkRegistryRow['state']) {
  if (value === 'ready') return 'green';
  if (value === 'running') return 'blue';
  if (value === 'attention') return 'yellow';
  if (value === 'archived') return 'gray';
  return 'dark';
}

function versionBadgeVariant(value: AgchainBenchmarkRegistryRow['version_status']) {
  if (value === 'published') return 'green';
  if (value === 'archived') return 'gray';
  return 'yellow';
}

function validationBadgeVariant(value: AgchainBenchmarkRegistryRow['validation_status']) {
  if (value === 'pass') return 'green';
  if (value === 'warn') return 'yellow';
  if (value === 'fail') return 'red';
  return 'gray';
}

export function AgchainBenchmarksTable({
  items,
  loading,
}: AgchainBenchmarksTableProps) {
  return (
    <section
      data-testid="agchain-benchmark-registry"
      className="flex min-h-0 flex-1 flex-col rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Benchmark registry</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          One row per AGChain benchmark child resource. Use it to inspect benchmark status, version posture, and recent
          activity inside the selected project.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-[13rem] px-3 py-2 font-medium">Benchmark</th>
              <th className="w-[9rem] px-3 py-2 font-medium">Slug</th>
              <th className="w-[18rem] px-3 py-2 font-medium">Description</th>
              <th className="w-[8rem] px-3 py-2 font-medium">State</th>
              <th className="w-[12rem] px-3 py-2 font-medium">Current Spec</th>
              <th className="w-[6rem] px-3 py-2 font-medium">Steps</th>
              <th className="w-[8rem] px-3 py-2 font-medium">Eval Models</th>
              <th className="w-[8rem] px-3 py-2 font-medium">Tested</th>
              <th className="w-[9rem] px-3 py-2 font-medium">Validation</th>
              <th className="w-[12rem] px-3 py-2 font-medium">Activity</th>
              <th className="w-[8rem] px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={11}>
                  Loading benchmark registry...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-sm text-muted-foreground" colSpan={11}>
                  No AGChain benchmarks have been created yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.benchmark_id} className="border-b border-border/60 align-top hover:bg-accent/30">
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.benchmark_name}</p>
                      <p className="text-xs text-muted-foreground">{item.benchmark_id}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{item.benchmark_slug}</td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{item.description}</td>
                  <td className="px-3 py-3">
                    <Badge variant={stateBadgeVariant(item.state)} size="sm">
                      {formatState(item.state)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{item.current_spec_label}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={versionBadgeVariant(item.version_status)} size="sm">
                          {formatVersionStatus(item.version_status)}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{item.current_spec_version}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-sm text-foreground">{item.step_count}</td>
                  <td className="px-3 py-3 font-mono text-sm text-foreground">{item.selected_eval_model_count}</td>
                  <td className="px-3 py-3 font-mono text-sm text-foreground">{item.tested_model_count}</td>
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <Badge variant={validationBadgeVariant(item.validation_status)} size="sm">
                        {item.validation_status.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{formatIssueCount(item.validation_issue_count)}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="space-y-1 text-xs">
                      <p className="text-foreground">
                        {formatDateTime(item.last_run_at) ? `Last run ${formatDateTime(item.last_run_at)}` : 'No runs yet'}
                      </p>
                      <p className="text-muted-foreground">Updated {formatDateTime(item.updated_at) ?? '--'}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end">
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Link aria-label="Open benchmark" to={item.href}>
                          Open
                          <IconExternalLink aria-hidden="true" size={14} />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
