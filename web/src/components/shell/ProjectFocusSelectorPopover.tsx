import { useMemo, useState, type ReactNode } from 'react';
import { IconChevronDown, IconSearch } from '@tabler/icons-react';
import { PopoverRoot, PopoverTrigger, PopoverContent } from '@/components/ui/popover';

import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export type ProjectFocusSelectorItem = {
  id: string;
  label: string;
  description?: string | null;
  searchText?: string;
  leadingText?: string;
};

type ProjectFocusSelectorPopoverProps = {
  items: ProjectFocusSelectorItem[];
  selectedItemId: string | null;
  triggerLabel: string;
  triggerDescription?: string | null;
  triggerLeadingText?: string;
  triggerVariant?: 'default' | 'sidebar-row';
  triggerTestId?: string;
  triggerClassName?: string;
  searchPlaceholder: string;
  emptyLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: (() => void | Promise<void>) | null;
  footerActionLabel: string;
  footerActionHref?: string;
  footerActionIcon?: ReactNode;
  onFooterAction?: () => void;
  onSelectItem: (itemId: string) => void;
  leadingBadgeClassName?: string;
};

export function ProjectFocusSelectorPopover({
  items,
  selectedItemId,
  triggerLabel,
  triggerDescription = null,
  triggerLeadingText,
  triggerVariant = 'default',
  triggerTestId,
  triggerClassName,
  searchPlaceholder,
  emptyLabel,
  loadingLabel = 'Loading projects...',
  loading = false,
  error = null,
  onRetry,
  footerActionLabel,
  footerActionHref,
  footerActionIcon,
  onFooterAction,
  onSelectItem,
  leadingBadgeClassName,
}: ProjectFocusSelectorPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => {
      const searchable = `${item.label} ${item.description ?? ''} ${item.searchText ?? ''}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [items, search]);

  const resolvedTriggerLeadingText = triggerLeadingText ?? triggerLabel[0]?.toUpperCase() ?? '?';

  const footerActionNode = footerActionHref ? (
    <Link
      to={footerActionHref}
      className="inline-flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      onClick={() => setOpen(false)}
    >
      {footerActionIcon}
      <span>{footerActionLabel}</span>
    </Link>
  ) : (
    <button
      type="button"
      className="inline-flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      onClick={() => {
        onFooterAction?.();
        setOpen(false);
      }}
    >
      {footerActionIcon}
      <span>{footerActionLabel}</span>
    </button>
  );

  return (
    <PopoverRoot
      open={open}
      positioning={{ placement: 'bottom-start', offset: { mainAxis: 4 } }}
      onOpenChange={(details) => {
        setOpen(details.open);
        if (!details.open) setSearch('');
      }}
    >
      <PopoverTrigger
        data-testid={triggerTestId}
        className={cn(
          triggerVariant === 'sidebar-row'
            ? 'project-switcher-trigger inline-flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            : 'project-switcher-trigger inline-flex items-center gap-2 rounded-full border border-border bg-transparent px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          triggerClassName,
        )}
      >
        {triggerVariant === 'sidebar-row' ? (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                leadingBadgeClassName ?? 'bg-primary/10 text-primary',
              )}
            >
              {resolvedTriggerLeadingText}
            </span>
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate text-sm font-medium text-foreground">{triggerLabel}</span>
              {triggerDescription ? (
                <span className="truncate pt-0.5 text-xs text-muted-foreground">{triggerDescription}</span>
              ) : null}
            </span>
            <IconChevronDown
              aria-hidden="true"
              size={16}
              stroke={1.75}
              className="ml-auto shrink-0 text-muted-foreground"
            />
          </>
        ) : (
          <>
            <span className="truncate">{triggerLabel}</span>
            <IconChevronDown aria-hidden="true" size={16} stroke={1.75} className="shrink-0 text-muted-foreground" />
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="relative z-[140] w-80 max-w-[calc(100vw-32px)] rounded-md border border-border bg-popover p-0 shadow-md outline-none">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <IconSearch size={14} stroke={1.75} className="shrink-0 text-muted-foreground" />
              <input
                type="text"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { event.stopPropagation(); }}
                autoFocus
              />
              <kbd className="text-xs text-muted-foreground">Esc</kbd>
            </div>

            {error ? (
              <div className="space-y-2 px-3 py-3">
                <p className="text-sm text-destructive">{error}</p>
                {onRetry ? (
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-border px-2 py-1 text-sm font-medium"
                    onClick={() => {
                      void onRetry();
                    }}
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            ) : (
              <ScrollArea className="max-h-64" contentClass="py-1">
                {loading && items.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground">{loadingLabel}</div>
                ) : null}

                {!loading || items.length > 0 ? (
                  <>
                    {filteredItems.map((item) => {
                      const isActive = item.id === selectedItemId;
                      const leadingText = item.leadingText ?? item.label[0]?.toUpperCase() ?? '?';

                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            'flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent text-sm',
                            isActive && 'bg-accent',
                          )}
                          onClick={() => {
                            onSelectItem(item.id);
                            setOpen(false);
                          }}
                        >
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                            {leadingText}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{item.label}</span>
                            {item.description ? (
                              <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}

                    {filteredItems.length === 0 ? (
                      <div className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyLabel}</div>
                    ) : null}
                  </>
                ) : null}
              </ScrollArea>
            )}

            <div className="border-t border-border py-1">
              {footerActionNode}
            </div>
      </PopoverContent>
    </PopoverRoot>
  );
}
