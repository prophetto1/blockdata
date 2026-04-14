import { Link } from 'react-router-dom';
import type { Icon } from '@tabler/icons-react';
import {
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_STATES,
} from '@/lib/toolbar-contract';
import { cn } from '@/lib/utils';
import type { SuperuserControlTowerPlane } from '@/stores/useSuperuserControlTowerStore';

type PlaneStatusTone = 'healthy' | 'watch' | 'muted' | 'alert';

const STATUS_DOT_CLASSES: Record<PlaneStatusTone, string> = {
  healthy: 'bg-emerald-500',
  watch: 'bg-amber-500',
  muted: 'bg-muted-foreground/50',
  alert: 'bg-rose-500',
};

type PlatformPlaneCardProps = {
  planeId: SuperuserControlTowerPlane;
  label: string;
  role: string;
  status: string;
  statusTone: PlaneStatusTone;
  datumLabel: string;
  datumValue: string;
  drillLabel: string;
  drillPath: string;
  icon: Icon;
  selected: boolean;
  onSelect: (planeId: SuperuserControlTowerPlane) => void;
};

export function PlatformPlaneCard({
  planeId,
  label,
  role,
  status,
  statusTone,
  datumLabel,
  datumValue,
  drillLabel,
  drillPath,
  icon: IconGlyph,
  selected,
  onSelect,
}: PlatformPlaneCardProps) {
  return (
    <article
      className={cn(
        'min-w-[220px] rounded-xl border p-3 shadow-sm transition-colors',
        selected
          ? 'border-primary/35 bg-card ring-1 ring-primary/15'
          : 'border-border/70 bg-card/85',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(planeId)}
        aria-pressed={selected}
        aria-label={`Focus ${label}`}
        className={cn(
          'flex w-full flex-col items-start gap-3 rounded-lg text-left transition duration-150 active:scale-95',
          'text-foreground',
        )}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <IconGlyph size={19} stroke={1.7} />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[statusTone])}
            />
            <span className="font-mono tracking-normal normal-case text-foreground">{status}</span>
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {label}
          </p>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{role}</h3>
        </div>

        <div className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {datumLabel}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">{datumValue}</p>
        </div>
      </button>

      <div className="mt-3 border-t border-border/60 pt-3">
        <Link
          to={drillPath}
          className={cn(TOOLBAR_BUTTON_BASE, TOOLBAR_BUTTON_STATES.inactive)}
        >
          <span>{drillLabel}</span>
        </Link>
      </div>
    </article>
  );
}
