import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AgchainEmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
};

export function AgchainEmptyState({
  title,
  description,
  action,
  eyebrow,
  className,
}: AgchainEmptyStateProps) {
  return (
    <section className={cn('rounded-3xl border border-border/70 bg-card/70 p-8 shadow-sm', className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
