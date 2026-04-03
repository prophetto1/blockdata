import { Popover as ArkPopover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import { cn } from '@/lib/utils';

function PopoverRoot(props: React.ComponentProps<typeof ArkPopover.Root>) {
  return <ArkPopover.Root {...props} />;
}

function PopoverTrigger({ className, ...props }: React.ComponentProps<typeof ArkPopover.Trigger>) {
  return (
    <ArkPopover.Trigger
      className={cn(className)}
      data-slot="popover-trigger"
      {...props}
    />
  );
}

function PopoverAnchor({ className, ...props }: React.ComponentProps<typeof ArkPopover.Anchor>) {
  return (
    <ArkPopover.Anchor
      className={cn(className)}
      data-slot="popover-anchor"
      {...props}
    />
  );
}

function PopoverContent({ className, ...props }: React.ComponentProps<typeof ArkPopover.Content>) {
  return (
    <Portal>
      <ArkPopover.Positioner>
        <ArkPopover.Content
          className={cn(
            'z-50 w-80 rounded-md border border-[#3a3a3a] bg-popover p-5 shadow-lg shadow-black/30 outline-none',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
          data-slot="popover-content"
          {...props}
        />
      </ArkPopover.Positioner>
    </Portal>
  );
}

function PopoverArrow({ className, ...props }: React.ComponentProps<typeof ArkPopover.Arrow>) {
  return (
    <ArkPopover.Arrow className={cn(className)} data-slot="popover-arrow" {...props}>
      <ArkPopover.ArrowTip className="border-t border-l border-[#3a3a3a]" />
    </ArkPopover.Arrow>
  );
}

function PopoverCloseTrigger({ className, ...props }: React.ComponentProps<typeof ArkPopover.CloseTrigger>) {
  return (
    <ArkPopover.CloseTrigger
      className={cn(
        'absolute right-1 top-1 inline-flex items-center justify-center rounded p-1',
        'bg-transparent border-0 text-muted-foreground hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        className,
      )}
      data-slot="popover-close-trigger"
      {...props}
    />
  );
}

function PopoverTitle({ className, ...props }: React.ComponentProps<typeof ArkPopover.Title>) {
  return (
    <ArkPopover.Title
      className={cn('text-sm font-semibold text-foreground', className)}
      data-slot="popover-title"
      {...props}
    />
  );
}

function PopoverDescription({ className, ...props }: React.ComponentProps<typeof ArkPopover.Description>) {
  return (
    <ArkPopover.Description
      className={cn('text-sm text-muted-foreground', className)}
      data-slot="popover-description"
      {...props}
    />
  );
}

export {
  PopoverRoot,
  PopoverTrigger,
  PopoverAnchor,
  PopoverContent,
  PopoverArrow,
  PopoverCloseTrigger,
  PopoverTitle,
  PopoverDescription,
};
