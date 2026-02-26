import type { HTMLAttributes, ReactNode } from 'react';
import { Menu as ArkMenu } from '@ark-ui/react/menu';
import { Portal } from '@ark-ui/react/portal';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MenuRoot = ArkMenu.Root;

function MenuTrigger({
  className,
  children,
  asChild,
  ...props
}: ArkMenu.TriggerProps) {
  const triggerClassName = asChild
    ? className
    : cn(
      'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
      'bg-background text-foreground border border-input',
      'transition-colors hover:bg-accent hover:text-accent-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    );

  return (
    <ArkMenu.Trigger
      className={triggerClassName}
      asChild={asChild}
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
        'ui-menu-content',
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
  leftSection,
  rightSection,
  children,
  ...props
}: ArkMenu.ItemProps & {
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <ArkMenu.Item
      className={cn(
        'ui-menu-item',
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      {leftSection ? <span className="mr-2 inline-flex shrink-0 items-center">{leftSection}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {rightSection ? <span className="ml-2 inline-flex shrink-0 items-center">{rightSection}</span> : null}
    </ArkMenu.Item>
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
      className={cn('ui-menu-separator -mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

function MenuLabel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'ui-menu-label',
        'px-2 py-1.5 text-xs font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

function MenuPortal({ children }: { children: ReactNode }) {
  return <Portal>{children}</Portal>;
}

export {
  MenuRoot,
  MenuTrigger,
  MenuIndicator,
  MenuPositioner,
  MenuPortal,
  MenuContent,
  MenuItem,
  MenuItemGroup,
  MenuItemGroupLabel,
  MenuLabel,
  MenuSeparator,
};
