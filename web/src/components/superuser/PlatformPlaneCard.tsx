import { Link } from 'react-router-dom';
import type { Icon } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { SuperuserControlTowerPlane } from '@/stores/useSuperuserControlTowerStore';

type PlaneStatusTone = 'healthy' | 'watch' | 'muted' | 'alert';

const STATUS_TONE_CLASSES: Record<PlaneStatusTone, string> = {
  healthy: 'bg-emerald-500/12 text-emerald-700',
  watch: 'bg-amber-500/14 text-amber-700',
  muted: 'bg-stone-200 text-stone-700',
  alert: 'bg-rose-500/12 text-rose-700',
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
          ? 'border-[#eb5e41]/40 bg-white ring-1 ring-[#eb5e41]/18'
          : 'border-stone-300/80 bg-white/96',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(planeId)}
        aria-pressed={selected}
        aria-label={`Focus ${label}`}
        className={cn(
          'flex w-full flex-col items-start gap-3 rounded-lg text-left transition duration-150 active:scale-95',
          selected ? 'text-stone-950' : 'text-stone-900',
        )}
      >
        <div className="flex w-full items-start justify-between gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5eee9] text-[#a5432f]">
            <IconGlyph size={19} stroke={1.7} />
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]',
              STATUS_TONE_CLASSES[statusTone],
            )}
          >
            {status}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            {label}
          </p>
          <h3 className="text-sm font-semibold tracking-tight text-stone-950">{role}</h3>
        </div>

        <div className="w-full rounded-lg border border-stone-200/90 bg-[#faf7f3] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {datumLabel}
          </p>
          <p className="mt-1 text-sm font-medium text-stone-900">{datumValue}</p>
        </div>
      </button>

      <div className="mt-3 border-t border-stone-200/90 pt-3">
        <Link
          to={drillPath}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-[#f3efea] px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-[#eb5e41]/35 hover:text-[#a5432f] active:scale-95"
        >
          {drillLabel}
        </Link>
      </div>
    </article>
  );
}
