import { ScrollArea } from '@ark-ui/react/scroll-area';
import type { ReactNode } from 'react';
import '../styles/scroll-area.css';

interface ScrollWrapperProps {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
}

export default function ScrollWrapper({ children, className, viewportClassName }: ScrollWrapperProps) {
  return (
    <ScrollArea.Root className={`scroll-area-root${className ? ` ${className}` : ''}`}>
      <ScrollArea.Viewport className={`scroll-area-viewport${viewportClassName ? ` ${viewportClassName}` : ''}`}>
        <ScrollArea.Content>{children}</ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="scroll-area-scrollbar">
        <ScrollArea.Thumb className="scroll-area-thumb" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
