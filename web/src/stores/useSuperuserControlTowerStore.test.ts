import { beforeEach, describe, expect, it } from 'vitest';
import {
  getInitialSuperuserControlTowerStoreState,
  resetSuperuserControlTowerStore,
  useSuperuserControlTowerStore,
} from './useSuperuserControlTowerStore';

describe('useSuperuserControlTowerStore', () => {
  beforeEach(() => {
    resetSuperuserControlTowerStore();
  });

  it('tracks only local ui state and resets to the initial snapshot', () => {
    const initialState = getInitialSuperuserControlTowerStoreState();
    const store = useSuperuserControlTowerStore.getState();

    store.setSelectedPlane('policy-hooks');
    store.setGroupCollapsed('coordination-routing', true);
    store.setPanelPreference('showRepoTimeNotes', false);

    expect(useSuperuserControlTowerStore.getState().selectedPlane).toBe('policy-hooks');
    expect(useSuperuserControlTowerStore.getState().collapsedGroups['coordination-routing']).toBe(true);
    expect(useSuperuserControlTowerStore.getState().panelPreferences.showRepoTimeNotes).toBe(false);

    resetSuperuserControlTowerStore();

    expect(useSuperuserControlTowerStore.getState().selectedPlane).toBe(initialState.selectedPlane);
    expect(useSuperuserControlTowerStore.getState().collapsedGroups).toEqual(initialState.collapsedGroups);
    expect(useSuperuserControlTowerStore.getState().panelPreferences).toEqual(initialState.panelPreferences);
  });

  it('does not mirror server payloads into the store contract', () => {
    const state = useSuperuserControlTowerStore.getState() as Record<string, unknown>;

    expect(state).not.toHaveProperty('readinessSnapshot');
    expect(state).not.toHaveProperty('coordinationStatus');
    expect(state).not.toHaveProperty('coordinationIdentities');
    expect(state).not.toHaveProperty('coordinationDiscussions');
  });
});
