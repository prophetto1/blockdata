import { ScrollArea as ArkScrollArea } from '@ark-ui/react/scroll-area';
import { type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import './scroll-area.css';

/* ------------------------------------------------------------------ */
/*  Compound parts – thin wrappers for Ark UI ScrollArea               */
/* ------------------------------------------------------------------ */

export function ScrollAreaRoot({ className, ...props }: ComponentProps<typeof ArkScrollArea.Root>) {
  return (
    <ArkScrollArea.Root
      data-slot="scroll-area"
      className={cn('scroll-area-root', className)}
      {...props}
    />
  );
}

export function ScrollAreaViewport({
  className,
  ...props
}: ComponentProps<typeof ArkScrollArea.Viewport>) {
  return (
    <ArkScrollArea.Viewport
      data-slot="scroll-area-viewport"
      className={cn('scroll-area-viewport', className)}
      {...props}
    />
  );
}

export function ScrollAreaContent({
  className,
  ...props
}: ComponentProps<typeof ArkScrollArea.Content>) {
  return <ArkScrollArea.Content className={cn(className)} {...props} />;
}

export function ScrollAreaScrollbar({
  className,
  ...props
}: ComponentProps<typeof ArkScrollArea.Scrollbar>) {
  return (
    <ArkScrollArea.Scrollbar
      data-slot="scroll-area-scrollbar"
      className={cn('scroll-area-scrollbar', className)}
      {...props}
    />
  );
}

export function ScrollAreaThumb({
  className,
  ...props
}: ComponentProps<typeof ArkScrollArea.Thumb>) {
  return (
    <ArkScrollArea.Thumb
      data-slot="scroll-area-thumb"
      className={cn('scroll-area-thumb', className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Convenience wrapper – vertical-only scroll area (most common case) */
/* ------------------------------------------------------------------ */

interface ScrollAreaProps extends ComponentProps<typeof ArkScrollArea.Root> {
  children: ReactNode;
  /** Extra class on the viewport (the scrollable element) */
  viewportClass?: string;
}

/**
 * Pre-assembled vertical scroll area with styled thin scrollbar.
 * Use this for the common case — wrap your content and done.
 *
 * For horizontal or bidirectional scrolling, compose the parts directly.
 */
export function ScrollArea({ children, className, viewportClass, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaRoot className={className} {...props}>
      <ScrollAreaViewport className={viewportClass}>
        <ScrollAreaContent>{children}</ScrollAreaContent>
      </ScrollAreaViewport>
      <ScrollAreaScrollbar orientation="vertical">
        <ScrollAreaThumb />
      </ScrollAreaScrollbar>
    </ScrollAreaRoot>
  );
}
