import type { Icon } from '@tabler/icons-react';
import { PlatformPlaneCard } from '@/components/superuser/PlatformPlaneCard';
import type { SuperuserControlTowerPlane } from '@/stores/useSuperuserControlTowerStore';

export type PlatformPlaneDescriptor = {
  planeId: SuperuserControlTowerPlane;
  label: string;
  role: string;
  status: string;
  statusTone: 'healthy' | 'watch' | 'muted' | 'alert';
  datumLabel: string;
  datumValue: string;
  drillLabel: string;
  drillPath: string;
  icon: Icon;
};

type PlatformPlanesStripProps = {
  planes: PlatformPlaneDescriptor[];
  selectedPlane: SuperuserControlTowerPlane;
  onSelectPlane: (planeId: SuperuserControlTowerPlane) => void;
  connectionLabels: string[];
};

export function PlatformPlanesStrip({
  planes,
  selectedPlane,
  onSelectPlane,
  connectionLabels,
}: PlatformPlanesStripProps) {
  return (
    <section className="rounded-[20px] border border-stone-300/90 bg-[#f0eeeb] p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            Five Connected Planes
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-stone-950">
            The control line from browser state to repo-time enforcement
          </h2>
        </div>
        <p className="max-w-2xl text-xs leading-5 text-stone-600">
          Every plane stays visible, even when instrumentation is partial, so the operator learns the platform in the same order every visit.
        </p>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-stretch xl:gap-2">
        {planes.map((plane, index) => (
          <div key={plane.planeId} className="contents">
            <div className="xl:min-w-0 xl:flex-1">
              <PlatformPlaneCard
                {...plane}
                selected={selectedPlane === plane.planeId}
                onSelect={onSelectPlane}
              />
            </div>

            {index < connectionLabels.length ? (
              <div className="hidden min-w-[88px] xl:flex xl:flex-col xl:items-center xl:justify-center">
                <div className="h-px w-full bg-[#d8d1ca]" />
                <span className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {connectionLabels[index]}
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
