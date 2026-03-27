import { type AgchainModelTarget } from '@/lib/agchainModels';

type AgchainModelsTableProps = {
  items: AgchainModelTarget[];
  loading: boolean;
  selectedModelId: string | null;
  onSelect: (modelTargetId: string) => void;
};

function formatCompatibility(item: AgchainModelTarget) {
  if (item.supports_evaluated && item.supports_judge) {
    return 'Evaluated + Judge';
  }

  if (item.supports_evaluated) {
    return 'Evaluated';
  }

  if (item.supports_judge) {
    return 'Judge';
  }

  return 'None';
}

function formatLastChecked(value: string | null) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}

export function AgchainModelsTable({
  items,
  loading,
  selectedModelId,
  onSelect,
}: AgchainModelsTableProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <div className="border-b border-border/70 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Registered Model Targets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per global AG chain model target, separate from benchmark-specific assignment.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-muted/30 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">Label</th>
              <th className="px-6 py-3 font-medium">Provider</th>
              <th className="px-6 py-3 font-medium">Qualified Model</th>
              <th className="px-6 py-3 font-medium">Auth Readiness</th>
              <th className="px-6 py-3 font-medium">Compatibility</th>
              <th className="px-6 py-3 font-medium">Health</th>
              <th className="px-6 py-3 font-medium">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-6 py-8 text-muted-foreground" colSpan={7}>
                  Loading model targets...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-muted-foreground" colSpan={7}>
                  No model targets have been registered yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.model_target_id}
                  className={selectedModelId === item.model_target_id ? 'bg-accent/40' : 'border-t border-border/60'}
                >
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                      onClick={() => onSelect(item.model_target_id)}
                      aria-label={`Open model ${item.label}`}
                    >
                      {item.label}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-foreground">{item.provider_display_name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-foreground">{item.qualified_model}</td>
                  <td className="px-6 py-4 text-foreground">{item.credential_status}</td>
                  <td className="px-6 py-4 text-foreground">{formatCompatibility(item)}</td>
                  <td className="px-6 py-4 text-foreground">{item.health_status}</td>
                  <td className="px-6 py-4 text-muted-foreground">{formatLastChecked(item.health_checked_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
