import { superuserKeys } from '@/lib/queryKeys/superuserKeys';

export type StateManagementQueryFamilyId =
  | 'operational-readiness-snapshot'
  | 'coordination-status'
  | 'coordination-identities'
  | 'coordination-discussions';

export type StateManagementZustandValueId =
  | 'selectedPlane'
  | 'collapsedGroups'
  | 'panelPreferences';

export type StateManagementSurfaceId =
  | 'control-tower'
  | 'operational-readiness'
  | 'coordination-runtime'
  | 'state-management';

export type StateManagementObservationState = 'observed' | 'not-yet-observed';

export type StateManagementQueryFamilyDefinition = {
  id: StateManagementQueryFamilyId;
  label: string;
  ownerHook: string;
  ownerComponent: string;
  ownerRoute: string;
  queryKeyPrefix: readonly unknown[];
  summary: string;
};

export type StateManagementZustandValueDefinition = {
  id: StateManagementZustandValueId;
  label: string;
  ownerStore: string;
  lifecycle: string;
  summary: string;
};

export type StateManagementVisibilityRule = {
  state: string;
  behavior: string;
};

export type StateManagementActionDefinition = {
  label: string;
  effect: string;
  invalidation:
    | 'none'
    | 'superuser-all'
    | StateManagementQueryFamilyId
    | readonly StateManagementQueryFamilyId[];
};

export type StateManagementSurfaceDefinition = {
  id: StateManagementSurfaceId;
  label: string;
  route: string;
  summary: string;
  inspectorIntro: string;
  queryFamilies: readonly StateManagementQueryFamilyId[];
  zustandValues: readonly StateManagementZustandValueId[];
  vocabularies: readonly string[];
  visibilityRules: readonly StateManagementVisibilityRule[];
  actions: readonly StateManagementActionDefinition[];
  drilldownLabel: string;
};

export const stateManagementQueryFamilies: readonly StateManagementQueryFamilyDefinition[] = [
  {
    id: 'operational-readiness-snapshot',
    label: 'Operational Readiness Snapshot',
    ownerHook: 'useOperationalReadinessSnapshotQuery',
    ownerComponent: 'useOperationalReadiness / SuperuserOperationalReadiness',
    ownerRoute: '/app/superuser/operational-readiness',
    queryKeyPrefix: superuserKeys.operationalReadinessSnapshot(),
    summary: 'Browser-state snapshot that powers readiness drill-down and the homepage pullout.',
  },
  {
    id: 'coordination-status',
    label: 'Coordination Status',
    ownerHook: 'useCoordinationStatusQuery',
    ownerComponent: 'CoordinationRuntimeSurface',
    ownerRoute: '/app/superuser/coordination-runtime',
    queryKeyPrefix: superuserKeys.coordinationStatus(),
    summary: 'Runtime broker, stream bridge, presence, and hook-audit summary.',
  },
  {
    id: 'coordination-identities',
    label: 'Coordination Identities',
    ownerHook: 'useCoordinationIdentitiesQuery',
    ownerComponent: 'CoordinationRuntimeSurface',
    ownerRoute: '/app/superuser/coordination-runtime',
    queryKeyPrefix: ['superuser', 'coordination-identities'],
    summary: 'Active identity inventory plus host and classification summaries.',
  },
  {
    id: 'coordination-discussions',
    label: 'Coordination Discussions',
    ownerHook: 'useCoordinationDiscussionsQuery',
    ownerComponent: 'CoordinationRuntimeSurface',
    ownerRoute: '/app/superuser/coordination-runtime',
    queryKeyPrefix: ['superuser', 'coordination-discussions'],
    summary: 'Discussion threads, pending recipients, and workspace-bound routing.',
  },
] as const;

export const stateManagementZustandValues: readonly StateManagementZustandValueDefinition[] = [
  {
    id: 'selectedPlane',
    label: 'selectedPlane',
    ownerStore: 'useSuperuserControlTowerStore',
    lifecycle: 'UI-only shared state',
    summary: 'Focused Control Tower plane. This should change explanation, not just highlighting.',
  },
  {
    id: 'collapsedGroups',
    label: 'collapsedGroups',
    ownerStore: 'useSuperuserControlTowerStore',
    lifecycle: 'UI-only shared state',
    summary: 'Remembers which Control Tower groups are collapsed or expanded.',
  },
  {
    id: 'panelPreferences',
    label: 'panelPreferences',
    ownerStore: 'useSuperuserControlTowerStore',
    lifecycle: 'UI-only shared state',
    summary: 'Controls whether selected explanatory panels stay visible to the operator.',
  },
] as const;

const sharedVisibilityRules: readonly StateManagementVisibilityRule[] = [
  {
    state: 'loading',
    behavior: 'Keep the scaffold visible and reserve every region with skeleton or placeholder treatments.',
  },
  {
    state: 'refreshing',
    behavior: 'Keep the current content visible and label the refresh instead of collapsing the page.',
  },
  {
    state: 'success',
    behavior: 'Show full ownership and route-level state explanations.',
  },
  {
    state: 'error',
    behavior: 'Confine error treatments to the affected panel while leaving the rest of the scaffold visible.',
  },
  {
    state: 'partial',
    behavior: 'Mix live and missing sections honestly. Do not mask partial instrumentation with fake zero states.',
  },
  {
    state: 'not-yet-observed',
    behavior: 'Say the query family has not been observed in this session yet instead of implying failure.',
  },
] as const;

export const stateManagementSurfaces: readonly StateManagementSurfaceDefinition[] = [
  {
    id: 'control-tower',
    label: 'Control Tower',
    route: '/app/superuser',
    summary: 'Overview page that embeds the browser-state and coordination pullouts.',
    inspectorIntro:
      'The Control Tower homepage is the broad operator overview. It consumes existing server-state families but does not become their long-form owner route.',
    queryFamilies: [
      'operational-readiness-snapshot',
      'coordination-status',
      'coordination-identities',
      'coordination-discussions',
    ],
    zustandValues: ['selectedPlane', 'collapsedGroups', 'panelPreferences'],
    vocabularies: ['readiness', 'query/ui', 'partial instrumentation'],
    visibilityRules: sharedVisibilityRules,
    actions: [
      {
        label: 'Choose plane',
        effect: 'Changes the focused operator explanation and Control Tower emphasis.',
        invalidation: 'none',
      },
    ],
    drilldownLabel: 'Open Control Tower',
  },
  {
    id: 'operational-readiness',
    label: 'Operational Readiness',
    route: '/app/superuser/operational-readiness',
    summary: 'Dedicated browser-state route with refresh and readiness evidence.',
    inspectorIntro:
      'This drill-down owns the readiness route and presents the long-form browser-state evidence. It does not use the Control Tower Zustand slice today.',
    queryFamilies: ['operational-readiness-snapshot'],
    zustandValues: [],
    vocabularies: ['readiness', 'query/ui'],
    visibilityRules: sharedVisibilityRules,
    actions: [
      {
        label: 'Refresh Status',
        effect: 'Refreshes the readiness snapshot and updates the drill-down evidence.',
        invalidation: 'operational-readiness-snapshot',
      },
    ],
    drilldownLabel: 'Open Operational Readiness',
  },
  {
    id: 'coordination-runtime',
    label: 'Coordination Runtime',
    route: '/app/superuser/coordination-runtime',
    summary: 'Dedicated coordination drill-down with status, identity, and discussion ownership.',
    inspectorIntro:
      'This route owns the long-form coordination runtime view. It consumes three TanStack Query families through a shared runtime surface.',
    queryFamilies: ['coordination-status', 'coordination-identities', 'coordination-discussions'],
    zustandValues: [],
    vocabularies: ['query/ui', 'stream state', 'discussion state', 'partial instrumentation'],
    visibilityRules: sharedVisibilityRules,
    actions: [
      {
        label: 'Refresh runtime families',
        effect: 'Refreshes the coordination runtime evidence without changing the page structure.',
        invalidation: ['coordination-status', 'coordination-identities', 'coordination-discussions'],
      },
    ],
    drilldownLabel: 'Open Coordination Runtime',
  },
  {
    id: 'state-management',
    label: 'State Management',
    route: '/app/superuser/zustand-react-query',
    summary: 'Ownership registry that explains where state lives across the superuser area.',
    inspectorIntro:
      'This route is intentionally explanatory. It reads cache and store state thinly so operators can see ownership without replaying neighboring pages.',
    queryFamilies: [],
    zustandValues: ['selectedPlane', 'collapsedGroups', 'panelPreferences'],
    vocabularies: ['query/ui', 'partial instrumentation'],
    visibilityRules: sharedVisibilityRules,
    actions: [
      {
        label: 'Invalidate observed queries',
        effect: 'Invalidates the superuser query family and shows a visible refresh consequence.',
        invalidation: 'superuser-all',
      },
      {
        label: 'Reset Control Tower UI slice',
        effect: 'Resets the shared Zustand slice back to its default UI-only values.',
        invalidation: 'none',
      },
    ],
    drilldownLabel: 'You are here',
  },
] as const;

export function getStateManagementSurface(surfaceId: StateManagementSurfaceId) {
  return stateManagementSurfaces.find((surface) => surface.id === surfaceId) ?? stateManagementSurfaces[0];
}

export function getStateManagementQueryFamily(familyId: StateManagementQueryFamilyId) {
  return stateManagementQueryFamilies.find((family) => family.id === familyId);
}

export function getStateManagementZustandValue(valueId: StateManagementZustandValueId) {
  return stateManagementZustandValues.find((value) => value.id === valueId);
}

export function isStateManagementObservationObserved(
  observation: StateManagementObservationState,
): observation is 'observed' {
  return observation === 'observed';
}
