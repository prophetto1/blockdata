import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  AgchainBenchmarkToolBinding,
  AgchainResolvedBenchmarkTool,
} from '@/lib/agchainBenchmarks';
import type { AgchainToolRegistryRow } from '@/lib/agchainTools';

const fieldClass = 'grid gap-1.5 text-sm text-foreground';
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';
const inputClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

type AgchainBenchmarkToolBagProps = {
  toolRefs: AgchainBenchmarkToolBinding[];
  resolvedTools: AgchainResolvedBenchmarkTool[];
  availableTools: AgchainToolRegistryRow[];
  canEdit: boolean;
  loading: boolean;
  mutating: boolean;
  dirty: boolean;
  onAdd: () => void;
  onChange: (position: number, updates: Partial<AgchainBenchmarkToolBinding>) => void;
  onMove: (position: number, direction: -1 | 1) => void;
  onRemove: (position: number) => void;
  onSave: () => Promise<void>;
};

const RESOLUTION_BADGE: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  resolved: 'green',
  missing_version: 'red',
  missing_builtin: 'red',
  missing_discovery: 'red',
};

export function AgchainBenchmarkToolBag({
  toolRefs,
  resolvedTools,
  availableTools,
  canEdit,
  loading,
  mutating,
  dirty,
  onAdd,
  onChange,
  onMove,
  onRemove,
  onSave,
}: AgchainBenchmarkToolBagProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/70 p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Benchmark tool bag</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Tool Bag</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Bind the ordered tool set for the current draft benchmark version and preview the resolved manifest that
            run-launch will consume later.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onAdd} disabled={!canEdit || mutating || !availableTools.length}>
            Add tool
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={!canEdit || mutating || !dirty}>
            {mutating ? 'Saving...' : 'Save Tool Bag'}
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)]">
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading tool bag...</p>
          ) : toolRefs.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
              No tools are attached to this draft benchmark version yet.
            </p>
          ) : (
            toolRefs.map((binding, index) => (
              <article key={`${binding.position}:${binding.tool_ref}`} className="rounded-2xl border border-border/70 bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tool {binding.position}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{binding.display_name ?? binding.tool_ref}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onMove(binding.position, -1)}
                      disabled={!canEdit || mutating || index === 0}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onMove(binding.position, 1)}
                      disabled={!canEdit || mutating || index === toolRefs.length - 1}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onRemove(binding.position)}
                      disabled={!canEdit || mutating}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className={fieldClass}>
                    <label htmlFor={`benchmark-tool-ref-${binding.position}`}>Tool selection</label>
                    <select
                      id={`benchmark-tool-ref-${binding.position}`}
                      className={selectClass}
                      value={binding.tool_ref}
                      onChange={(event) => onChange(binding.position, { tool_ref: event.currentTarget.value })}
                      disabled={!canEdit || mutating}
                    >
                      {availableTools.map((tool) => (
                        <option key={tool.tool_ref ?? tool.tool_name} value={tool.tool_ref ?? ''}>
                          {tool.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={fieldClass}>
                    <label htmlFor={`benchmark-tool-alias-${binding.position}`}>Alias</label>
                    <input
                      id={`benchmark-tool-alias-${binding.position}`}
                      className={inputClass}
                      value={binding.alias ?? ''}
                      onChange={(event) => onChange(binding.position, { alias: event.currentTarget.value || null })}
                      disabled={!canEdit || mutating}
                    />
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Resolved manifest
            </h3>
            {dirty ? (
              <span className="text-xs text-muted-foreground">Save tool bag to refresh preview</span>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {resolvedTools.length === 0 ? (
              <p className="text-sm text-muted-foreground">No resolved tools available yet.</p>
            ) : (
              resolvedTools.map((tool) => (
                <article key={`${tool.position}:${tool.tool_ref}`} className="rounded-xl border border-border/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{tool.display_name ?? tool.tool_ref}</p>
                      <p className="mt-1 text-xs font-mono text-muted-foreground">{tool.tool_ref}</p>
                    </div>
                    <Badge variant={RESOLUTION_BADGE[tool.resolution_status] ?? 'gray'} size="sm">
                      {tool.resolution_status}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-3 text-sm">
                    <p className="text-muted-foreground">
                      Runtime name: <span className="text-foreground">{tool.runtime_name ?? 'n/a'}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Approval: <span className="text-foreground">{tool.approval_mode}</span>
                    </p>
                    {tool.missing_secret_slots.length ? (
                      <p className="text-destructive">
                        Missing secret slots: {tool.missing_secret_slots.length}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Missing secret slots: none</p>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
