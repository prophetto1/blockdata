import type { PlaneFacet, PlaneFacetTone } from '@/components/superuser/PlatformPlaneCardV2';

export type CoordinationRuntimeCardState = {
  tone: PlaneFacetTone;
  facets: PlaneFacet[];
};

export const DEFAULT_COORDINATION_RUNTIME_CARD_STATE: CoordinationRuntimeCardState = {
  tone: 'muted',
  facets: [
    { label: 'Connection', tone: 'muted', value: 'open runtime' },
    { label: 'Events', tone: 'muted', value: 'live feed there' },
    { label: 'Latest', tone: 'muted', value: 'lazy loaded' },
  ],
};
