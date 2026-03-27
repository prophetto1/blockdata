import { useState } from 'react';
import { IconArrowDown, IconArrowUp, IconArrowsSort } from '@tabler/icons-react';
import { Checkbox } from '@ark-ui/react/checkbox';
import { type AgchainModelTarget } from '@/lib/agchainModels';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type SortField = 'label' | 'provider_display_name' | 'health_status';
type SortDir = 'asc' | 'desc';

type AgchainModelsTableProps = {
  items: AgchainModelTarget[];
  loading: boolean;
  selectedModelId: string | null;
  onSelect: (modelTargetId: string) => void;
};

function formatCompatibility(item: AgchainModelTarget) {
  if (item.supports_evaluated && item.supports_judge) return 'Evaluated + Judge';
  if (item.supports_evaluated) return 'Evaluated';
  if (item.supports_judge) return 'Judge';
  return 'None';
}

function formatLastChecked(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

const HEALTH_BADGE: Record<string, 'green' | 'red' | 'yellow' | 'gray'> = {
  healthy: 'green',
  unhealthy: 'red',
  degraded: 'yellow',
  unknown: 'gray',
};

const AUTH_BADGE: Record<string, 'green' | 'yellow' | 'gray'> = {
  configured: 'green',
  missing: 'yellow',
  unknown: 'gray',
};

function SortIcon({ field, activeField, dir }: { field: SortField; activeField: SortField | null; dir: SortDir }) {
  if (activeField !== field) return <IconArrowsSort size={14} className="opacity-40" />;
  return dir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
}

export function AgchainModelsTable({
  items,
  loading,
  selectedModelId,
  onSelect,
}: AgchainModelsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sorted = sortField
    ? [...items].sort((a, b) => {
        const aVal = (a[sortField] ?? '').toLowerCase();
        const bVal = (b[sortField] ?? '').toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : items;

  return (
    <section className="flex flex-col rounded-3xl border border-border/70 bg-card/70 shadow-sm">
      <div className="border-b border-border/70 px-6 py-4">
        <h2 className="text-lg font-semibold text-foreground">Registered Model Targets</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per global AG chain model target, separate from benchmark-specific assignment.
        </p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-card text-xs uppercase tracking-[0.16em] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-2">
                <Checkbox.Root
                  checked={selected.size === items.length && items.length > 0}
                  onCheckedChange={(details) => {
                    if (details.checked) {
                      setSelected(new Set(items.map((i) => i.model_target_id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                >
                  <Checkbox.Control className="h-4 w-4 rounded border-input" />
                  <Checkbox.HiddenInput />
                </Checkbox.Root>
              </th>
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => toggleSort('label')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Label <SortIcon field="label" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => toggleSort('provider_display_name')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Provider <SortIcon field="provider_display_name" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Qualified Model</th>
              <th className="px-3 py-2 font-medium">Auth Readiness</th>
              <th className="px-3 py-2 font-medium">Compatibility</th>
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => toggleSort('health_status')} className="inline-flex items-center gap-1 hover:text-foreground">
                  Health <SortIcon field="health_status" activeField={sortField} dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Loading model targets...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No model targets have been registered yet.
                </td>
              </tr>
            ) : (
              sorted.map((item) => (
                <tr
                  key={item.model_target_id}
                  className={cn(
                    'cursor-pointer border-b border-border/60 align-top hover:bg-accent/30',
                    selectedModelId === item.model_target_id && 'bg-accent/40',
                    selected.has(item.model_target_id) && 'bg-accent/20',
                  )}
                  onClick={() => onSelect(item.model_target_id)}
                >
                  <td className="w-10 px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox.Root
                      checked={selected.has(item.model_target_id)}
                      onCheckedChange={() => toggleRow(item.model_target_id)}
                    >
                      <Checkbox.Control className="h-4 w-4 rounded border-input" />
                      <Checkbox.HiddenInput />
                    </Checkbox.Root>
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                      onClick={(e) => { e.stopPropagation(); onSelect(item.model_target_id); }}
                      aria-label={`Open model ${item.label}`}
                    >
                      {item.label}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground">{item.provider_display_name}</td>
                  <td className="max-w-[280px] truncate px-3 py-3 font-mono text-xs text-foreground">{item.qualified_model}</td>
                  <td className="px-3 py-3">
                    <Badge variant={AUTH_BADGE[item.credential_status] ?? 'gray'} size="sm">
                      {item.credential_status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-sm text-foreground">{formatCompatibility(item)}</td>
                  <td className="px-3 py-3">
                    <Badge variant={HEALTH_BADGE[item.health_status] ?? 'gray'} size="sm">
                      {item.health_status}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground">{formatLastChecked(item.health_checked_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </ScrollArea>
    </section>
  );
}
