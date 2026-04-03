import * as React from 'react';
import { Portal } from '@ark-ui/react/portal';
import { Tooltip as ArkTooltip } from '@ark-ui/react/tooltip';

import { cn } from '@/lib/utils';

const TooltipDelayContext = React.createContext<number>(0);

type TooltipProviderProps = {
  children: React.ReactNode;
  delayDuration?: number;
};

const TooltipProvider = ({ children, delayDuration = 0 }: TooltipProviderProps) => (
  <TooltipDelayContext.Provider value={delayDuration}>
    {children}
  </TooltipDelayContext.Provider>
);

const Tooltip = (props: React.ComponentProps<typeof ArkTooltip.Root>) => {
  const defaultDelay = React.useContext(TooltipDelayContext);
  return (
    <ArkTooltip.Root
      openDelay={props.openDelay ?? defaultDelay}
      closeDelay={props.closeDelay ?? 0}
      {...props}
    />
  );
};

const TooltipTrigger = ArkTooltip.Trigger;

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ArkTooltip.Content> & {
    hidden?: boolean;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
  }
>(({ className, hidden, side: _side, align: _align, sideOffset: _sideOffset, ...props }, ref) => {
  void _side;
  void _align;
  void _sideOffset;
  if (hidden) return null;
  return (
    <Portal>
      <ArkTooltip.Positioner>
        <ArkTooltip.Content
          ref={ref}
          className={cn(
            'z-50 overflow-hidden rounded-md border border-[#3a3a3a] bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-[0_4px_6px_-1px_rgb(0_0_0/0.2),0_2px_4px_-2px_rgb(0_0_0/0.12)]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            className,
          )}
          {...props}
        />
      </ArkTooltip.Positioner>
    </Portal>
  );
});
TooltipContent.displayName = ArkTooltip.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
