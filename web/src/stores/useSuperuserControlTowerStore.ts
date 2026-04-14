import { create } from 'zustand';

export type SuperuserControlTowerPlane =
  | 'browser-state'
  | 'coordination-state'
  | 'identity-routing'
  | 'policy-hooks'
  | 'repo-time-enforcement';

export type SuperuserControlTowerGroup =
  | 'state-query-health'
  | 'coordination-routing'
  | 'hook-policy-audit';

export type SuperuserControlTowerPanelPreference =
  | 'showPlaneExplainer'
  | 'showQueryDetails'
  | 'showCoordinationTimeline'
  | 'showRepoTimeNotes';

type SuperuserControlTowerStoreSnapshot = {
  selectedPlane: SuperuserControlTowerPlane;
  collapsedGroups: Record<SuperuserControlTowerGroup, boolean>;
  panelPreferences: Record<SuperuserControlTowerPanelPreference, boolean>;
};

type SuperuserControlTowerStoreState = SuperuserControlTowerStoreSnapshot & {
  setSelectedPlane: (plane: SuperuserControlTowerPlane) => void;
  setGroupCollapsed: (group: SuperuserControlTowerGroup, collapsed: boolean) => void;
  toggleGroupCollapsed: (group: SuperuserControlTowerGroup) => void;
  setPanelPreference: (
    preference: SuperuserControlTowerPanelPreference,
    enabled: boolean,
  ) => void;
  reset: () => void;
};

export function getInitialSuperuserControlTowerStoreState(): SuperuserControlTowerStoreSnapshot {
  return {
    selectedPlane: 'browser-state',
    collapsedGroups: {
      'state-query-health': false,
      'coordination-routing': false,
      'hook-policy-audit': false,
    },
    panelPreferences: {
      showPlaneExplainer: true,
      showQueryDetails: true,
      showCoordinationTimeline: true,
      showRepoTimeNotes: true,
    },
  };
}

export const useSuperuserControlTowerStore = create<SuperuserControlTowerStoreState>((set) => ({
  ...getInitialSuperuserControlTowerStoreState(),
  setSelectedPlane: (plane) => {
    set({
      selectedPlane: plane,
    });
  },
  setGroupCollapsed: (group, collapsed) => {
    set((state) => ({
      collapsedGroups: {
        ...state.collapsedGroups,
        [group]: collapsed,
      },
    }));
  },
  toggleGroupCollapsed: (group) => {
    set((state) => ({
      collapsedGroups: {
        ...state.collapsedGroups,
        [group]: !state.collapsedGroups[group],
      },
    }));
  },
  setPanelPreference: (preference, enabled) => {
    set((state) => ({
      panelPreferences: {
        ...state.panelPreferences,
        [preference]: enabled,
      },
    }));
  },
  reset: () => {
    set(getInitialSuperuserControlTowerStoreState());
  },
}));

export function resetSuperuserControlTowerStore() {
  useSuperuserControlTowerStore.getState().reset();
}
