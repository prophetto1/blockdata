import { Menu as ArkMenu } from '@ark-ui/react/menu';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MenuRoot = ArkMenu.Root;

function MenuTrigger({
  className,
  children,
  ...props
}: ArkMenu.TriggerProps) {
  return (
    <ArkMenu.Trigger
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
        'bg-background text-foreground border border-input',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </ArkMenu.Trigger>
  );
}

function MenuIndicator({
  className,
  ...props
}: ArkMenu.IndicatorProps) {
  return (
    <ArkMenu.Indicator
      className={cn(
        'transition-transform duration-150 data-[state=open]:rotate-180',
        className,
      )}
      {...props}
    >
      <ChevronDownIcon className="h-4 w-4" />
    </ArkMenu.Indicator>
  );
}

function MenuPositioner({
  className,
  style,
  ...props
}: ArkMenu.PositionerProps) {
  return (
    <ArkMenu.Positioner
      className={cn('z-50', className)}
      style={{ ...style, zIndex: 50 }}
      {...props}
    />
  );
}

function MenuContent({
  className,
  ...props
}: ArkMenu.ContentProps) {
  return (
    <ArkMenu.Content
      className={cn(
        'min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className,
      )}
      {...props}
    />
  );
}

function MenuItem({
  className,
  ...props
}: ArkMenu.ItemProps) {
  return (
    <ArkMenu.Item
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

function MenuItemGroup({
  className,
  ...props
}: ArkMenu.ItemGroupProps) {
  return (
    <ArkMenu.ItemGroup className={cn('p-1', className)} {...props} />
  );
}

function MenuItemGroupLabel({
  className,
  ...props
}: ArkMenu.ItemGroupLabelProps) {
  return (
    <ArkMenu.ItemGroupLabel
      className={cn(
        'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function MenuSeparator({
  className,
  ...props
}: ArkMenu.SeparatorProps) {
  return (
    <ArkMenu.Separator
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

export {
  MenuRoot,
  MenuTrigger,
  MenuIndicator,
  MenuPositioner,
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuItemGroupLabel,
  MenuSeparator,
};
