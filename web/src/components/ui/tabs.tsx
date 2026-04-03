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
        'relative inline-flex items-center isolate gap-1',
        'data-[orientation=horizontal]:flex-row',
        'data-[orientation=vertical]:flex-col',
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
        'inline-flex items-center justify-center gap-2 rounded-md px-3 h-8 text-sm font-medium',
        'bg-transparent border-none text-muted-foreground whitespace-nowrap select-none',
        'hover:text-foreground',
        'data-[selected]:bg-[#55221e] data-[selected]:text-[#f47a5c]',
        'focus-visible:outline-2 focus-visible:outline-[#e2503f] focus-visible:outline-offset-2',
        'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
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
        'absolute z-[-1] bg-[#55221e] rounded-md',
        'transition-[width,height,left,top] duration-200 ease-out',
        'data-[orientation=horizontal]:h-8',
        'data-[orientation=vertical]:w-[calc(100%-0.5rem)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof ArkTabs.Content>) {
  return <ArkTabs.Content data-slot="tabs-content" className={cn(className)} {...props} />;
}
