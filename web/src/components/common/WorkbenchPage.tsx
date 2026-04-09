import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type WorkbenchPageProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function WorkbenchPage({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: WorkbenchPageProps) {
  return (
    <main className={cn('flex h-full min-h-0 flex-col bg-background text-foreground', className)}>
      <header className="border-b border-border/70 bg-background/95 px-3 py-3 md:px-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-1">
            {eyebrow ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
            {description ? <div className="max-w-4xl text-xs leading-5 text-muted-foreground">{description}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <div className={cn('flex min-h-0 flex-1 flex-col gap-3 p-3 md:p-4', contentClassName)}>{children}</div>
    </main>
  );
}
