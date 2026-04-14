import { useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

type SurfaceTone = 'healthy' | 'watch' | 'alert' | 'muted';

export interface CollapsibleSurfaceWorstChild {
  label: string;
  hint?: string;
  tone: 'watch' | 'alert';
}

export interface CollapsibleSurfaceProps {
  title: string;
  summary: string;
  tone: SurfaceTone;
  worstChild?: CollapsibleSurfaceWorstChild | null;
  defaultOpen?: boolean;
  children: ReactNode;
}

const TONE_DOT: Record<SurfaceTone, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  alert: 'bg-rose-500',
  muted: 'bg-muted-foreground/40',
};

const TONE_TEXT: Record<'watch' | 'alert', string> = {
  watch: 'text-amber-600 dark:text-amber-400',
  alert: 'text-rose-500 dark:text-rose-400',
};

export function CollapsibleSurface(props: CollapsibleSurfaceProps) {
  const { title, summary, tone, worstChild, defaultOpen = false, children } = props;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      data-testid={`collapsible-surface-${title.toLowerCase()}`}
      data-open={open ? 'true' : 'false'}
      className="rounded-xl border border-border/60 bg-card/50"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-2.5 text-left',
          'hover:bg-muted/40',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'rounded-xl',
        )}
      >
        {open ? (
          <IconChevronDown size={14} stroke={2} className="text-muted-foreground" />
        ) : (
          <IconChevronRight size={14} stroke={2} className="text-muted-foreground" />
        )}
        <span className={cn('h-2 w-2 shrink-0 rounded-full', TONE_DOT[tone])} aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">({summary})</span>
        {worstChild && !open ? (
          <span className={cn('ml-auto truncate text-xs', TONE_TEXT[worstChild.tone])}>
            {worstChild.label}
            {worstChild.hint ? (
              <span className="ml-1 text-muted-foreground">{worstChild.hint}</span>
            ) : null}
          </span>
        ) : null}
      </button>
      {open ? <div className="px-1 pb-1">{children}</div> : null}
    </section>
  );
}
