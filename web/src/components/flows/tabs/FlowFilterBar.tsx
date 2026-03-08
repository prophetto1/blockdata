import { useState } from 'react';
import { IconAdjustments, IconBookmark, IconFilter, IconRefresh, IconSearch, IconX } from '@tabler/icons-react';
import { AppIcon } from '@/components/ui/app-icon';
import {
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_STATES,
  TOOLBAR_STRIP,
} from '@/lib/toolbar-contract';
import { cn } from '@/lib/utils';

type FilterPill = {
  id: string;
  label: string;
  removable: boolean;
};

type FlowFilterBarProps = {
  searchPlaceholder: string;
  filters: FilterPill[];
  onSearch: (query: string) => void;
  onRemoveFilter: (id: string) => void;
  onClearAll: () => void;
  onRefresh: () => void;
};

export function FlowFilterBar({
  searchPlaceholder,
  filters,
  onSearch,
  onRemoveFilter,
  onClearAll,
  onRefresh,
}: FlowFilterBarProps) {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-1">
      <div className={cn(TOOLBAR_STRIP.layout, TOOLBAR_STRIP.gap, TOOLBAR_STRIP.padding, TOOLBAR_STRIP.background, TOOLBAR_STRIP.border)}>
        <button
          type="button"
          aria-label="Add filters"
          className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive)}
        >
          <AppIcon icon={IconFilter} context="inline" tone="current" />
          <span>Add filters</span>
        </button>

        <div className="relative min-w-[180px] flex-1 max-w-[280px]">
          <AppIcon icon={IconSearch} context="inline" tone="muted" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch(e.target.value);
            }}
            className="w-full py-1.5 pl-8 pr-2 border border-border rounded-md bg-background text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {filters.map((f) => (
          <span
            key={f.id}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
          >
            {f.label}
            {f.removable && (
              <button
                type="button"
                aria-label={`Remove ${f.label} filter`}
                onClick={() => onRemoveFilter(f.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <AppIcon icon={IconX} size="xs" tone="current" />
              </button>
            )}
          </span>
        ))}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Refresh data"
            onClick={onRefresh}
            className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive)}
          >
            <AppIcon icon={IconRefresh} context="inline" tone="current" />
            <span>Refresh data</span>
          </button>
          <button
            type="button"
            aria-label="Saved filters"
            className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive)}
          >
            <AppIcon icon={IconBookmark} context="inline" tone="current" />
            <span>Saved filters</span>
            <span className="rounded bg-muted px-1 text-[10px]">0</span>
          </button>
          <button
            type="button"
            aria-label="Filter settings"
            className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive)}
          >
            <AppIcon icon={IconAdjustments} context="inline" tone="current" />
          </button>
        </div>
      </div>

      {filters.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
