import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import '@/components/eval-designer/eval-designer-surface.css';
import { AgchainPageFrame } from './AgchainPageFrame';

type AgchainStandardSurfaceProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  bodyClassName?: string;
  className?: string;
  surfaceTestId?: string;
  titleStripTestId?: string;
  bodyTestId?: string;
};

export function AgchainStandardSurface({
  title,
  children,
  action,
  bodyClassName,
  className,
  surfaceTestId = 'agchain-standard-surface',
  titleStripTestId = 'agchain-standard-surface-title-strip',
  bodyTestId = 'agchain-standard-surface-body',
}: AgchainStandardSurfaceProps) {
  return (
    <AgchainPageFrame className="gap-0 px-0 pb-0">
      <div className="min-h-0 flex-1 px-3 pb-3 pt-3">
        <section data-testid={surfaceTestId} className={cn('eval-designer-surface', className)}>
          <div data-testid={titleStripTestId} className="eval-designer-surface__toolbar">
            <div className="eval-designer-surface__identity">
              <div className="eval-designer-surface__title-row">
                <h1 className="eval-designer-surface__title">{title}</h1>
              </div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
          <div
            data-testid={bodyTestId}
            className={cn('min-h-0 flex-1 overflow-auto p-5 sm:p-6', bodyClassName)}
          >
            {children}
          </div>
        </section>
      </div>
    </AgchainPageFrame>
  );
}
