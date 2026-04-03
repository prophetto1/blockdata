import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';
import { cn } from '@/lib/utils';

function CollapsibleRoot({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Root>) {
  return (
    <ArkCollapsible.Root
      className={cn('rounded-md border border-[#3a3a3a] bg-transparent', className)}
      {...props}
    />
  );
}

function CollapsibleTrigger({ className, ...props }: React.ComponentProps<typeof ArkCollapsible.Trigger>) {
  return (
    <ArkCollapsible.Trigger
      className={cn(
        'flex w-full items-center justify-between px-3 py-2 text-sm font-bold text-foreground hover:bg-white/5',
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
      className={cn('border-t border-[#3a3a3a] px-3 py-2 space-y-1', className)}
      {...props}
    />
  );
}

export { CollapsibleRoot, CollapsibleTrigger, CollapsibleIndicator, CollapsibleContent };
