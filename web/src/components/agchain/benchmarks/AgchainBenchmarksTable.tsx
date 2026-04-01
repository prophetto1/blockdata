import { Link } from 'react-router-dom';
import { type AgchainProjectRegistryRow } from '@/lib/agchainBenchmarks';

type AgchainBenchmarksTableProps = {
  items: AgchainProjectRegistryRow[];
  loading: boolean;
};

function formatState(value: AgchainProjectRegistryRow['state']) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatValidation(item: AgchainProjectRegistryRow) {
  return `${item.validation_status} (${item.validation_issue_count})`;
}

function formatActivity(item: AgchainProjectRegistryRow) {
  const lastRun = item.last_run_at ? new Date(item.last_run_at).toLocaleString() : 'No runs yet';
  const updated = new Date(item.updated_at).toLocaleString();
  return `${lastRun} | updated ${updated}`;
}

export function AgchainBenchmarksTable({
  items,
  loading,
}: AgchainBenchmarksTableProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <div className="border-b border-border/70 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Project registry</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per AGChain project or evaluation, backed by benchmark-derived registry data. Entering a row opens
          its focused child pages.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Project</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium">Description</th>
              <th className="px-6 py-3 font-medium">State</th>
              <th className="px-6 py-3 font-medium">Current Spec</th>
              <th className="px-6 py-3 font-medium">Steps</th>
              <th className="px-6 py-3 font-medium">Selected Eval Models</th>
              <th className="px-6 py-3 font-medium">Tested Models</th>
              <th className="px-6 py-3 font-medium">Validation</th>
              <th className="px-6 py-3 font-medium">Activity</th>
              <th className="px-6 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-6 py-8 text-muted-foreground" colSpan={11}>
                  Loading AGChain projects...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-muted-foreground" colSpan={11}>
                  No AGChain projects have been created yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.benchmark_id} className="border-t border-border/60 align-top">
                  <td className="px-6 py-4 font-medium text-foreground">{item.benchmark_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{item.benchmark_slug}</td>
                  <td className="max-w-sm px-6 py-4 text-muted-foreground">{item.description}</td>
                  <td className="px-6 py-4 text-foreground">{formatState(item.state)}</td>
                  <td className="px-6 py-4 text-foreground">{item.current_spec_label}</td>
                  <td className="px-6 py-4 text-foreground">{item.step_count}</td>
                  <td className="px-6 py-4 text-foreground">{item.selected_eval_model_count}</td>
                  <td className="px-6 py-4 text-foreground">{item.tested_model_count}</td>
                  <td className="px-6 py-4 text-foreground">{formatValidation(item)}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatActivity(item)}</td>
                  <td className="px-6 py-4">
                    <Link
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                      to={item.href}
                    >
                      Open Project
                    </Link>
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
