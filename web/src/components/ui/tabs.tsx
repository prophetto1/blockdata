import { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import { type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type TabsProps = Omit<ComponentProps<typeof ArkTabs.Root>, 'onValueChange'> & {
  onValueChange: (value: string) => void;
};

export function Tabs({ value, onValueChange, className, children, ...props }: TabsProps) {
  return (
    <ArkTabs.Root
      value={value}
      onValueChange={(details) =>
        onValueChange(typeof details === 'string' ? details : details.value)
      }
      lazyMount
      unmountOnExit
      className={cn(className)}
      data-slot="tabs"
      {...props}
    >
      {children}
    </ArkTabs.Root>
  );
}

export function TabsList({ className, ...props }: ComponentProps<typeof ArkTabs.List>) {
  return (
    <ArkTabs.List
      data-slot="tabs-list"
      className={cn(
        'relative inline-flex items-center',
        'data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:border-b data-[orientation=horizontal]:border-border',
        'data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-r data-[orientation=vertical]:border-border',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof ArkTabs.Trigger>) {
  return (
    <ArkTabs.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
        'text-muted-foreground transition-colors',
        'hover:text-foreground',
        'data-[selected]:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

export function TabsIndicator({ className, ...props }: ComponentProps<typeof ArkTabs.Indicator>) {
  return (
    <ArkTabs.Indicator
      data-slot="tabs-indicator"
      className={cn(
        // z-[-1] places the indicator behind trigger content — breaks if a trigger gets an opaque bg
        'absolute z-[-1] rounded-sm bg-accent/80',
        'transition-[width,height,left,top] duration-200 ease-out',
        'data-[orientation=horizontal]:h-[2px] data-[orientation=horizontal]:bottom-0',
        'data-[orientation=vertical]:w-[2px] data-[orientation=vertical]:left-0',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof ArkTabs.Content>) {
  return <ArkTabs.Content data-slot="tabs-content" className={cn(className)} {...props} />;
}
