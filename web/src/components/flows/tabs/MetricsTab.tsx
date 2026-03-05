import { useState } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import { FlowFilterBar } from './FlowFilterBar';

export function MetricsTab({ flowId: _flowId }: { flowId: string }) {
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

      <div className="flex items-center gap-2 rounded-md bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
        <AppIcon icon={IconInfoCircle} context="inline" tone="current" className="text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Please choose a metric and an aggregation</span>
      </div>
    </div>
  );
}
