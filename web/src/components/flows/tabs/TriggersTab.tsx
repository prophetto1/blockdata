import { useMemo, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FlowFilterBar } from './FlowFilterBar';
import { FlowEmptyState } from './FlowEmptyState';

type TriggerSummary = {
  id: string;
  type: string;
  nextExecutionDate: string | null;
  disabled: boolean;
};

type TriggersTabProps = {
  triggers: TriggerSummary[];
  onEditFlow: () => void;
};

export function TriggersTab({ triggers, onEditFlow }: TriggersTabProps) {
  const [filters, setFilters] = useState<{ id: string; label: string; removable: boolean }[]>([]);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return triggers;
    const q = search.toLowerCase();
    return triggers.filter(
      (t) => t.id.toLowerCase().includes(q) || t.type.toLowerCase().includes(q),
    );
  }, [triggers, search]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search triggers"
        filters={filters}
        onSearch={setSearch}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      {triggers.length > 0 ? (
        <div className="overflow-auto rounded-md border border-border bg-card">
          <table className="min-w-full text-xs">
            <thead className="border-b border-border bg-muted/30">
              <tr className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2 text-left">Id</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Next execution date</th>
                <th className="px-3 py-2 text-left">Backfill</th>
                <th className="px-3 py-2 text-left" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className={cn('border-t border-border/40 hover:bg-accent/30')}>
                  <td className="px-3 py-2 text-muted-foreground">&#9660;</td>
                  <td className="px-3 py-2 font-medium text-primary">{t.id}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{t.type}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {t.nextExecutionDate ? new Date(t.nextExecutionDate).toLocaleString() : '--'}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">--</td>
                  <td className="px-3 py-2">
                    <Badge variant={t.disabled ? 'gray' : 'green'} size="xs">
                      {t.disabled ? 'Disabled' : 'Enabled'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <FlowEmptyState
          title="No triggers configured."
          subtitle="Add a trigger to automate this flow's execution."
        />
      )}

      <button
        type="button"
        onClick={onEditFlow}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <AppIcon icon={IconPlus} context="inline" tone="current" />
        Add a trigger
      </button>
    </div>
  );
}
