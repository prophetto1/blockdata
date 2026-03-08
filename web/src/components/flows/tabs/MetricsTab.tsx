import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import { FlowFilterBar } from './FlowFilterBar';

export function MetricsTab(_props: { flowId: string }) {
  const [filters, setFilters] = useState<{ id: string; label: string; removable: boolean }[]>([]);

  return (
    <div className="space-y-4">
      <FlowFilterBar
        searchPlaceholder="Search metrics"
        filters={filters}
        onSearch={() => {}}
        onRemoveFilter={(id) => setFilters((f) => f.filter((p) => p.id !== id))}
        onClearAll={() => setFilters([])}
        onRefresh={() => {}}
      />

      <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-4 py-3">
        <AppIcon icon={IconInfoCircle} context="inline" tone="accent" className="shrink-0" />
        <span className="text-sm font-medium text-accent-foreground">Please choose a metric and an aggregation</span>
      </div>
    </div>
  );
}
