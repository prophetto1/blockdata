import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';
import { cn } from '@/lib/utils';

function CollapsibleRoot({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Root>) {
  return (
    <ArkCollapsible.Root
      className={cn('rounded-md border border-border bg-background', className)}
      {...props}
    />
  );
}

function CollapsibleTrigger({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Trigger>) {
  return (
    <ArkCollapsible.Trigger
      className={cn(
        'flex w-full items-center justify-between px-3 py-2 text-sm font-bold text-foreground hover:bg-accent/30',
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleIndicator({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Indicator>) {
  return (
    <ArkCollapsible.Indicator
      className={cn(
        'text-xs text-muted-foreground transition-transform',
        'data-[state=open]:rotate-90',
        className,
      )}
      {...props}
    />
  );
}

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Content>) {
  return (
    <ArkCollapsible.Content
      className={cn('border-t border-border px-3 py-2 space-y-1', className)}
      {...props}
    />
  );
}

export { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent };
