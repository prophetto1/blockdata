import { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import { type ComponentProps } from 'react';
import { cn } from '@/lib/cn';

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
      className={cn(className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof ArkTabs.Trigger>) {
  return (
    <ArkTabs.Trigger
      data-slot="tabs-trigger"
      className={cn(className)}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof ArkTabs.Content>) {
  return <ArkTabs.Content data-slot="tabs-content" className={cn(className)} {...props} />;
}
