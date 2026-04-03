import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AgchainPageFrameProps = {
  children: ReactNode;
  className?: string;
};

export function AgchainPageFrame({ children, className }: AgchainPageFrameProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div
        data-testid="agchain-page-frame"
        className={cn('flex min-h-0 w-full flex-1 flex-col px-4', className)}
      >
        {children}
      </div>
    </div>
  );
}
