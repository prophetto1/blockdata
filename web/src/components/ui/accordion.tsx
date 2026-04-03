import { Accordion as ArkAccordion } from '@ark-ui/react/accordion';
import { cn } from '@/lib/utils';

function AccordionRoot({ className, ...props }: React.ComponentProps<typeof ArkAccordion.Root>) {
  return (
    <ArkAccordion.Root
      className={cn('flex flex-col', className)}
      data-slot="accordion"
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof ArkAccordion.Item>) {
  return (
    <ArkAccordion.Item
      className={cn('border-b border-border', className)}
      data-slot="accordion-item"
      {...props}
    />
  );
}

function AccordionItemTrigger({ className, ...props }: React.ComponentProps<typeof ArkAccordion.ItemTrigger>) {
  return (
    <ArkAccordion.ItemTrigger
      className={cn(
        'flex w-full items-center justify-between gap-3 bg-transparent border-0 px-0 py-3 text-left text-sm font-semibold text-foreground',
        'hover:text-foreground/80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed',
        className,
      )}
      data-slot="accordion-item-trigger"
      {...props}
    />
  );
}

function AccordionItemContent({ className, ...props }: React.ComponentProps<typeof ArkAccordion.ItemContent>) {
  return (
    <ArkAccordion.ItemContent
      className={cn(
        'overflow-hidden text-sm',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      data-slot="accordion-item-content"
      {...props}
    />
  );
}

function AccordionItemIndicator({ className, ...props }: React.ComponentProps<typeof ArkAccordion.ItemIndicator>) {
  return (
    <ArkAccordion.ItemIndicator
      className={cn(
        'inline-flex items-center justify-center text-muted-foreground transition-transform duration-200',
        'data-[state=open]:rotate-180',
        className,
      )}
      data-slot="accordion-item-indicator"
      {...props}
    />
  );
}

export {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
  AccordionItemIndicator,
};
