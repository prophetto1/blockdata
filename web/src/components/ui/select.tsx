import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select';
import { Portal } from '@ark-ui/react/portal';
import { cn } from '@/lib/utils';

/* ── Re-export collection helper for consumer convenience ── */
export { createListCollection };

/* ── Root ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SelectRoot({ className, ...props }: React.ComponentProps<typeof ArkSelect.Root<any>>) {
  return (
    <ArkSelect.Root
      className={cn('flex flex-col gap-1.5', className)}
      data-slot="select"
      {...props}
    />
  );
}

/* ── Label ── */
function SelectLabel({ className, ...props }: React.ComponentProps<typeof ArkSelect.Label>) {
  return (
    <ArkSelect.Label
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="select-label"
      {...props}
    />
  );
}

/* ── Control ── */
function SelectControl({ className, ...props }: React.ComponentProps<typeof ArkSelect.Control>) {
  return (
    <ArkSelect.Control
      className={cn('relative flex w-full items-center', className)}
      data-slot="select-control"
      {...props}
    />
  );
}

/* ── Trigger ── */
function SelectTrigger({ className, ...props }: React.ComponentProps<typeof ArkSelect.Trigger>) {
  return (
    <ArkSelect.Trigger
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md border border-border bg-transparent px-3 py-2 text-sm',
        'text-foreground placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[placeholder-shown]:text-muted-foreground',
        className,
      )}
      data-slot="select-trigger"
      {...props}
    />
  );
}

/* ── Value Text ── */
function SelectValueText({ className, ...props }: React.ComponentProps<typeof ArkSelect.ValueText>) {
  return (
    <ArkSelect.ValueText
      className={cn('truncate', className)}
      data-slot="select-value-text"
      {...props}
    />
  );
}

/* ── Indicator (chevron) ── */
function SelectIndicator({ className, ...props }: React.ComponentProps<typeof ArkSelect.Indicator>) {
  return (
    <ArkSelect.Indicator
      className={cn('shrink-0 text-muted-foreground', className)}
      data-slot="select-indicator"
      {...props}
    />
  );
}

/* ── Clear Trigger ── */
function SelectClearTrigger({ className, ...props }: React.ComponentProps<typeof ArkSelect.ClearTrigger>) {
  return (
    <ArkSelect.ClearTrigger
      className={cn(
        'inline-flex items-center justify-center text-muted-foreground hover:text-foreground',
        className,
      )}
      data-slot="select-clear-trigger"
      {...props}
    />
  );
}

/* ── Content (dropdown) ── */
function SelectContent({ className, ...props }: React.ComponentProps<typeof ArkSelect.Content>) {
  return (
    <Portal>
      <ArkSelect.Positioner>
        <ArkSelect.Content
          className={cn(
            'z-50 min-w-[var(--reference-width)] overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md',
            'max-h-[min(var(--available-height,300px),300px)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
          data-slot="select-content"
          {...props}
        />
      </ArkSelect.Positioner>
    </Portal>
  );
}

/* ── Item ── */
function SelectItem({ className, ...props }: React.ComponentProps<typeof ArkSelect.Item>) {
  return (
    <ArkSelect.Item
      className={cn(
        'flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[state=checked]:text-foreground data-[state=checked]:font-medium',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      data-slot="select-item"
      {...props}
    />
  );
}

/* ── Item Text ── */
function SelectItemText({ className, ...props }: React.ComponentProps<typeof ArkSelect.ItemText>) {
  return (
    <ArkSelect.ItemText
      className={cn('flex-1 truncate', className)}
      data-slot="select-item-text"
      {...props}
    />
  );
}

/* ── Item Indicator (check mark) ── */
function SelectItemIndicator({ className, ...props }: React.ComponentProps<typeof ArkSelect.ItemIndicator>) {
  return (
    <ArkSelect.ItemIndicator
      className={cn('shrink-0 text-primary', className)}
      data-slot="select-item-indicator"
      {...props}
    />
  );
}

/* ── Item Group ── */
function SelectItemGroup({ className, ...props }: React.ComponentProps<typeof ArkSelect.ItemGroup>) {
  return (
    <ArkSelect.ItemGroup
      className={cn('flex flex-col', className)}
      data-slot="select-item-group"
      {...props}
    />
  );
}

/* ── Item Group Label ── */
function SelectItemGroupLabel({ className, ...props }: React.ComponentProps<typeof ArkSelect.ItemGroupLabel>) {
  return (
    <ArkSelect.ItemGroupLabel
      className={cn('px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
      data-slot="select-item-group-label"
      {...props}
    />
  );
}

/* ── Hidden Select (for form submission) ── */
function SelectHiddenSelect(props: React.ComponentProps<typeof ArkSelect.HiddenSelect>) {
  return <ArkSelect.HiddenSelect {...props} />;
}

export {
  SelectRoot,
  SelectLabel,
  SelectControl,
  SelectTrigger,
  SelectValueText,
  SelectIndicator,
  SelectClearTrigger,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectItemGroup,
  SelectItemGroupLabel,
  SelectHiddenSelect,
};