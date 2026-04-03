import type { AgchainOrganizationRow } from '@/lib/agchainWorkspaces';
import {
  useAgchainProjectFocus,
  type AgchainFocusedProjectRow,
} from '@/hooks/agchain/useAgchainProjectFocus';
import { useAgchainWorkspaceContext } from '@/hooks/agchain/useAgchainWorkspaceContext';

export type AgchainScopeRequirement = 'none' | 'organization' | 'project';

export type AgchainScopeState =
  | { kind: 'bootstrapping' }
  | { kind: 'error'; reload: () => Promise<void> }
  | { kind: 'no-organization' }
  | {
      kind: 'no-project';
      selectedOrganization: AgchainOrganizationRow;
    }
  | {
      kind: 'ready';
      selectedOrganization: AgchainOrganizationRow;
      focusedProject: AgchainFocusedProjectRow;
    };

function toNoProject(selectedOrganization: AgchainOrganizationRow): AgchainScopeState {
  return {
    kind: 'no-project',
    selectedOrganization,
  };
}

function toReady(
  selectedOrganization: AgchainOrganizationRow,
  focusedProject: AgchainFocusedProjectRow,
): AgchainScopeState {
  return {
    kind: 'ready',
    selectedOrganization,
    focusedProject,
  };
}

export function useAgchainScopeState(requirement: AgchainScopeRequirement): AgchainScopeState {
  const { status, focusedProject, reload } = useAgchainProjectFocus();
  const { selectedOrganization } = useAgchainWorkspaceContext();

  if (status === 'bootstrapping') {
    return { kind: 'bootstrapping' };
  }

  if (status === 'error') {
    return { kind: 'error', reload };
  }

  if (status === 'no-organization' || !selectedOrganization) {
    return { kind: 'no-organization' };
  }

  if (status === 'ready' && focusedProject) {
    return toReady(selectedOrganization, focusedProject);
  }

  if (requirement === 'project') {
    return toNoProject(selectedOrganization);
  }

  return toNoProject(selectedOrganization);
}
