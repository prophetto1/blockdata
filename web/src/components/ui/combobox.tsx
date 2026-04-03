import { Combobox as ArkCombobox, useListCollection } from '@ark-ui/react/combobox';
import { useFilter } from '@ark-ui/react/locale';
import { Portal } from '@ark-ui/react/portal';
import { cn } from '@/lib/utils';

/* ── Re-export helpers for consumer convenience ── */
export { useListCollection, useFilter };

/* ── Root ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComboboxRoot({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Root<any>>) {
  return (
    <ArkCombobox.Root
      className={cn('flex flex-col gap-1.5', className)}
      data-slot="combobox"
      {...props}
    />
  );
}

/* ── Label ── */
function ComboboxLabel({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Label>) {
  return (
    <ArkCombobox.Label
      className={cn('text-sm font-medium text-foreground', className)}
      data-slot="combobox-label"
      {...props}
    />
  );
}

/* ── Control ── */
function ComboboxControl({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Control>) {
  return (
    <ArkCombobox.Control
      className={cn('relative', className)}
      data-slot="combobox-control"
      {...props}
    />
  );
}

/* ── Input ── */
function ComboboxInput({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Input>) {
  return (
    <ArkCombobox.Input
      className={cn(
        'flex h-9 w-full rounded-md border border-[#3a3a3a] bg-transparent px-3 py-1 pr-16 text-sm',
        'text-foreground placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_0_0_1px_var(--primary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="combobox-input"
      {...props}
    />
  );
}

/* ── Trigger (chevron button) ── */
function ComboboxTrigger({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Trigger>) {
  return (
    <ArkCombobox.Trigger
      className={cn(
        'inline-flex items-center justify-center text-muted-foreground hover:text-foreground',
        'border-0 bg-transparent',
        className,
      )}
      data-slot="combobox-trigger"
      {...props}
    />
  );
}

/* ── Clear Trigger ── */
function ComboboxClearTrigger({ className, ...props }: React.ComponentProps<typeof ArkCombobox.ClearTrigger>) {
  return (
    <ArkCombobox.ClearTrigger
      className={cn(
        'inline-flex items-center justify-center text-muted-foreground hover:text-foreground',
        'border-0 bg-transparent',
        className,
      )}
      data-slot="combobox-clear-trigger"
      {...props}
    />
  );
}

/* ── Content (dropdown) ── */
function ComboboxContent({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Content>) {
  return (
    <Portal>
      <ArkCombobox.Positioner>
        <ArkCombobox.Content
          className={cn(
            'z-50 min-w-[var(--reference-width)] overflow-y-auto rounded-md border border-[#3a3a3a] bg-popover p-1 shadow-[0_4px_6px_-1px_rgb(0_0_0/0.2),0_2px_4px_-2px_rgb(0_0_0/0.12)]',
            'max-h-[min(var(--available-height,300px),300px)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
          data-slot="combobox-content"
          {...props}
        />
      </ArkCombobox.Positioner>
    </Portal>
  );
}

/* ── Item ── */
function ComboboxItem({ className, ...props }: React.ComponentProps<typeof ArkCombobox.Item>) {
  return (
    <ArkCombobox.Item
      className={cn(
        'flex cursor-default select-none items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'data-[highlighted]:bg-[#222221]',
        'data-[state=checked]:text-[#f47a5c] data-[state=checked]:font-medium',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      data-slot="combobox-item"
      {...props}
    />
  );
}

/* ── Item Text ── */
function ComboboxItemText({ className, ...props }: React.ComponentProps<typeof ArkCombobox.ItemText>) {
  return (
    <ArkCombobox.ItemText
      className={cn('flex-1 truncate', className)}
      data-slot="combobox-item-text"
      {...props}
    />
  );
}

/* ── Item Indicator ── */
function ComboboxItemIndicator({ className, ...props }: React.ComponentProps<typeof ArkCombobox.ItemIndicator>) {
  return (
    <ArkCombobox.ItemIndicator
      className={cn('shrink-0 text-primary', className)}
      data-slot="combobox-item-indicator"
      {...props}
    />
  );
}

/* ── Item Group ── */
function ComboboxItemGroup({ className, ...props }: React.ComponentProps<typeof ArkCombobox.ItemGroup>) {
  return (
    <ArkCombobox.ItemGroup
      className={cn('flex flex-col', className)}
      data-slot="combobox-item-group"
      {...props}
    />
  );
}

/* ── Item Group Label ── */
function ComboboxItemGroupLabel({ className, ...props }: React.ComponentProps<typeof ArkCombobox.ItemGroupLabel>) {
  return (
    <ArkCombobox.ItemGroupLabel
      className={cn('px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}
      data-slot="combobox-item-group-label"
      {...props}
    />
  );
}

export {
  ComboboxRoot,
  ComboboxLabel,
  ComboboxControl,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxClearTrigger,
  ComboboxContent,
  ComboboxItem,
  ComboboxItemText,
  ComboboxItemIndicator,
  ComboboxItemGroup,
  ComboboxItemGroupLabel,
};