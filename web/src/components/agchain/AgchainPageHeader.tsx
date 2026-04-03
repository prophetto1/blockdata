import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AgchainPageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function AgchainPageHeader({
  title,
  description,
  eyebrow,
  meta,
  action,
  className,
}: AgchainPageHeaderProps) {
  return (
    <section className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <div className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</div>
        ) : null}
        {meta ? (
          <div className="mt-2 text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
