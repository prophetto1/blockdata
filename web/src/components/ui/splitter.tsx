import { Splitter as ArkSplitter } from '@ark-ui/react/splitter';
import { cn } from '@/lib/utils';

/* ── Root ── */
function SplitterRoot({ className, ...props }: React.ComponentProps<typeof ArkSplitter.Root>) {
  return (
    <ArkSplitter.Root
      className={cn('flex w-full', className)}
      data-slot="splitter"
      {...props}
    />
  );
}

/* ── Panel ── */
function SplitterPanel({ className, ...props }: React.ComponentProps<typeof ArkSplitter.Panel>) {
  return (
    <ArkSplitter.Panel
      className={cn('overflow-auto', className)}
      data-slot="splitter-panel"
      {...props}
    />
  );
}

/* ── Resize Trigger (the draggable bar) ── */
function SplitterResizeTrigger({ className, ...props }: React.ComponentProps<typeof ArkSplitter.ResizeTrigger>) {
  return (
    <ArkSplitter.ResizeTrigger
      className={cn(
        'relative grid place-items-center bg-transparent border-0 p-0 outline-none',
        'data-[orientation=horizontal]:min-w-1.5 data-[orientation=horizontal]:cursor-col-resize data-[orientation=horizontal]:-mx-px',
        'data-[orientation=vertical]:min-h-1.5 data-[orientation=vertical]:cursor-row-resize data-[orientation=vertical]:-my-px',
        'before:absolute before:content-[""]',
        'data-[orientation=horizontal]:before:inset-y-0 data-[orientation=horizontal]:before:w-px data-[orientation=horizontal]:before:left-1/2 data-[orientation=horizontal]:before:bg-[#3a3a3a]',
        'data-[orientation=vertical]:before:inset-x-0 data-[orientation=vertical]:before:h-px data-[orientation=vertical]:before:top-1/2 data-[orientation=vertical]:before:bg-[#3a3a3a]',
        'hover:before:bg-primary focus-visible:before:bg-primary',
        'data-[dragging]:before:bg-primary',
        className,
      )}
      data-slot="splitter-resize-trigger"
      {...props}
    />
  );
}

/* ── Resize Trigger Indicator (optional visible handle) ── */
function SplitterResizeTriggerIndicator({ className, ...props }: React.ComponentProps<typeof ArkSplitter.ResizeTriggerIndicator>) {
  return (
    <ArkSplitter.ResizeTriggerIndicator
      className={cn(
        'relative z-10 rounded-full border border-[#3a3a3a] bg-[#111110] shadow-[0_1px_3px_0_rgb(0_0_0/0.2),0_1px_2px_-1px_rgb(0_0_0/0.15)]',
        'data-[orientation=horizontal]:h-6 data-[orientation=horizontal]:w-1.5',
        'data-[orientation=vertical]:w-6 data-[orientation=vertical]:h-1.5',
        className,
      )}
      data-slot="splitter-resize-trigger-indicator"
      {...props}
    />
  );
}

export {
  SplitterRoot,
  SplitterPanel,
  SplitterResizeTrigger,
  SplitterResizeTriggerIndicator,
};