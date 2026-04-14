import { Link } from 'react-router-dom';
import type { Icon } from '@tabler/icons-react';
import {
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_STATES,
} from '@/lib/toolbar-contract';
import { cn } from '@/lib/utils';

export type PlaneFacetTone = 'healthy' | 'watch' | 'muted' | 'alert';

const FACET_DOT_CLASSES: Record<PlaneFacetTone, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  muted: 'bg-muted-foreground/50',
  alert: 'bg-rose-500',
};

export type PlaneFacet = {
  label: string;
  tone: PlaneFacetTone;
  value: string;
};

type PlatformPlaneCardV2Props = {
  label: string;
  role: string;
  tone: PlaneFacetTone;
  icon: Icon;
  facets: PlaneFacet[];
  drillLabel: string;
  drillPath: string;
};

export function PlatformPlaneCardV2({
  label,
  role,
  tone,
  icon: IconGlyph,
  facets,
  drillLabel,
  drillPath,
}: PlatformPlaneCardV2Props) {
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <IconGlyph size={16} stroke={1.8} />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', FACET_DOT_CLASSES[tone])}
            />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </p>
          </div>
          <p className="text-xs leading-tight text-muted-foreground">{role}</p>
        </div>
      </div>

      <dl className="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/20 p-2">
        {facets.map((facet) => (
          <div key={facet.label} className="flex items-baseline gap-2">
            <dt className="w-20 shrink-0 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {facet.label}
            </dt>
            <span
              aria-hidden="true"
              className={cn('size-1.5 shrink-0 translate-y-[1px] rounded-full', FACET_DOT_CLASSES[facet.tone])}
            />
            <dd className="min-w-0 flex-1 truncate font-mono text-[11px] leading-tight text-foreground">
              {facet.value}
            </dd>
          </div>
        ))}
      </dl>

      <Link
        to={drillPath}
        className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive, 'self-start')}
      >
        <span>{drillLabel}</span>
      </Link>
    </article>
  );
}
