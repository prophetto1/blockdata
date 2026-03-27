import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AgchainPageFrameProps = {
  children: ReactNode;
  className?: string;
};

export function AgchainPageFrame({ children, className }: AgchainPageFrameProps) {
  return (
    <div className="min-h-full bg-background">
      <div
        data-testid="agchain-page-frame"
        className={cn('flex w-full flex-col px-4', className)}
      >
        {children}
      </div>
    </div>
  );
}
